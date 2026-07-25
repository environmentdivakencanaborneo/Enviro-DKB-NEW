const fs = require('fs');
let content = fs.readFileSync('src/hooks/useFirestoreData.ts', 'utf8');

// Replace the dependency array and activeTab check for alerts
content = content.replace(
  /const needsAlerts = true; \/\/ Always needed for header bell/g,
  ''
);

content = content.replace(
  /      if \(needsAlerts\) \{\n        setIsLoadingAlerts\(true\);\n        cleanups\.push\(notificationService\.subscribe\(\(data\) => \{\n          setAlerts\(data\); setIsLoadingAlerts\(false\);\n        \}\)\);\n      \}\n/g,
  ''
);

content = content.replace(
  /return \(\) => \{\n      cleanups\.forEach/,
  `return () => {\n      cleanups.forEach`
);

// Add another useEffect for alerts
const newEffect = `
  useEffect(() => {
    if (!user || !profile) return;
    setIsLoadingAlerts(true);
    const unsubscribe = notificationService.subscribe((data) => {
      setAlerts(data);
      setIsLoadingAlerts(false);
    });
    return () => unsubscribe();
  }, [user, profile]);\n\n  return {`;

content = content.replace(/\n  return \{/g, newEffect);

fs.writeFileSync('src/hooks/useFirestoreData.ts', content);
