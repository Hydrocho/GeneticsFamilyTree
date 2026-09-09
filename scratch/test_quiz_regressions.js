const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup() {
  const elements = [];
  const element = () => {
    const handlers = {};
    const el = {
      innerHTML: '', value: '', children: [],
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      appendChild(child) { this.children.push(child); },
      querySelectorAll() { return []; },
      addEventListener(name, fn) { (handlers[name] ||= []).push(fn); },
      fire(name, extra = {}) {
        for (const fn of [...(handlers[name] || [])]) fn({ target: this, preventDefault() {}, ...extra });
      }
    };
    elements.push(el);
    return el;
  };
  const context = vm.createContext({
    window: { innerWidth: 1024 },
    document: {
      addEventListener() {}, querySelectorAll() { return []; },
      getElementById(id) { return elements.find(el => el.id === id) || null; },
      createElement: element
    }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'quiz.js'), 'utf8') +
    '\nthis.Engine = GeneticsQuizEngine;', context);
  const engine = Object.create(context.Engine.prototype);
  engine.initUIElements();
  engine.userAnswers = {};
  return { engine, element, elements };
}

test('ABO answers accept case, allele order and whitespace consistently', () => {
  const { engine } = setup();
  for (const [expected, forms] of [
    ['AA', ['aa', 'Aa']], ['AO', ['ao', 'aO', 'oA', 'OA', ' A o ']],
    ['BB', ['bb', 'Bb']], ['BO', ['bo', 'bO', 'ob', 'OB']],
    ['AB', ['ab', 'bA', 'BA']], ['OO', ['oo', 'Oo', 'oO']]
  ]) {
    for (const form of forms) assert.equal(engine.isAnswerCorrect(form, [expected]), true, form);
  }
  assert.equal(engine.isAnswerCorrect('알 수 없음', ['AA', 'AO']), true);
  assert.equal(engine.isAnswerCorrect('알 수 없음', ['AO']), false);
  assert.equal(engine.isAnswerCorrect('A0', ['AO']), false);
  assert.equal(engine.isAnswerCorrect('EE', ['Ee']), false);
  assert.equal(engine.isAnswerCorrect('ee', ['Ee']), false);
});

test('opening explanations after generating another quiz shows the current answers', () => {
  const { engine, element } = setup();
  engine.quizExplanationBox = element();
  engine.currentQuiz = {
    traitType: 'blood_type', nodes: [{ id: 'old', label: 'OLD', _bloodType: 'A형' }],
    validAnswers: { old: ['AA'] }
  };
  engine.toggleExplanations();
  assert.match(engine.quizExplanationBox.innerHTML, /OLD/);
  engine.selectedTrait = 'blood_type';
  engine.generateNewQuiz();
  engine.toggleExplanations();
  assert.doesNotMatch(engine.quizExplanationBox.innerHTML, /OLD/);
  assert.match(engine.quizExplanationBox.innerHTML, /\(가\)/);
});

test('switching from typed input to a preset or clear does not submit unfinished text', () => {
  const { engine, element } = setup();
  engine.currentQuiz = {
    traitType: 'color_blindness',
    nodes: [{ id: 'p', gender: 'male' }, { id: 'q', gender: 'male' }],
    validAnswers: { p: ["X'Y"], q: ['XY'] }
  };
  const input = element();
  engine.bindGenotypeInputSubmission(input, 'p');
  input.value = "X'";
  input.fire('change'); // Browsers emit change before blur and button click.
  assert.equal(engine.individualResults.p, undefined);
  input.fire('blur', { relatedTarget: { closest() { return {}; } } });
  assert.equal(engine.individualResults.p, undefined);
  input.value = "X'Y";
  input.fire('blur', { relatedTarget: null });
  assert.equal(engine.individualResults.p.isCorrect, true);
});

for (const surface of ['card', 'grid']) {
  for (const submission of ['enter', 'blur']) {
    test(`ABO ${surface} waits for ${submission} before grading typed answers`, () => {
      const { engine, element, elements } = setup();
      engine.selectedTrait = 'blood_type';
      engine.currentQuiz = {
        traitType: 'blood_type', nodes: [
          { id: 'p', label: '(가)', gender: 'male', _bloodType: 'A형' },
          { id: 'q', label: '(나)', gender: 'female', _bloodType: 'O형' }
        ], validAnswers: { p: ['AA', 'AO'], q: ['OO'] }
      };
      engine.selectedPersonId = 'p';
      if (surface === 'card') {
        engine.selectedCardContainer = element();
        const input = element();
        input.id = 'selected-person-input';
        engine.renderSelectedPersonCard();
      } else {
        engine.quizInputContainer = element();
        engine.renderInputForm();
      }
      const input = elements.find(el => el.id === (surface === 'card' ? 'selected-person-input' : 'quiz-input-p'));
      for (const value of ['알', '알 수', '알 수 없음']) {
        input.value = value;
        input.fire('input');
        assert.equal(engine.individualResults.p, undefined, 'must not lock a partial answer');
      }
      if (submission === 'enter') {
        input.fire('keydown', { key: 'Enter', isComposing: true });
        assert.equal(engine.individualResults.p, undefined, 'IME confirmation is not submission');
        input.fire('keydown', { key: 'Enter', isComposing: false });
      } else input.fire('blur');
      assert.equal(engine.individualResults.p.isCorrect, true);
    });
  }
}

for (const surface of ['card', 'grid']) {
  for (const submission of ['enter', 'blur']) {
    for (const [answer, gender, candidates] of [
      ["X'Y", 'male', ["X'Y"]],
      ["XX'", 'female', ["XX'"]],
      ["X'X'", 'female', ["X'X'"]],
      ['알 수 없음', 'female', ['XX', "XX'"]]
    ]) {
      test(`color blindness ${surface}: finish ${answer} before ${submission} grading`, () => {
        const { engine, element, elements } = setup();
        engine.selectedTrait = 'color_blindness';
        engine.currentQuiz = {
          traitType: 'color_blindness', nodes: [
            { id: 'p', label: '(가)', gender, phenotypeId: answer === "X'Y" || answer === "X'X'" ? 'trait-gray' : 'trait-white' },
            { id: 'q', label: '(나)', gender: 'male', phenotypeId: 'trait-white' }
          ], validAnswers: { p: candidates, q: ['XY'] }
        };
        engine.selectedPersonId = 'p';
        if (surface === 'card') {
          engine.selectedCardContainer = element();
          const input = element();
          input.id = 'selected-person-input';
          engine.renderSelectedPersonCard();
        } else {
          engine.quizInputContainer = element();
          engine.renderInputForm();
        }
        const input = elements.find(el => el.id === (surface === 'card' ? 'selected-person-input' : 'quiz-input-p'));
        for (let i = 1; i <= answer.length; i++) {
          input.value = answer.slice(0, i);
          input.fire('input');
          assert.equal(engine.individualResults.p, undefined, 'typing must not submit or lock the answer');
        }
        input.fire('keydown', { key: 'Enter', isComposing: true });
        assert.equal(engine.individualResults.p, undefined);
        input.fire(submission === 'enter' ? 'keydown' : 'blur', { key: 'Enter', isComposing: false });
        assert.equal(engine.individualResults.p.isCorrect, true);
        assert.equal(engine.individualResults.p.userVal, answer);
      });
    }
  }
}
