with open('src/components/ReclamationView.tsx', 'r') as f:
    content = f.read()

# Replace Edit clicks
edit_nursery_bad = """onClick={() => {
                              if (r.jenisTransaksi === 'Penerimaan') {
                                const originalItem = nursery?.find(n => n.id === r.id);
                                if (originalItem) {
                                  startEditNursery(originalItem);
                                }
                              } else {
                                const originalOut = nurseryStockOut?.find(o => o.id === r.id);
                                if (originalOut) {
                                  setInitialNurseryOutData(originalOut);
                                  setEditingNurseryOutId(originalOut.id);
                                  setShowNurseryOutForm(true);
                                }
                              }
                            }}"""

edit_nursery_good = """onClick={() => {
                              if (!canEdit) return onUnauthorizedAction("Ubah Data Nursery/Bibit");
                              if (r.jenisTransaksi === 'Penerimaan') {
                                const originalItem = nursery?.find(n => n.id === r.id);
                                if (originalItem) {
                                  startEditNursery(originalItem);
                                }
                              } else {
                                const originalOut = nurseryStockOut?.find(o => o.id === r.id);
                                if (originalOut) {
                                  setInitialNurseryOutData(originalOut);
                                  setEditingNurseryOutId(originalOut.id);
                                  setShowNurseryOutForm(true);
                                }
                              }
                            }}"""

content = content.replace(edit_nursery_bad, edit_nursery_good)

# Replace Delete clicks
delete_nursery_bad = """onClick={() => {
                              if (r.jenisTransaksi === 'Penerimaan') {
                                setDeleteConfirm({
                                  id: r.id,
                                  type: 'nursery',
                                  message: `Apakah Anda yakin ingin menghapus data ini? Perubahan ini akan mempengaruhi perhitungan stok nursery.`
                                });
                              } else {
                                setDeleteConfirm({
                                  id: r.id,
                                  type: 'nurseryStockOut',
                                  message: `Apakah Anda yakin ingin menghapus data ini? Perubahan ini akan mempengaruhi perhitungan stok nursery.`
                                });
                              }
                            }}"""

delete_nursery_good = """onClick={() => {
                              if (!canDelete) return onUnauthorizedAction("Hapus Data Nursery/Bibit");
                              if (r.jenisTransaksi === 'Penerimaan') {
                                setDeleteConfirm({
                                  id: r.id,
                                  type: 'nursery',
                                  message: `Apakah Anda yakin ingin menghapus data ini? Perubahan ini akan mempengaruhi perhitungan stok nursery.`
                                });
                              } else {
                                setDeleteConfirm({
                                  id: r.id,
                                  type: 'nurseryStockOut',
                                  message: `Apakah Anda yakin ingin menghapus data ini? Perubahan ini akan mempengaruhi perhitungan stok nursery.`
                                });
                              }
                            }}"""

content = content.replace(delete_nursery_bad, delete_nursery_good)

with open('src/components/ReclamationView.tsx', 'w') as f:
    f.write(content)
