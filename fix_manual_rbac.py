with open('src/App.tsx', 'r') as f:
    content = f.read()

bad_str = '''  const handleDeleteNurseryStockOut = async (id: string) => {
    if (!profile || (profile.role !== 'Supervisor' && profile.role !== 'Environment Superintendent' && profile.role !== 'Administrator')) {
      showAuthorityWarning("Hapus Transaksi Bibit Keluar");
      return;
    }'''

good_str = '''  const handleDeleteNurseryStockOut = async (id: string) => {
    if (!canDelete(profile)) {
      showAuthorityWarning("Hapus Transaksi Bibit Keluar");
      return;
    }'''

content = content.replace(bad_str, good_str)

bad_str2 = '''  const handleDeleteNursery = async (id: string) => {
    if (!profile || (profile.role !== 'Supervisor' && profile.role !== 'Environment Superintendent' && profile.role !== 'Administrator')) {
      showAuthorityWarning("Hapus Catatan Nursery");
      return;
    }'''

good_str2 = '''  const handleDeleteNursery = async (id: string) => {
    if (!canDelete(profile)) {
      showAuthorityWarning("Hapus Catatan Nursery");
      return;
    }'''

content = content.replace(bad_str2, good_str2)

with open('src/App.tsx', 'w') as f:
    f.write(content)
