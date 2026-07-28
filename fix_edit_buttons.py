with open('src/components/ReclamationView.tsx', 'r') as f:
    content = f.read()

# Edit Nursery
old = '''onClick={() => startEditNursery(item)}'''
new = '''onClick={() => {
                              if (!canEdit) return onUnauthorizedAction("Ubah Data Nursery/Bibit");
                              startEditNursery(item);
                            }}'''
content = content.replace(old, new)

# Edit Plan
old2 = '''onClick={() => startEditPlan(item)}'''
new2 = '''onClick={() => {
                                  if (!canEdit) return onUnauthorizedAction("Ubah Rencana Reklamasi");
                                  startEditPlan(item);
                                }}'''
content = content.replace(old2, new2)

# Edit Guarantee
old3 = '''onClick={() => startEditGuarantee(item)}'''
new3 = '''onClick={() => {
                                if (!canEdit) return onUnauthorizedAction("Ubah Jaminan Reklamasi");
                                startEditGuarantee(item);
                              }}'''
content = content.replace(old3, new3)

with open('src/components/ReclamationView.tsx', 'w') as f:
    f.write(content)
