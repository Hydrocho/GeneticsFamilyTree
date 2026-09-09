const fs = require('fs');

function constraintSolver(nodes, connections) {
  const validMap = {};

  nodes.forEach(n => {
    const blood = n._bloodType;
    if (blood === 'O형') {
      validMap[n.id] = ['OO'];
    } else if (blood === 'AB형') {
      validMap[n.id] = ['AB'];
    } else if (blood === 'A형') {
      validMap[n.id] = ['AA', 'AO'];
    } else if (blood === 'B형') {
      validMap[n.id] = ['BB', 'BO'];
    } else {
      validMap[n.id] = ['AA', 'AO', 'BB', 'BO', 'AB', 'OO'];
    }
  });

  const canProduce = (g1, g2, gC) => {
    const a1List = g1.split('');
    const a2List = g2.split('');
    for (const a1 of a1List) {
      for (const a2 of a2List) {
        const pair = [a1, a2].sort();
        let offspringGt = pair.join('');
        if (pair.includes('O') && pair[0] === 'O' && pair[1] !== 'O') {
          offspringGt = pair[1] + 'O';
        }
        if (offspringGt === gC) return true;
      }
    }
    return false;
  };

  const families = [];
  const childConns = connections.filter(c => c.type === 'child');
  childConns.forEach(cc => {
    const sc = connections.find(c => c.id === cc.spouseConnId);
    if (sc && cc.childrenIds && cc.childrenIds.length > 0) {
      families.push({
        p1Id: sc.spouse1Id,
        p2Id: sc.spouse2Id,
        childrenIds: cc.childrenIds
      });
    }
  });

  let changed = true;
  let iteration = 0;
  while (changed && iteration < 10) {
    changed = false;
    iteration++;

    families.forEach(fam => {
      const p1Id = fam.p1Id;
      const p2Id = fam.p2Id;
      const childrenIds = fam.childrenIds;

      const g1Set = validMap[p1Id] || [];
      const g2Set = validMap[p2Id] || [];

      // 1. Filter child genotypes
      childrenIds.forEach(chId => {
        const gCSet = validMap[chId] || [];
        const newGCSet = gCSet.filter(gC => {
          return g1Set.some(g1 => g2Set.some(g2 => canProduce(g1, g2, gC)));
        });
        if (newGCSet.length !== gCSet.length) {
          validMap[chId] = newGCSet;
          changed = true;
        }
      });

      // Updated gC sets after filtering
      const currentChildrenSets = childrenIds.map(chId => validMap[chId] || []);

      // 2. Filter p1 genotypes
      const newG1Set = g1Set.filter(g1 => {
        return currentChildrenSets.every(gCSet => {
          return gCSet.some(gC => g2Set.some(g2 => canProduce(g1, g2, gC)));
        });
      });
      if (newG1Set.length !== g1Set.length) {
        validMap[p1Id] = newG1Set;
        changed = true;
      }

      // 3. Filter p2 genotypes
      const updatedG1Set = validMap[p1Id] || [];
      const newG2Set = g2Set.filter(g2 => {
        return currentChildrenSets.every(gCSet => {
          return gCSet.some(gC => updatedG1Set.some(g1 => canProduce(g1, g2, gC)));
        });
      });
      if (newG2Set.length !== g2Set.length) {
        validMap[p2Id] = newG2Set;
        changed = true;
      }
    });
  }

  return validMap;
}

console.log('--- Test Scenario 3-Generation ---');
const nodes3G = [
  { id: 'gp1', _bloodType: 'A형' },
  { id: 'gp2', _bloodType: 'B형' },
  { id: 'p1', _bloodType: 'B형' },
  { id: 'p2', _bloodType: 'O형' },
  { id: 'gc1', _bloodType: 'O형' }
];
const conn3G = [
  { id: 's1', type: 'spouse', spouse1Id: 'gp1', spouse2Id: 'gp2' },
  { id: 'cc1', type: 'child', spouseConnId: 's1', childrenIds: ['p1'] },
  { id: 's2', type: 'spouse', spouse1Id: 'p1', spouse2Id: 'p2' },
  { id: 'cc2', type: 'child', spouseConnId: 's2', childrenIds: ['gc1'] }
];
console.log(constraintSolver(nodes3G, conn3G));
