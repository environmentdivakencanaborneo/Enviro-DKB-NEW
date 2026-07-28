with open('src/components/ReclamationView.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'setDeleteConfirm({',
    'if (!canDelete) return onUnauthorizedAction("Hapus Data Reklamasi");\n                                setDeleteConfirm({'
)

# wait, that's too brute-force and will break indentation and might add multiple checks if already there...
