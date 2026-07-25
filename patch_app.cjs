const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

app = app.replace(
  /import SolidWasteView from '\.\/components\/SolidWasteView';/,
  `import SolidWasteView from './components/SolidWasteView';\nimport CapaView from './components/CapaView';`
);

const capaCase = `
      case 'findings':
        return (
          <CapaView
            findings={capaFindings}
            isLoading={isLoadingCapa}
            userEmail={user?.email || undefined}
            userRole={profile?.role}
            onUnauthorizedAction={showAuthorityWarning}
          />
        );`;

app = app.replace(
  /      case 'esg':/,
  capaCase + '\n      case \'esg\':'
);

fs.writeFileSync('src/App.tsx', app);
