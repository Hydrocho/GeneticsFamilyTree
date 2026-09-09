const fs = require('fs');
const assert = require('node:assert/strict');

global.window = {
  innerWidth: 1024,
  innerHeight: 768,
  addEventListener: () => {}
};
global.document = {
  getElementById: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {}
};

let quizJs = fs.readFileSync('quiz.js', 'utf8');
quizJs += '\n global.GeneticsQuizEngine = GeneticsQuizEngine;\n';
eval(quizJs);

const engine = new GeneticsQuizEngine();

console.log('--- Testing isAnswerCorrect logic ---');

// Test Case 1: Ambiguous double eyelid (['EE', 'Ee'])
const valids1 = ['EE', 'Ee'];
assert.ok(engine.isAnswerCorrect('?', valids1) === true, 'Test 1 Failed: ? should be correct for [EE, Ee]');
assert.ok(engine.isAnswerCorrect('EE', valids1) === false, 'Test 2 Failed: EE must not be accepted when ambiguous');
assert.ok(engine.isAnswerCorrect('Ee', valids1) === false, 'Test 3 Failed: Ee must not be accepted when ambiguous');
assert.ok(engine.isAnswerCorrect('EE/Ee', valids1) === false, 'Test 4 Failed: EE/Ee should be excluded (false)');
assert.ok(engine.isAnswerCorrect('ee', valids1) === false, 'Test 5 Failed: ee should be incorrect for [EE, Ee]');

// Test Case 2: Certain double eyelid (['ee'])
const valids2 = ['ee'];
assert.ok(engine.isAnswerCorrect('ee', valids2) === true, 'Test 6 Failed: ee should be correct for [ee]');
assert.ok(engine.isAnswerCorrect('?', valids2) === false, 'Test 7 Failed: ? should be incorrect when genotype is uniquely determined [ee]');
assert.ok(engine.isAnswerCorrect('EE', valids2) === false, 'Test 8 Failed: EE should be incorrect for [ee]');

// Test Case 3: Ambiguous blood type (['AA', 'AO'])
const valids3 = ['AA', 'AO'];
assert.ok(engine.isAnswerCorrect('?', valids3) === true, 'Test 9 Failed: ? should be correct for [AA, AO]');
assert.ok(engine.isAnswerCorrect('AO', valids3) === false, 'Test 10 Failed: AO must not be accepted when ambiguous');

// Test Case 4: Ambiguous color blindness female (['XX', "XX'"])
const valids4 = ['XX', "XX'"];
assert.ok(engine.isAnswerCorrect('?', valids4) === true, 'Test 11 Failed: ? should be correct for [XX, XX\']');
assert.ok(engine.isAnswerCorrect("X'X'", valids4) === false, 'Test 12 Failed: X\'X\' should be incorrect for [XX, XX\']');

console.log('✅ ALL TEST CASES PASSED SUCCESSFULLY!');
