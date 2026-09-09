// Independent exhaustive pedigree solver; run with: node scratch/audit_all_quizzes.js
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
let seed = 20260909;
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
const context = vm.createContext({
  Math: Object.assign(Object.create(Math), { random }),
  document: { addEventListener() {} }
});
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'quiz.js'), 'utf8') +
  '\nthis.Engine = GeneticsQuizEngine;', context);
const engine = Object.create(context.Engine.prototype);

function domains(node, trait) {
  if (trait === 'blood_type') return {
    'A형': ['AA', 'AO'], 'B형': ['BB', 'BO'], 'AB형': ['AB'], 'O형': ['OO']
  }[node._bloodType];
  const affected = node.phenotypeId === 'trait-gray';
  if (trait === 'double_eyelid') return affected ? ['ee'] : ['EE', 'Ee'];
  if (node.gender === 'male') return affected ? ["X'Y"] : ['XY'];
  return affected ? ["X'X'"] : ['XX', "XX'"];
}

function triplesFor(quiz) {
  const index = Object.fromEntries(quiz.nodes.map((n, i) => [n.id, i]));
  return quiz.connections.filter(c => c.type === 'child').flatMap(c => {
    const s = quiz.connections.find(s => s.id === c.spouseConnId);
    return c.childrenIds.map(id => [index[s.spouse1Id], index[s.spouse2Id], index[id]]);
  });
}

function inherits(p, q, child, triple, quiz) {
  if (quiz.traitType !== 'color_blindness') {
    return [...p].some(a => [...q].some(b => [a, b].sort().join('') === child));
  }
  // Encode normal/affected X as N/c to keep this independent of production parsing.
  const alleles = { XY: ['N', 'Y'], "X'Y": ['c', 'Y'], XX: ['N', 'N'],
    "XX'": ['N', 'c'], "X'X'": ['c', 'c'] };
  const fatherFirst = quiz.nodes[triple[0]].gender === 'male';
  const father = alleles[fatherFirst ? p : q];
  const mother = alleles[fatherFirst ? q : p];
  const paternal = quiz.nodes[triple[2]].gender === 'male' ? 'Y' : father[0];
  return mother.some(m => [paternal, m].sort().join('') === [...alleles[child]].sort().join(''));
}

function solve(quiz, triples) {
  const candidates = quiz.nodes.map(n => domains(n, quiz.traitType));
  const chosen = [];
  const supported = quiz.nodes.map(() => new Set());
  let solutions = 0;
  function visit(i) {
    if (i === quiz.nodes.length) {
      solutions++;
      chosen.forEach((g, j) => supported[j].add(g));
      return;
    }
    for (const g of candidates[i]) {
      chosen[i] = g;
      if (triples.every(t => t.some(j => j > i) || inherits(chosen[t[0]], chosen[t[1]], chosen[t[2]], t, quiz))) visit(i + 1);
    }
  }
  visit(0);
  return { solutions, answers: supported.map(s => [...s].sort()) };
}

const report = { seed: 20260909, perTrait: {}, examples: [] };
for (const [trait, method] of [
  ['double_eyelid', 'generateDoubleEyelidQuiz'],
  ['blood_type', 'generateBloodTypeQuiz'],
  ['color_blindness', 'generateColorBlindnessQuiz']
]) {
  const stats = { quizzes: 0, people: 0, impossiblePedigrees: 0, invalidGeneratedGenotypes: 0,
    wrongAnswerSets: 0, quizzesWithWrongAnswers: 0, gradingMismatches: 0, patternCounts: {}, causes: {} };
  const patterns = engine.getPedigreePatterns();
  for (const pattern of patterns) {
    engine.getPedigreePatterns = () => [pattern];
    stats.patternCounts[pattern.id] = 0;
    for (let k = 0; k < 2500; k++) {
      const quiz = engine[method]();
      const triples = triplesFor(quiz);
      const expected = solve(quiz, triples);
      stats.quizzes++;
      stats.patternCounts[pattern.id]++;
      if (!expected.solutions) stats.impossiblePedigrees++;
      const actualGenotypes = quiz.nodes.map(n => n._trueGenotype);
      if (!quiz.nodes.every((n, i) => domains(n, trait).includes(actualGenotypes[i])) ||
          !triples.every(t => inherits(actualGenotypes[t[0]], actualGenotypes[t[1]], actualGenotypes[t[2]], t, quiz))) {
        stats.invalidGeneratedGenotypes++;
      }
      let badQuiz = false;
      quiz.nodes.forEach((n, i) => {
        stats.people++;
        const got = [...quiz.validAnswers[n.id]].sort();
        const want = expected.answers[i];
        if (JSON.stringify(got) !== JSON.stringify(want)) {
          stats.wrongAnswerSets++;
          badQuiz = true;
          const affectedMother = triples.some(t => t[2] === i && t.slice(0, 2).some(p =>
            quiz.nodes[p].gender === 'female' && quiz.nodes[p].phenotypeId === 'trait-gray'));
          const affectedDaughter = triples.some(t => t.slice(0, 2).includes(i) &&
            quiz.nodes[t[2]].gender === 'female' && quiz.nodes[t[2]].phenotypeId === 'trait-gray');
          const cause = affectedMother ? 'affected_mother' : affectedDaughter ? 'affected_daughter' : 'multi_generation_constraint';
          stats.causes[cause] = (stats.causes[cause] || 0) + 1;
          if (!report.examples.some(e => e.trait === trait && e.cause === cause)) {
            report.examples.push({ trait, cause, pattern: pattern.id, iteration: k, person: n.id,
              expected: want, actual: got, nodes: quiz.nodes, connections: quiz.connections });
          }
        }
        for (const input of engine.getGenotypeCandidates(trait, n.gender)) {
          const shouldPass = want.length === 1 ? input === want[0] : want.length > 1 && input === '?';
          if (engine.isAnswerCorrect(input, quiz.validAnswers[n.id]) !== shouldPass) stats.gradingMismatches++;
        }
      });
      if (badQuiz) stats.quizzesWithWrongAnswers++;
    }
  }
  delete engine.getPedigreePatterns;
  report.perTrait[trait] = stats;
  console.log(trait, JSON.stringify(stats));
}
fs.writeFileSync(path.join(__dirname, 'quiz-audit-results.json'), JSON.stringify(report, null, 2));
if (Object.values(report.perTrait).some(s => s.wrongAnswerSets || s.impossiblePedigrees || s.invalidGeneratedGenotypes || s.gradingMismatches)) process.exitCode = 1;
