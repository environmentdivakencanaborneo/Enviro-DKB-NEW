with open('src/App.tsx', 'r') as f:
    lines = f.readlines()
for i, l in enumerate(lines):
    if 'canDelete=' in l:
        print(f"{i+1}: {l.strip()}")
