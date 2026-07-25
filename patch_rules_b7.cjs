const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');

content = content.replace(
  /match \/incidents\/\{incidentId\} \{/,
  `match /regulatory/{regId} {
      allow read: if request.auth != null;
      allow write: if isHseManager() || isAdmin();
    }
    
    match /incidents/{incidentId} {`
);

fs.writeFileSync('firestore.rules', content);
