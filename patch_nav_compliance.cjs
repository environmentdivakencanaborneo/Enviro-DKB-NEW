const fs = require('fs');
let content = fs.readFileSync('src/data/navigation.ts', 'utf8');

content = content.replace(
  /\{ id: 'documents', name: 'Dokumen & Perizinan', icon: FileLock \},/,
  `{ id: 'documents', name: 'Registrasi Perizinan', icon: FileLock },
      { id: 'compliance_matrix', name: 'Matriks RKL-RPL', icon: CheckSquare },`
);

content = content.replace(
  /AlertOctagon,/,
  `AlertOctagon,
  CheckSquare,`
);

fs.writeFileSync('src/data/navigation.ts', content);
