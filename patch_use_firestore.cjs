const fs = require('fs');
let content = fs.readFileSync('src/hooks/useFirestoreData.ts', 'utf8');

content = content.replace(
  /capaService\n\} from '\.\.\/services\/dbService';/,
  `capaService,
  complianceMatrixService
} from '../services/dbService';`
);

content = content.replace(
  /CapaData\n\} from '\.\.\/types';/,
  `CapaData,
  ComplianceMatrixData
} from '../types';`
);

content = content.replace(
  /const \[capaFindings, setCapaFindings\] = useState<CapaData\[\]>\(\[\]\);/,
  `const [capaFindings, setCapaFindings] = useState<CapaData[]>([]);
  const [complianceMatrix, setComplianceMatrix] = useState<ComplianceMatrixData[]>([]);`
);

content = content.replace(
  /const \[isLoadingCapa, setIsLoadingCapa\] = useState\(false\);/,
  `const [isLoadingCapa, setIsLoadingCapa] = useState(false);
  const [isLoadingCompliance, setIsLoadingCompliance] = useState(false);`
);

content = content.replace(
  /setCapaFindings\(\[\]\);/,
  `setCapaFindings([]); setComplianceMatrix([]);`
);

content = content.replace(
  /const needsCapa = \['dashboard', 'findings', 'esg'\]\.includes\(activeTab\);/,
  `const needsCapa = ['dashboard', 'findings', 'esg'].includes(activeTab);
    const needsCompliance = ['dashboard', 'compliance_matrix', 'esg'].includes(activeTab);`
);

content = content.replace(
  /if \(needsCapa\) \{\n        setIsLoadingCapa\(true\);\n        cleanups\.push\(capaService\.subscribe\(\(data\) => \{\n          setCapaFindings\(data\); setIsLoadingCapa\(false\);\n        \}\)\);\n      \}/,
  `if (needsCapa) {
        setIsLoadingCapa(true);
        cleanups.push(capaService.subscribe((data) => {
          setCapaFindings(data); setIsLoadingCapa(false);
        }));
      }
      if (needsCompliance) {
        setIsLoadingCompliance(true);
        cleanups.push(complianceMatrixService.subscribe((data) => {
          setComplianceMatrix(data); setIsLoadingCompliance(false);
        }));
      }`
);

content = content.replace(
  /capaFindings,/,
  `capaFindings, complianceMatrix,`
);

content = content.replace(
  /isLoadingCapa/,
  `isLoadingCapa, isLoadingCompliance`
);

fs.writeFileSync('src/hooks/useFirestoreData.ts', content);
