with open('src/components/ReclamationView.tsx', 'r') as f:
    content = f.read()

import re

# Update Props
content = re.sub(
    r'(interface ReclamationViewProps \{)',
    r'\1\n  canEdit?: boolean;\n  canDelete?: boolean;\n  onUnauthorizedAction?: (msg: string) => void;',
    content
)

# Update Component Signature
content = re.sub(
    r'(export default function ReclamationView\(\{)',
    r'\1\n  canEdit = false,\n  canDelete = false,\n  onUnauthorizedAction = () => {},\n',
    content
)

with open('src/components/ReclamationView.tsx', 'w') as f:
    f.write(content)
