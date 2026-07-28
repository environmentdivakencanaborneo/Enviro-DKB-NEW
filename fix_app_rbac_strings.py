import re

with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if 'showAuthorityWarning("\\1")' in line:
        # Look backwards for the function name
        func_name = ''
        for j in range(i-1, i-5, -1):
            if j < 0: break
            m = re.search(r'const (handleDelete\w+) =', lines[j])
            if m:
                func_name = m.group(1)
                break
        
        mapping = {
            'handleDeleteWastewater': 'Hapus Data Air Limbah',
            'handleDeleteSurfaceWater': 'Hapus Data Kualitas Air Permukaan',
            'handleDeleteRainfall': 'Hapus Catatan Curah Hujan',
            'handleDeletePlan': 'Hapus Rencana/Realisasi Reklamasi',
            'handleDeleteGuarantee': 'Hapus Jaminan Reklamasi',
            'handleDeleteWasteIn': 'Hapus Log Masuk Limbah B3',
            'handleDeleteWasteOut': 'Hapus Log Keluar Limbah B3',
            'handleDeleteDocument': 'Hapus Dokumen AMDAL',
            'handleDeleteCalendarEvent': 'Hapus Kegiatan Agenda Kepatuhan',
            'handleDeleteCost': 'Hapus Catatan Biaya Lingkungan',
            'handleDeleteSolidWaste': 'Hapus Data Pengolahan Sampah'
        }
        
        msg = mapping.get(func_name, "Hapus Data")
        new_lines.append(line.replace('showAuthorityWarning("\\1")', f'showAuthorityWarning("{msg}")'))
    else:
        new_lines.append(line)

with open('src/App.tsx', 'w') as f:
    f.writelines(new_lines)
