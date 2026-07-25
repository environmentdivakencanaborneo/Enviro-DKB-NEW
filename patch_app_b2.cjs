const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

app = app.replace(
  /import CapaView from '\.\/components\/CapaView';/,
  `import CapaView from './components/CapaView';\nimport ComplianceMatrixView from './components/ComplianceMatrixView';`
);

const complianceCase = `
      case 'compliance_matrix':
        return (
          <ComplianceMatrixView
            data={complianceMatrix}
            isLoading={isLoadingCompliance}
            userRole={profile?.role}
            onUnauthorizedAction={showAuthorityWarning}
          />
        );`;

app = app.replace(
  /      case 'esg':/,
  complianceCase + '\n      case \'esg\':'
);

fs.writeFileSync('src/App.tsx', app);
