with open('src/App.tsx', 'r') as f:
    content = f.read()

import re

# Replace `isAdmin(profile)` inside the handle methods related to general deletes.
content = re.sub(r'if \(!isAdmin\(profile\)\) \{\s*showAuthorityWarning\("(Hapus [^"]+)"\);\s*return;\s*\}', r'if (!canDelete(profile)) {\n      showAuthorityWarning("\\1");\n      return;\n    }', content)

# Also replace for `canDelete={isAdmin(profile)}` with `canDelete={canDelete(profile)}`
content = content.replace('canDelete={isAdmin(profile)}', 'canDelete={canDelete(profile)}')

with open('src/App.tsx', 'w') as f:
    f.write(content)
