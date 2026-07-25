const fs = require('fs');
let content = fs.readFileSync('tsconfig.json', 'utf8');
content = content.replace(/\s*\}\n\s*\}\n*$/, '\n}\n');
fs.writeFileSync('tsconfig.json', content);
