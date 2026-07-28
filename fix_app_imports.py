with open('src/App.tsx', 'r') as f:
    content = f.read()

import re

# Update imports
content = re.sub(
    r"import \{ canAccessModule, isAdmin, isSuperintendent \} from '\./services/permissionService';", 
    "import { canAccessModule, isAdmin, isSuperintendent, canDelete } from './services/permissionService';", 
    content
)

with open('src/App.tsx', 'w') as f:
    f.write(content)
