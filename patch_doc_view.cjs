const fs = require('fs');
let content = fs.readFileSync('src/components/DocumentsView.tsx', 'utf8');

content = content.replace(
  /Link as LinkIcon\n\} from 'lucide-react';/,
  `Link as LinkIcon,\n  X\n} from 'lucide-react';`
);

fs.writeFileSync('src/components/DocumentsView.tsx', content);

let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(
  /onUpdateEventStatus={handleUpdateCalendarStatus}\n            \/>/,
  `onUpdateEventStatus={handleUpdateCalendarStatus}\n              userRole={profile?.role}\n              onUnauthorizedAction={showAuthorityWarning}\n            />`
);
fs.writeFileSync('src/App.tsx', app);

let init = fs.readFileSync('src/data/initialData.ts', 'utf8');
init = init.replace(/'Izin Pembuangan Air Limbah'/g, "'Pertek Air Limbah'");
init = init.replace(/'Izin Lingkungan'/g, "'Persetujuan Lingkungan'");
init = init.replace(/'Persetujuan Pasca Tambang'/g, "'Lainnya'");
fs.writeFileSync('src/data/initialData.ts', init);
