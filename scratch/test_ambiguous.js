const fs = require('fs');

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
console.assert(engine.isAnswerCorrect('?', valids1) === true, 'Test 1 Failed: ? should be correct for [EE, Ee]');
console.assert(engine.isAnswerCorrect('EE', valids1) === true, 'Test 2 Failed: EE should be correct for [EE, Ee]');
console.assert(engine.isAnswerCorrect('Ee', valids1) === true, 'Test 3 Failed: Ee should be correct for [EE, Ee]');
console.assert(engine.isAnswerCorrect('EE/Ee', valids1) === false, 'Test 4 Failed: EE/Ee should be excluded (false)');
console.assert(engine.isAnswerCorrect('ee', valids1) === false, 'Test 5 Failed: ee should be incorrect for [EE, Ee]');

// Test Case 2: Certain double eyelid (['ee'])
const valids2 = ['ee'];
console.assert(engine.isAnswerCorrect('ee', valids2) === true, 'Test 6 Failed: ee should be correct for [ee]');
console.assert(engine.isAnswerCorrect('?', valids2) === false, 'Test 7 Failed: ? should be incorrect when genotype is uniquely determined [ee]');
console.assert(engine.isAnswerCorrect('EE', valids2) === false, 'Test 8 Failed: EE should be incorrect for [ee]');

// Test Case 3: Ambiguous blood type (['AA', 'AO'])
const valids3 = ['AA', 'AO'];
console.assert(engine.isAnswerCorrect('?', valids3) === true, 'Test 9 Failed: ? should be correct for [AA, AO]');
console.assert(engine.isAnswerCorrect('AO', valids3) === true, 'Test 10 Failed: AO should be correct for [AA, AO]');

// Test Case 4: Ambiguous color blindness female (['XX', "XX'"])
const valids4 = ['XX', "XX'"];
console.assert(engine.isAnswerCorrect('?', valids4) === true, 'Test 11 Failed: ? should be correct for [XX, XX\']');
console.assert(engine.isAnswerCorrect("X'X'", valids4) === false, 'Test 12 Failed: X\'X\' should be incorrect for [XX, XX\']');

console.log('✅ ALL TEST CASES PASSED SUCCESSFULLY!');
