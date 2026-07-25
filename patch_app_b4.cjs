const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

app = app.replace(
  /complianceMatrix,\n    isLoadingWastewater,/,
  `complianceMatrix,\n    incidents,\n    isLoadingWastewater,`
);

app = app.replace(
  /isLoadingCompliance\n  \} = useFirestoreData\(activeTab\);/,
  `isLoadingCompliance,\n    isLoadingIncidents\n  } = useFirestoreData(activeTab);`
);

app = app.replace(
  /import ComplianceMatrixView from '\.\/components\/ComplianceMatrixView';/,
  `import ComplianceMatrixView from './components/ComplianceMatrixView';\nimport IncidentView from './components/IncidentView';`
);

const incCase = `
      case 'incidents':
        return (
          <IncidentView
            incidents={incidents}
            isLoading={isLoadingIncidents}
            userRole={profile?.role}
            onUnauthorizedAction={showAuthorityWarning}
          />
        );`;

app = app.replace(
  /      case 'esg':/,
  incCase + '\n      case \'esg\':'
);

fs.writeFileSync('src/App.tsx', app);
