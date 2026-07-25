const fs = require('fs');
let content = fs.readFileSync('src/hooks/useFirestoreData.ts', 'utf8');

content = content.replace(
  /complianceMatrixService\n\} from '\.\.\/services\/dbService';/,
  `complianceMatrixService,
  incidentService
} from '../services/dbService';`
);

content = content.replace(
  /ComplianceMatrixData\n\} from '\.\.\/types';/,
  `ComplianceMatrixData,
  IncidentData
} from '../types';`
);

content = content.replace(
  /const \[complianceMatrix, setComplianceMatrix\] = useState<ComplianceMatrixData\[\]>\(\[\]\);/,
  `const [complianceMatrix, setComplianceMatrix] = useState<ComplianceMatrixData[]>([]);
  const [incidents, setIncidents] = useState<IncidentData[]>([]);`
);

content = content.replace(
  /const \[isLoadingCompliance, setIsLoadingCompliance\] = useState\(false\);/,
  `const [isLoadingCompliance, setIsLoadingCompliance] = useState(false);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(false);`
);

content = content.replace(
  /setComplianceMatrix\(\[\]\);/,
  `setComplianceMatrix([]); setIncidents([]);`
);

content = content.replace(
  /const needsCompliance = \['dashboard', 'compliance_matrix', 'esg'\]\.includes\(activeTab\);/,
  `const needsCompliance = ['dashboard', 'compliance_matrix', 'esg'].includes(activeTab);
    const needsIncidents = ['dashboard', 'incidents', 'esg'].includes(activeTab);`
);

content = content.replace(
  /if \(needsCompliance\) \{\n        setIsLoadingCompliance\(true\);\n        cleanups\.push\(complianceMatrixService\.subscribe\(\(data\) => \{\n          setComplianceMatrix\(data\); setIsLoadingCompliance\(false\);\n        \}\)\);\n      \}/,
  `if (needsCompliance) {
        setIsLoadingCompliance(true);
        cleanups.push(complianceMatrixService.subscribe((data) => {
          setComplianceMatrix(data); setIsLoadingCompliance(false);
        }));
      }
      if (needsIncidents) {
        setIsLoadingIncidents(true);
        cleanups.push(incidentService.subscribe((data) => {
          setIncidents(data); setIsLoadingIncidents(false);
        }));
      }`
);

content = content.replace(
  /solidWaste, capaFindings,/,
  `solidWaste, capaFindings, complianceMatrix, incidents,`
);

content = content.replace(
  /isLoadingAlerts, isLoadingSolidWaste, isLoadingCapa/,
  `isLoadingAlerts, isLoadingSolidWaste, isLoadingCapa, isLoadingCompliance, isLoadingIncidents`
);

fs.writeFileSync('src/hooks/useFirestoreData.ts', content);
