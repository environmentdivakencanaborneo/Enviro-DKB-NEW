const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

app = app.replace(
  /isLoadingAlerts,\n    isLoadingSolidWaste,\n    isLoadingCapa\n  \} = useFirestoreData\(activeTab\);/,
  `isLoadingAlerts,\n    isLoadingSolidWaste,\n    isLoadingCapa,\n    isLoadingCompliance,\n    isLoadingIncidents\n  } = useFirestoreData(activeTab);`
);

fs.writeFileSync('src/App.tsx', app);
