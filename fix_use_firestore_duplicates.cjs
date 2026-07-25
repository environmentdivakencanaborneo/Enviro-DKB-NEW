const fs = require('fs');
let content = fs.readFileSync('src/hooks/useFirestoreData.ts', 'utf8');

// I might have appended things incorrectly and caused a tuple expansion. Let's look at useFirestoreData.ts
fs.writeFileSync('src/hooks/useFirestoreData_backup.ts', content);
