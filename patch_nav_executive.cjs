const fs = require('fs');
let content = fs.readFileSync('src/data/navigation.ts', 'utf8');

content = content.replace(
  /\{ id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard \},/,
  `{ id: 'dashboard', name: 'Dashboard Operasional', icon: LayoutDashboard },
      { id: 'executive', name: 'Dashboard Eksekutif', icon: PieChart },`
);

content = content.replace(
  /LayoutDashboard,/,
  `LayoutDashboard,
  PieChart,`
);

fs.writeFileSync('src/data/navigation.ts', content);
