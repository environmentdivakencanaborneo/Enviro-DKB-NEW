const fs = require('fs');
let content = fs.readFileSync('src/data/navigation.ts', 'utf8');

content = content.replace(
  /Award,\n  LucideIcon\n\} from 'lucide-react';/,
  `Award,
  AlertOctagon,
  LucideIcon
} from 'lucide-react';`
);

content = content.replace(
  /\{ id: 'documents', name: 'Dokumen & Perizinan', icon: FileLock \},/,
  `{ id: 'documents', name: 'Dokumen & Perizinan', icon: FileLock },
      { id: 'findings', name: 'Temuan & CAPA', icon: AlertOctagon },`
);

content = content.replace(/export const VALID_TABS = APP_TABS\.map\(t => t\.id\);/, `export const VALID_TABS = APP_TABS.map(t => t.id);`); // NO-OP but ensures

fs.writeFileSync('src/data/navigation.ts', content);
