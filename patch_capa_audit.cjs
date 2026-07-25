const fs = require('fs');
let content = fs.readFileSync('src/services/dbService.ts', 'utf8');

// Patch add
content = content.replace(
  /setOfflineCache\('capa', \[newItem, \.\.\.docs\]\);\n  \},/,
  `setOfflineCache('capa', [newItem, ...docs]);
    await auditService.createLog({
      collection: 'capa',
      action: 'CREATE',
      documentId: id,
      newData: newItem,
    });
  },`
);

// Patch update
content = content.replace(
  /setOfflineCache\('capa', updatedDocs\);\n  \},/,
  `setOfflineCache('capa', updatedDocs);
    await auditService.createLog({
      collection: 'capa',
      action: 'UPDATE',
      documentId: id,
      oldData: oldData,
      newData: merged,
    });
  },`
);

// Patch delete
content = content.replace(
  /setOfflineCache\('capa', docs\.filter\(x => x\.id !== id\)\);\n  \}/,
  `setOfflineCache('capa', docs.filter(x => x.id !== id));
    await auditService.createLog({
      collection: 'capa',
      action: 'DELETE',
      documentId: id,
    });
  }`
);

fs.writeFileSync('src/services/dbService.ts', content);
