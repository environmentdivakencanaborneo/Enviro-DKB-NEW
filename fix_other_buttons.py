with open('src/components/ReclamationView.tsx', 'r') as f:
    content = f.read()

# 1. Nursery Item
old1 = '''onClick={() => {
                              setDeleteConfirm({
                                id: item.id,
                                type: 'nursery','''
new1 = '''onClick={() => {
                              if (!canDelete) return onUnauthorizedAction("Hapus Data Nursery");
                              setDeleteConfirm({
                                id: item.id,
                                type: 'nursery','''
content = content.replace(old1, new1)

# 2. Reset Plan
old2 = '''onClick={() => {
                                    setDeleteConfirm({
                                      id: item.id,
                                      type: 'reset-plan','''
new2 = '''onClick={() => {
                                    if (!canEdit) return onUnauthorizedAction("Reset Realisasi Reklamasi");
                                    setDeleteConfirm({
                                      id: item.id,
                                      type: 'reset-plan','''
content = content.replace(old2, new2)

# 3. Plan Delete
old3 = '''onClick={() => {
                                  setDeleteConfirm({
                                    id: item.id,
                                    type: 'plan','''
new3 = '''onClick={() => {
                                  if (!canDelete) return onUnauthorizedAction("Hapus Rencana Reklamasi");
                                  setDeleteConfirm({
                                    id: item.id,
                                    type: 'plan','''
content = content.replace(old3, new3)

# 4. Guarantee Delete
old4 = '''onClick={() => {
                                setDeleteConfirm({
                                  id: item.id,
                                  type: 'guarantee','''
new4 = '''onClick={() => {
                                if (!canDelete) return onUnauthorizedAction("Hapus Jaminan Reklamasi");
                                setDeleteConfirm({
                                  id: item.id,
                                  type: 'guarantee','''
content = content.replace(old4, new4)

# And what about the edit buttons? Let's check them!
with open('src/components/ReclamationView.tsx', 'w') as f:
    f.write(content)
