const fs = require('fs');
let content = fs.readFileSync('src/hooks/useFirestoreData.ts', 'utf8');

content = content.replace(
  /const \[capaFindings, complianceMatrix, setCapaFindings\] = useState<CapaData\[\]>\(\[\]\);/,
  `const [capaFindings, setCapaFindings] = useState<CapaData[]>([]);`
);

content = content.replace(
  /const \[isLoadingCapa, isLoadingCompliance, setIsLoadingCapa\] = useState\(false\);/,
  `const [isLoadingCapa, setIsLoadingCapa] = useState(false);`
);

content = content.replace(
  /setCapaFindings\(\[\]\); setComplianceMatrix\(\[\]\); setComplianceMatrix\(\[\]\);/,
  `setCapaFindings([]); setComplianceMatrix([]);`
);

fs.writeFileSync('src/hooks/useFirestoreData.ts', content);

let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(
  /alerts,\n    solidWaste,\n    capaFindings, complianceMatrix,\n    isLoadingWastewater,/,
  `alerts,\n    solidWaste,\n    capaFindings,\n    complianceMatrix,\n    isLoadingWastewater,`
);

app = app.replace(
  /isLoadingSolidWaste,\n    isLoadingCapa, isLoadingCompliance\n  } = useFirestoreData\(activeTab\);/,
  `isLoadingSolidWaste,\n    isLoadingCapa,\n    isLoadingCompliance\n  } = useFirestoreData(activeTab);`
);

fs.writeFileSync('src/App.tsx', app);
