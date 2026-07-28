with open('src/App.tsx', 'r') as f:
    content = f.read()

import re

# Update ReclamationView render inside App.tsx
old_str = """
              onAddGuarantee={handleAddGuarantee}
              onUpdateGuarantee={handleUpdateGuarantee}
              onDeleteGuarantee={handleDeleteGuarantee}
            />
"""

new_str = """
              onAddGuarantee={handleAddGuarantee}
              onUpdateGuarantee={handleUpdateGuarantee}
              onDeleteGuarantee={handleDeleteGuarantee}
              canEdit={hasWriteAuthority}
              canDelete={canDelete(profile)}
              onUnauthorizedAction={showAuthorityWarning}
            />
"""

content = content.replace(old_str, new_str)

with open('src/App.tsx', 'w') as f:
    f.write(content)
