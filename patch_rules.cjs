const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');

content = content.replace(
  /match \/capa\/\{capaId\} \{/,
  `match /compliance_matrix/{matrixId} {
      allow read: if request.auth != null;
      allow write: if isHseManager() || isAdmin() || isOperator();
    }
    
    match /capa/{capaId} {`
);

fs.writeFileSync('firestore.rules', content);
