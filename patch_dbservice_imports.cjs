const fs = require('fs');
let content = fs.readFileSync('src/services/dbService.ts', 'utf8');

content = content.replace(
  /ComplianceMatrixSchema,\n  IncidentData,\n  IncidentSchema/,
  `IncidentData`
);

content = content.replace(
  /SolidWasteSchema\n\} from '\.\.\/utils\/validation';/,
  `SolidWasteSchema,
  ComplianceMatrixSchema,
  IncidentSchema
} from '../utils/validation';`
);

fs.writeFileSync('src/services/dbService.ts', content);
