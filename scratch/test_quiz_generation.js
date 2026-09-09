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
global.GeneticsQuizEngine = null;
eval(quizJs + '\n global.GeneticsQuizEngine = GeneticsQuizEngine;\n');

const engine = new GeneticsQuizEngine();

console.log('=== Running 100 Blood Type Quiz Generations ===');

let totalQuizzes = 0;
let invalidCount = 0;

for (let i = 0; i < 100; i++) {
  const quiz = engine.generateBloodTypeQuiz();
  totalQuizzes++;

  // Verify that for all nodes, validAnswers is not empty and trueGenotype is contained in validAnswers
  quiz.nodes.forEach(n => {
    const valids = quiz.validAnswers[n.id];
    if (!valids || valids.length === 0) {
      console.error(`Quiz ${i} Node ${n.id} has no valid answers!`);
      invalidCount++;
    } else if (!valids.includes(n._trueGenotype)) {
      console.error(`Quiz ${i} Node ${n.id} true genotype ${n._trueGenotype} not in valids: [${valids.join(', ')}]`);
      invalidCount++;
    }
  });

  // Specifically check for A형 + B형 parents case
  quiz.connections.filter(c => c.type === 'child').forEach(cc => {
    const sc = quiz.connections.find(c => c.id === cc.spouseConnId);
    if (sc) {
      const p1 = quiz.nodes.find(p => p.id === sc.spouse1Id);
      const p2 = quiz.nodes.find(p => p.id === sc.spouse2Id);
      const children = quiz.nodes.filter(ch => cc.childrenIds.includes(ch.id));

      if (p1 && p2 && ((p1._bloodType === 'A형' && p2._bloodType === 'B형') || (p1._bloodType === 'B형' && p2._bloodType === 'A형'))) {
        children.forEach(ch => {
          if (ch._bloodType === 'B형') {
            const valids = quiz.validAnswers[ch.id];
            if (valids.includes('BB')) {
              console.error(`[FAIL] Parent ${p1._bloodType} & ${p2._bloodType}, Child B형 has BB in valid answers: [${valids.join(', ')}]`);
              invalidCount++;
            } else {
              // Should be ['BO']
              if (valids.length !== 1 || valids[0] !== 'BO') {
                console.error(`[FAIL] Parent ${p1._bloodType} & ${p2._bloodType}, Child B형 valids should be ['BO'], got: [${valids.join(', ')}]`);
                invalidCount++;
              }
            }
          } else if (ch._bloodType === 'A형') {
            const valids = quiz.validAnswers[ch.id];
            if (valids.includes('AA')) {
              console.error(`[FAIL] Parent ${p1._bloodType} & ${p2._bloodType}, Child A형 has AA in valid answers: [${valids.join(', ')}]`);
              invalidCount++;
            } else {
              // Should be ['AO']
              if (valids.length !== 1 || valids[0] !== 'AO') {
                console.error(`[FAIL] Parent ${p1._bloodType} & ${p2._bloodType}, Child A형 valids should be ['AO'], got: [${valids.join(', ')}]`);
                invalidCount++;
              }
            }
          }
        });
      }
    }
  });
}

if (invalidCount === 0) {
  console.log(`✅ ALL 100 ABO BLOOD TYPE QUIZZES GENERATED & VERIFIED SUCCESSFULLY WITH 0 ERRORS!`);
} else {
  console.error(`❌ FOUND ${invalidCount} ERRORS IN QUIZ GENERATION!`);
  process.exitCode = 1;
}
