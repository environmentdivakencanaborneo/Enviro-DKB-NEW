const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(
  /const diffTime = Date\.now\(\) - new Date\(b\.entryDate\)\.getTime\(\);/g,
  `const d = new Date(b.entryDate);
        const timeVal = isNaN(d.getTime()) ? Date.now() : d.getTime();
        const diffTime = Date.now() - timeVal;`
);
fs.writeFileSync('src/App.tsx', app);
