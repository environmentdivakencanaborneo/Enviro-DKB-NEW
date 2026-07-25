const fs = require('fs');
let content = fs.readFileSync('src/services/dbService.ts', 'utf8');

content = content.replace(/documentId: id,/g, "recordId: id,");

fs.writeFileSync('src/services/dbService.ts', content);
