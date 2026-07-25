const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(
  /const showAuthorityWarning = \(actionDesc: string\) => \{/,
  `const lastWarningRef = useRef<Record<string, number>>({});
  const showAuthorityWarning = (actionDesc: string) => {
    const now = Date.now();
    if (now - (lastWarningRef.current[actionDesc] || 0) < 5000) return;
    lastWarningRef.current[actionDesc] = now;`
);
fs.writeFileSync('src/App.tsx', app);
