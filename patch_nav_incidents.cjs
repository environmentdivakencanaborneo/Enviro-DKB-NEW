const fs = require('fs');
let content = fs.readFileSync('src/data/navigation.ts', 'utf8');

content = content.replace(
  /\{ id: 'compliance_matrix', name: 'Matriks RKL-RPL', icon: CheckSquare \},/,
  `{ id: 'compliance_matrix', name: 'Matriks RKL-RPL', icon: CheckSquare },
      { id: 'incidents', name: 'Insiden & Kedaruratan', icon: Flame },`
);

content = content.replace(
  /CheckSquare,/,
  `CheckSquare,
  Flame,`
);

fs.writeFileSync('src/data/navigation.ts', content);
