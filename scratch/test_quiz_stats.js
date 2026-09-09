const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const QuizDailyStats = require('../quiz-stats.js');

function memoryStorage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), data };
}
const today = () => new Date(2026, 8, 9, 12, 0, 0);
function answer(stats, overrides = {}) {
  return stats.recordAnswer({ quizId: 'quiz-1', nodeId: 'a', traitType: 'blood_type',
    totalPeople: 3, isCorrect: true, ...overrides });
}

test('partial quizzes count immediately; repeated submissions preserve the first answer', () => {
  const stats = new QuizDailyStats({ storage: memoryStorage(), now: today });
  answer(stats);
  answer(stats, { isCorrect: false });
  answer(stats, { nodeId: 'b', isCorrect: false });
  const result = stats.getTodaySummary();
  assert.deepEqual(result.overall, { answered: 2, correct: 1, incorrect: 1, accuracy: 50, completed: 0 });
  assert.deepEqual(result.byTrait.blood_type, result.overall);
  assert.equal(result.byTrait.color_blindness.answered, 0);
});

test('records survive reloading and each quiz completion counts exactly once', () => {
  const storage = memoryStorage();
  const first = new QuizDailyStats({ storage, now: today });
  answer(first);
  const second = new QuizDailyStats({ storage, now: today });
  answer(second, { nodeId: 'b' });
  answer(second, { nodeId: 'c', isCorrect: false });
  answer(second, { nodeId: 'c' });
  assert.deepEqual(second.getTodaySummary().overall,
    { answered: 3, correct: 2, incorrect: 1, accuracy: 66.7, completed: 1 });
  assert.equal(first.getTodaySummary().overall.answered, 3, 'refresh records written by another instance');
});

test('local midnight separates answers and attributes completion to the finishing day', () => {
  let now = new Date(2026, 8, 9, 23, 59, 59);
  const stats = new QuizDailyStats({ storage: memoryStorage(), now: () => now });
  answer(stats, { totalPeople: 2 });
  now = new Date(2026, 8, 10, 0, 0, 1);
  assert.equal(stats.getTodaySummary().overall.answered, 0);
  answer(stats, { nodeId: 'b', totalPeople: 2, isCorrect: false });
  answer(stats, { totalPeople: 2 }); // yesterday's answer must not count again today
  assert.deepEqual(stats.getTodaySummary().overall,
    { answered: 1, correct: 0, incorrect: 1, accuracy: 0, completed: 1 });
  assert.equal(stats.getTodaySummary().date, '2026-09-10');
});

test('type totals stay separate and unanswered days have no percentage', () => {
  const stats = new QuizDailyStats({ storage: memoryStorage(), now: today });
  assert.equal(stats.getTodaySummary().overall.accuracy, null);
  for (const [i, traitType] of ['double_eyelid', 'blood_type', 'color_blindness'].entries()) {
    answer(stats, { quizId: `quiz-${i}`, totalPeople: 1, traitType, isCorrect: i !== 1 });
  }
  const result = stats.getTodaySummary();
  assert.deepEqual(result.overall, { answered: 3, correct: 2, incorrect: 1, accuracy: 66.7, completed: 3 });
  assert.equal(result.byTrait.blood_type.accuracy, 0);
  assert.equal(result.byTrait.color_blindness.accuracy, 100);
});

test('corrupt or unavailable storage cannot interrupt quiz recording', () => {
  const broken = { getItem() { return '{broken'; }, setItem() { throw new Error('quota'); } };
  const stats = new QuizDailyStats({ storage: broken, now: today });
  answer(stats);
  assert.equal(stats.getTodaySummary().overall.answered, 1);
  assert.equal(stats.getTodaySummary().persistent, false);
  answer(stats, { nodeId: 'b' });
  assert.equal(stats.getTodaySummary().overall.answered, 2);
  const blocked = new QuizDailyStats({ storage: { getItem() { throw new Error('blocked'); } }, now: today });
  answer(blocked);
  assert.equal(blocked.getTodaySummary().overall.answered, 1);
});

test('quiz engine records actual graded submissions, not generation or display', () => {
  const storage = memoryStorage();
  const context = vm.createContext({
    window: { localStorage: storage, innerWidth: 1024, addEventListener() {} },
    document: { getElementById() { return null; }, querySelectorAll() { return []; }, addEventListener() {} },
    setTimeout() {}
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'quiz-stats.js'), 'utf8') + '\n' +
    fs.readFileSync(path.join(__dirname, '..', 'quiz.js'), 'utf8') + '\nthis.Engine = GeneticsQuizEngine;', context);
  const engine = new context.Engine();
  assert.equal(engine.dailyStats.getTodaySummary().overall.answered, 0);
  const fixture = { traitType: 'blood_type', nodes: [{ id: 'a' }, { id: 'b' }], validAnswers: { a: ['AO'], b: ['OO'] } };
  engine.currentQuiz = fixture;
  engine.userAnswers.a = 'AO';
  engine.checkIndividualAnswer('a');
  engine.checkIndividualAnswer('a');
  assert.equal(engine.dailyStats.getTodaySummary().overall.answered, 1);
  engine.userAnswers.b = 'AB';
  engine.checkIndividualAnswer('b');
  assert.equal(engine.dailyStats.getTodaySummary().overall.completed, 1);
  assert.equal(engine.dailyStats.getTodaySummary().overall.incorrect, 1);
  engine.showCompletionModal();
  assert.equal(engine.dailyStats.getTodaySummary().overall.completed, 1);
  engine.generateNewQuiz();
  engine.currentQuiz = fixture;
  engine.userAnswers.a = 'AO';
  engine.checkIndividualAnswer('a');
  assert.equal(engine.dailyStats.getTodaySummary().overall.answered, 3, 'a new quiz can reuse person IDs');
});
