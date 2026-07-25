const fs = require('fs');
let content = fs.readFileSync('src/data/navigation.ts', 'utf8');

content = content.replace(
  /\{ id: 'documents', name: 'Registrasi Perizinan', icon: FileLock \},/,
  `{ id: 'documents', name: 'Registrasi Perizinan', icon: FileLock },
      { id: 'regulatory_watch', name: 'Pemantau Regulasi', icon: BookOpen },`
);

content = content.replace(
  /FileLock,/,
  `FileLock,\n  BookOpen,`
);

fs.writeFileSync('src/data/navigation.ts', content);
