const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

app = app.replace(
  /capaFindings,\n    isLoadingWastewater,/,
  `capaFindings,\n    complianceMatrix,\n    isLoadingWastewater,`
);

app = app.replace(
  /isLoadingSolidWaste,\n    isLoadingCapa,\n    isLoadingCompliance\n  \} = useFirestoreData\(activeTab\);/,
  `isLoadingSolidWaste,\n    isLoadingCapa,\n    isLoadingCompliance\n  } = useFirestoreData(activeTab);` // wait, let's just make sure.
);

app = app.replace(
  /isLoadingSolidWaste,\n  \} = useFirestoreData\(activeTab\);/,
  `isLoadingSolidWaste,\n    isLoadingCapa,\n    isLoadingCompliance\n  } = useFirestoreData(activeTab);`
);

fs.writeFileSync('src/App.tsx', app);
