const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

app = app.replace(
  /import IncidentView from '\.\/components\/IncidentView';/,
  `import IncidentView from './components/IncidentView';\nimport ExecutiveDashboardView from './components/ExecutiveDashboardView';`
);

const execCase = `
      case 'executive':
        return (
          <ExecutiveDashboardView
            capa={capaFindings}
            compliance={complianceMatrix}
            documents={documents}
            guarantees={reclamationGuarantees}
            incidents={incidents}
            isLoading={isLoadingCapa || isLoadingCompliance || isLoadingDocuments || isLoadingReclamation || isLoadingIncidents}
          />
        );`;

app = app.replace(
  /      case 'esg':/,
  execCase + '\n      case \'esg\':'
);

fs.writeFileSync('src/App.tsx', app);
