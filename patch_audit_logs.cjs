const fs = require('fs');
let content = fs.readFileSync('src/services/dbService.ts', 'utf8');

content = content.replace(
  /newData: newItem,\n    \}\);/g,
  "details: `Created new CAPA record: ${newItem.title}`\n    });"
);

content = content.replace(
  /oldData: oldData,\n      newData: merged,\n    \}\);/g,
  "details: `Updated CAPA record status/details.`\n    });"
);

content = content.replace(
  /recordId: id,\n    \}\);/g,
  "recordId: id,\n      details: `Deleted CAPA record.`\n    });"
);

fs.writeFileSync('src/services/dbService.ts', content);
