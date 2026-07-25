const fs = require('fs');
let content = fs.readFileSync('src/services/dbService.ts', 'utf8');

content = content.replace(
  /return updateDoc\(docRef, \{ readBy: \[\.\.\.\(alert\.readBy \|\| \[\]\), userEmail\] \}\);/,
  'return updateDoc(docRef, { clearedBy: [...(alert.clearedBy || []), userEmail], readBy: [...(alert.readBy || []), userEmail] });'
);

fs.writeFileSync('src/services/dbService.ts', content);

let types = fs.readFileSync('src/types.ts', 'utf8');
types = types.replace(/readBy\?: string\[\];/, 'readBy?: string[];\n  clearedBy?: string[];');
fs.writeFileSync('src/types.ts', types);

let notif = fs.readFileSync('src/components/NotificationsView.tsx', 'utf8');
notif = notif.replace(
  /alerts\.map\(alert => \{/,
  'alerts.filter(a => !(a.clearedBy || []).includes(userEmail || "")).map(alert => {'
);
fs.writeFileSync('src/components/NotificationsView.tsx', notif);
