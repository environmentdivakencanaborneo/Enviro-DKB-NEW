with open('src/services/permissionService.ts', 'r') as f:
    content = f.read()

import re

# Remove the broken lines from line 52 to 81
lines = content.split('\n')
good_lines = lines[:51] + lines[82:]

with open('src/services/permissionService.ts', 'w') as f:
    f.write('\n'.join(good_lines))
