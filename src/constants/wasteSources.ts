export const SOLID_WASTE_SOURCES = [
  'Kantor Utama',
  'Workshop',
  'Mess Karyawan (Khatulistiwa)',
  'Mess Karyawan (Nusantara)',
  'Kantin',
  'Gudang',
  'Klinik',
  'Pos Security',
  'Lainnya'
] as const;

export function formatWasteSource(source: string | null | undefined): string {
  if (!source) return '';
  if (source === 'Mess Karyawan (East Wing)') return 'Mess Karyawan (Khatulistiwa)';
  if (source === 'Mess Karyawan (West Wing)') return 'Mess Karyawan (Nusantara)';
  return source;
}
