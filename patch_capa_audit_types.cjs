const fs = require('fs');
let content = fs.readFileSync('src/services/dbService.ts', 'utf8');

content = content.replace(/action: 'CREATE',/g, "action: 'insert',");
content = content.replace(/action: 'UPDATE',/g, "action: 'update',");
content = content.replace(/action: 'DELETE',/g, "action: 'delete',");

fs.writeFileSync('src/services/dbService.ts', content);
