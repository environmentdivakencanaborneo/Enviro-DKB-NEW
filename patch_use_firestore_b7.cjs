const fs = require('fs');
let content = fs.readFileSync('src/hooks/useFirestoreData.ts', 'utf8');

content = content.replace(
  /incidentService\n\} from '\.\.\/services\/dbService';/,
  `incidentService,
  regulatoryService
} from '../services/dbService';`
);

content = content.replace(
  /IncidentData\n\} from '\.\.\/types';/,
  `IncidentData,
  RegulatoryWatchData
} from '../types';`
);

content = content.replace(
  /const \[incidents, setIncidents\] = useState<IncidentData\[\]>\(\[\]\);/,
  `const [incidents, setIncidents] = useState<IncidentData[]>([]);
  const [regulatory, setRegulatory] = useState<RegulatoryWatchData[]>([]);`
);

content = content.replace(
  /const \[isLoadingIncidents, setIsLoadingIncidents\] = useState\(false\);/,
  `const [isLoadingIncidents, setIsLoadingIncidents] = useState(false);
  const [isLoadingRegulatory, setIsLoadingRegulatory] = useState(false);`
);

content = content.replace(
  /setIncidents\(\[\]\);/,
  `setIncidents([]); setRegulatory([]);`
);

content = content.replace(
  /const needsIncidents = \['dashboard', 'incidents', 'esg'\]\.includes\(activeTab\);/,
  `const needsIncidents = ['dashboard', 'incidents', 'esg', 'executive'].includes(activeTab);
    const needsRegulatory = ['regulatory_watch', 'esg'].includes(activeTab);`
);

content = content.replace(
  /if \(needsIncidents\) \{\n        setIsLoadingIncidents\(true\);\n        cleanups\.push\(incidentService\.subscribe\(\(data\) => \{\n          setIncidents\(data\); setIsLoadingIncidents\(false\);\n        \}\)\);\n      \}/,
  `if (needsIncidents) {
        setIsLoadingIncidents(true);
        cleanups.push(incidentService.subscribe((data) => {
          setIncidents(data); setIsLoadingIncidents(false);
        }));
      }
      if (needsRegulatory) {
        setIsLoadingRegulatory(true);
        cleanups.push(regulatoryService.subscribe((data) => {
          setRegulatory(data); setIsLoadingRegulatory(false);
        }));
      }`
);

content = content.replace(
  /complianceMatrix, incidents,/,
  `complianceMatrix, incidents, regulatory,`
);

content = content.replace(
  /isLoadingCompliance, isLoadingIncidents/,
  `isLoadingCompliance, isLoadingIncidents, isLoadingRegulatory`
);

fs.writeFileSync('src/hooks/useFirestoreData.ts', content);
