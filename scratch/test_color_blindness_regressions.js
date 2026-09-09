const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({ document: { addEventListener() {} } });
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'quiz.js'), 'utf8') +
  '\nthis.Engine = GeneticsQuizEngine;', context);
const engine = Object.create(context.Engine.prototype);
const person = (id, gender, affected = false) => ({ id, gender,
  phenotypeId: affected ? 'trait-gray' : 'trait-white' });
const family = (id, father, mother, children) => [
  { id, type: 'spouse', spouse1Id: father, spouse2Id: mother },
  { id: id + '-children', type: 'child', spouseConnId: id, childrenIds: children }
];

test('normal mother of an affected daughter must be a carrier', () => {
  const nodes = [person('father', 'male', true), person('mother', 'female'), person('daughter', 'female', true)];
  const answers = engine.deduceColorBlindnessValidGenotypes(nodes, family('s', 'father', 'mother', ['daughter']));
  assert.deepEqual([...answers.mother], ["XX'"]);
  assert.equal(engine.isAnswerCorrect("XX'", answers.mother), true);
  assert.equal(engine.isAnswerCorrect('?', answers.mother), false);
});

test('normal daughter of an affected mother must be a carrier', () => {
  const nodes = [person('father', 'male'), person('mother', 'female', true), person('daughter', 'female')];
  const answers = engine.deduceColorBlindnessValidGenotypes(nodes, family('s', 'father', 'mother', ['daughter']));
  assert.deepEqual([...answers.daughter], ["XX'"]);
});

test('affected grandson constrains maternal grandmother when grandfather is normal', () => {
  const nodes = [person('grandfather', 'male'), person('grandmother', 'female'),
    person('daughter', 'female'), person('spouse', 'male'), person('grandson', 'male', true)];
  const connections = [...family('s1', 'grandfather', 'grandmother', ['daughter']),
    ...family('s2', 'spouse', 'daughter', ['grandson'])];
  const answers = engine.deduceColorBlindnessValidGenotypes(nodes, connections);
  assert.deepEqual([...answers.daughter], ["XX'"]);
  assert.deepEqual([...answers.grandmother], ["XX'"]);
});

test('inference does not depend on node order, spouse order or hidden genotypes', () => {
  const nodes = [person('daughter', 'female'), person('mother', 'female', true), person('father', 'male')];
  nodes.forEach(n => { n._trueGenotype = 'not a clue'; });
  const connections = family('s', 'mother', 'father', ['daughter']).reverse();
  const answers = engine.deduceColorBlindnessValidGenotypes(nodes, connections);
  assert.deepEqual([...answers.daughter], ["XX'"]);
});

test('normal mother and daughter remain ambiguous without evidence of an affected allele', () => {
  const nodes = [person('father', 'male'), person('mother', 'female'), person('daughter', 'female')];
  const answers = engine.deduceColorBlindnessValidGenotypes(nodes, family('s', 'father', 'mother', ['daughter']));
  for (const id of ['mother', 'daughter']) {
    assert.deepEqual([...answers[id]], ['XX', "XX'"]);
    assert.equal(engine.isAnswerCorrect('?', answers[id]), true);
    assert.equal(engine.isAnswerCorrect('XX', answers[id]), false);
    assert.equal(engine.isAnswerCorrect("XX'", answers[id]), false);
  }
});

test('incompatible family evidence yields no valid full-pedigree assignments', () => {
  const nodes = [person('father', 'male'), person('mother', 'female'), person('daughter', 'female', true)];
  const answers = engine.deduceColorBlindnessValidGenotypes(nodes, family('s', 'father', 'mother', ['daughter']));
  assert.ok(Object.values(answers).every(values => values.length === 0));
});
