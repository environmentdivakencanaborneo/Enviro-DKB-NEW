const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

app = app.replace(
  /incidents,\n    isLoadingWastewater,/,
  `incidents,\n    regulatory,\n    isLoadingWastewater,`
);

app = app.replace(
  /isLoadingIncidents\n  \} = useFirestoreData\(activeTab\);/,
  `isLoadingIncidents,\n    isLoadingRegulatory\n  } = useFirestoreData(activeTab);`
);

app = app.replace(
  /import ExecutiveDashboardView from '\.\/components\/ExecutiveDashboardView';/,
  `import ExecutiveDashboardView from './components/ExecutiveDashboardView';\nimport RegulatoryWatchView from './components/RegulatoryWatchView';`
);

const regCase = `
      case 'regulatory_watch':
        return (
          <RegulatoryWatchView
            data={regulatory}
            isLoading={isLoadingRegulatory}
            userRole={profile?.role}
            onUnauthorizedAction={showAuthorityWarning}
          />
        );`;

app = app.replace(
  /      case 'esg':/,
  regCase + '\n      case \'esg\':'
);

fs.writeFileSync('src/App.tsx', app);
