const fs = require('fs');
let content = fs.readFileSync('src/components/ExecutiveDashboardView.tsx', 'utf8');

content = content.replace(
  /g\.status === 'Active' \|\| g\.status === 'Placed'/,
  `g.status === 'Active' || g.status === 'Renewal Needed'`
);

fs.writeFileSync('src/components/ExecutiveDashboardView.tsx', content);
