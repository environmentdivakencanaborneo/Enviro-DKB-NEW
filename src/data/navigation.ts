import {
  LayoutDashboard,
  PieChart,
  Award,
  Waves,
  FlaskConical,
  Wind,
  FileCheck2,
  Sprout,
  Layers,
  Trees,
  PackageCheck,
  Recycle,
  FolderCheck,
  CheckSquare,
  ShieldAlert,
  AlertOctagon,
  Flame,
  BookOpen,
  Coins,
  FileText,
  Bell,
  UserCheck,
  Users,
  ShieldCheck,
  History,
  FileBadge2,
  CalendarClock,
  ClipboardCheck,
  ShowerHead,
  CloudCog,
  Landmark,
  Sliders,
  LucideIcon
} from 'lucide-react';

export interface NavItem {
  id: string;
  name: string;
  icon: LucideIcon;
  hasBadge?: boolean;
  isNew?: boolean;
  subtitle: string;
  regulationBasis?: string;
  regulationSearchKey?: string;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

export const APP_MENU_GROUPS: NavGroup[] = [
  {
    group: 'RINGKASAN & KINERJA',
    items: [
      {
        id: 'dashboard',
        name: 'Dashboard Operasional',
        icon: LayoutDashboard,
        subtitle: 'Ringkasan Kinerja Lingkungan & Peringatan Dini Harian',
        regulationBasis: 'PP No. 22 Tahun 2021 · Kepmen ESDM 1827 K/2018',
        regulationSearchKey: 'PP 22',
      },
      {
        id: 'executive',
        name: 'Dashboard Eksekutif & ESG',
        icon: PieChart,
        subtitle: 'Ikhtisar Tata Kelola, Kepatuhan, Jamrek & Risiko Manajemen',
        regulationBasis: 'Permen LH/BPLH 7/2025 · Kepmen ESDM 344.K/2025',
        regulationSearchKey: '344',
      },
      {
        id: 'proper_rkab',
        name: 'PROPER & RKAB Lingkungan',
        icon: Award,
        subtitle: 'Penilaian PROPER & Realisasi Target Lingkungan RKAB Minerba',
        regulationBasis: 'Permen LH/BPLH 7/2025 · Permen ESDM 17/2025 jo. 6/2026',
        regulationSearchKey: 'PROPER',
      },
    ]
  },
  {
    group: 'PERSETUJUAN & KEPATUHAN',
    items: [
      {
        id: 'documents',
        name: 'Persetujuan Lingkungan & Perizinan',
        icon: FolderCheck,
        subtitle: 'AMDAL/UKL-UPL, Addendum, PB & OSS Berbasis Risiko',
        regulationBasis: 'PP No. 28 Tahun 2025 · Permen LH/BPLH No. 22 Tahun 2025',
        regulationSearchKey: 'PP 28',
      },
      {
        id: 'pertek_slo',
        name: 'Register Pertek & SLO',
        icon: FileBadge2,
        isNew: true,
        subtitle: 'Register Persetujuan Teknis & Surat Kelayakan Operasional',
        regulationBasis: 'Permen LHK No. 5 Tahun 2021',
        regulationSearchKey: 'Pertek',
      },
      {
        id: 'compliance_matrix',
        name: 'Matriks Kewajiban RKL-RPL & Pertek',
        icon: CheckSquare,
        subtitle: 'Pemantauan Pemenuhan Kewajiban RKL-RPL & Persyaratan Pertek',
        regulationBasis: 'PP No. 22 Tahun 2021',
        regulationSearchKey: 'PP 22',
      },
      {
        id: 'reporting_calendar',
        name: 'Kalender Pelaporan Wajib',
        icon: CalendarClock,
        isNew: true,
        subtitle: 'Jadwal & Tanda Terima RKL-RPL, Pertek, LB3, GRK, RKAB & Reklamasi',
        regulationBasis: 'PP 22/2021 · Permen ESDM 17/2025 · Permen LH/BPLH 7/2026',
        regulationSearchKey: 'RKAB',
      },
      {
        id: 'regulatory_watch',
        name: 'Regulatory Watch',
        icon: BookOpen,
        subtitle: 'Pemantauan Regulasi KLH/BPLH, ESDM & Kementerian Kehutanan',
        regulationBasis: 'KLH/BPLH · ESDM · Kementerian Kehutanan',
        regulationSearchKey: '',
      },
      {
        id: 'iadl_risk',
        name: 'Register IADL & Risiko (ISO 14001)',
        icon: ShieldAlert,
        subtitle: 'Identifikasi Aspek & Dampak Lingkungan serta Mitigasi Risiko',
        regulationBasis: 'ISO 14001:2015 · PP No. 22 Tahun 2021',
        regulationSearchKey: 'ISO 14001',
      },
      {
        id: 'supervision',
        name: 'Pengawasan Eksternal & Sanksi Administratif',
        icon: ClipboardCheck,
        isNew: true,
        subtitle: 'Catatan Inspeksi DLH/KLH/ESDM/Kehutanan & Sanksi Administratif',
        regulationBasis: 'Permen LH/BPLH No. 6 Tahun 2026',
        regulationSearchKey: 'Pengawasan',
      },
    ]
  },
  {
    group: 'PENGENDALIAN PENCEMARAN AIR',
    items: [
      {
        id: 'monitoring',
        name: 'Air Limbah Tambang, Air Permukaan & Curah Hujan',
        icon: Waves,
        subtitle: 'Pemantauan Outlet KPL, Badan Air Penerima & Stasiun Curah Hujan',
        regulationBasis: 'Kepmen LH 113/2003 · SK Pertek PT DKB · PP 22/2021 Lamp. VI',
        regulationSearchKey: '113',
      },
      {
        id: 'amd_treatment',
        name: 'Pengolahan Air Asam Tambang',
        icon: FlaskConical,
        subtitle: 'Pengapuran Aktif, Flokulasi & Lahan Basah Buatan',
        regulationBasis: 'Kepmen LH 113/2003 · Permen LHK No. 5 Tahun 2022',
        regulationSearchKey: 'Air Asam',
      },
      {
        id: 'domestic_wastewater',
        name: 'Air Limbah Domestik (IPAL Camp & Kantor)',
        icon: ShowerHead,
        isNew: true,
        subtitle: 'Pemantauan Efluen IPAL Camp, Mess & Kantor Menggunakan Master Baku Mutu',
        regulationBasis: 'Permen LH/BPLH No. 11 Tahun 2025',
        regulationSearchKey: 'Domestik',
      },
      {
        id: 'evidence',
        name: 'Evidence Hub',
        icon: FileCheck2,
        subtitle: 'Arsip Berita Acara Sampling Harian/Bulanan & Verifikasi QR Publik',
        regulationBasis: 'Kepmen LH 113/2003 · PP No. 22 Tahun 2021',
        regulationSearchKey: '113',
      },
    ]
  },
  {
    group: 'UDARA, EMISI & IKLIM',
    items: [
      {
        id: 'air_emission',
        name: 'Udara Ambien, Emisi & Kebisingan',
        icon: Wind,
        subtitle: 'Pemantauan Partikulat PM10/PM2.5/TSP, Emisi Sumber Bergerak & Bising',
        regulationBasis: 'PP No. 22 Tahun 2021 Lampiran VII',
        regulationSearchKey: 'Udara',
      },
      {
        id: 'ghg_inventory',
        name: 'Inventarisasi Emisi GRK',
        icon: CloudCog,
        isNew: true,
        subtitle: 'Log Aktivitas, Master Faktor Emisi & Rekap Tahunan (Pelaporan Maret)',
        regulationBasis: 'Perpres No. 110 Tahun 2025 · Permen LH/BPLH No. 7 Tahun 2026',
        regulationSearchKey: 'GRK',
      },
    ]
  },
  {
    group: 'PENGELOLAAN LIMBAH',
    items: [
      {
        id: 'waste',
        name: 'Limbah B3 — TPS, Logbook, Neraca & Manifest Elektronik',
        icon: PackageCheck,
        subtitle: 'Logbook FIFO TPS B3, Masa Simpan 90 Hari & Manifest Elektronik',
        regulationBasis: 'PP No. 22/2021 Lampiran IX · Permen LHK No. 6 Tahun 2021',
        regulationSearchKey: 'Limbah B3',
      },
      {
        id: 'solid_waste',
        name: 'Limbah Non-B3 & Sampah Domestik',
        icon: Recycle,
        subtitle: 'Pemilahan Organik, Anorganik & Residu dengan Target Internal',
        regulationBasis: 'UU No. 18/2008 · PP No. 81/2012 · Permen LHK No. 19 Tahun 2021',
        regulationSearchKey: '18',
      },
    ]
  },
  {
    group: 'REKLAMASI & PASCATAMBANG',
    items: [
      {
        id: 'reclamation',
        name: 'Reklamasi & Nursery',
        icon: Sprout,
        subtitle: 'Manajemen Persemaian, Penyaluran Bibit & Realisasi Lahan Reklamasi',
        regulationBasis: 'Kepmen ESDM 344.K/2025 · Kepmen ESDM 1827 K/2018',
        regulationSearchKey: 'Reklamasi',
      },
      {
        id: 'reclamation_guarantee',
        name: 'Jaminan Reklamasi & Pascatambang',
        icon: Landmark,
        isNew: true,
        subtitle: 'Deposito Berjangka Bank Pemerintah & Pemantauan Jatuh Tempo Jamrek/JamPT',
        regulationBasis: 'Kepmen ESDM No. 344.K/MB.01/MEM.B/2025',
        regulationSearchKey: '344',
      },
      {
        id: 'topsoil_erosion',
        name: 'Tanah Pucuk, Erosi & Sedimentasi',
        icon: Layers,
        subtitle: 'Neraca Stockpile Topsoil, Cover Crop & Pengendalian Erosi',
        regulationBasis: 'Kepmen ESDM No. 1827 K/30/MEM/2018',
        regulationSearchKey: '1827',
      },
      {
        id: 'biodiversity',
        name: 'Keanekaragaman Hayati & TSL Dilindungi',
        icon: Trees,
        subtitle: 'Inventarisasi Flora, Fauna & Koridor Satwa Dilindungi',
        regulationBasis: 'Permen LHK No. P.106/2018',
        regulationSearchKey: '106',
      },
    ]
  },
  {
    group: 'INSIDEN & PERBAIKAN',
    items: [
      {
        id: 'incidents',
        name: 'Insiden & Tanggap Darurat Pencemaran',
        icon: Flame,
        subtitle: 'Pelaporan Insiden, Investigasi & Tindakan Penanggulangan Awal',
        regulationBasis: 'PP No. 22 Tahun 2021 · Kepmen ESDM 1827/2018',
        regulationSearchKey: 'Insiden',
      },
      {
        id: 'findings',
        name: 'CAPA & Temuan',
        icon: AlertOctagon,
        subtitle: 'Tindakan Korektif & Preventif Temuan Audit, PROPER & Pengawasan Eksternal',
        regulationBasis: 'ISO 14001:2015 · Permen LH/BPLH 6/2026 & 7/2025',
        regulationSearchKey: 'PROPER',
      },
    ]
  },
  {
    group: 'BIAYA & PELAPORAN',
    items: [
      {
        id: 'costs',
        name: 'Biaya Lingkungan',
        icon: Coins,
        subtitle: 'Rencana & Realisasi Anggaran OPEX/CAPEX Pengelolaan Lingkungan',
        regulationBasis: 'Permen ESDM 17/2025 jo. 6/2026 (RKAB)',
        regulationSearchKey: 'RKAB',
      },
      {
        id: 'reports',
        name: 'Laporan Lingkungan Tambang',
        icon: FileText,
        subtitle: 'Rekapitulasi Kepatuhan Terintegrasi & Ekspor Multi-Sheet Excel',
        regulationBasis: 'PP 22/2021 · Kepmen ESDM 1827/2018 · RKAB/RKL-RPL',
        regulationSearchKey: 'PP 22',
      },
    ]
  },
  {
    group: 'SISTEM & ADMINISTRASI',
    items: [
      {
        id: 'notifications',
        name: 'Notifikasi & Peringatan Dini',
        icon: Bell,
        hasBadge: true,
        subtitle: 'Riwayat Peringatan Pelampauan Baku Mutu, Masa Simpan & Izin',
      },
      {
        id: 'registration_approval',
        name: 'Persetujuan Registrasi',
        icon: UserCheck,
        subtitle: 'Verifikasi Pendaftaran Akun Baru & Penetapan Peran Awal',
      },
      {
        id: 'user_management',
        name: 'Manajemen Pengguna',
        icon: Users,
        subtitle: 'Pengelolaan Status Akun, Reset Password & Otoritas Pengguna',
      },
      {
        id: 'role_management',
        name: 'Matriks Peran (RBAC)',
        icon: ShieldCheck,
        subtitle: 'Konfigurasi Hak Akses Modul Berdasarkan Hierarki Jabatan',
      },
      {
        id: 'audit_log',
        name: 'Audit Trail Sistem',
        icon: History,
        subtitle: 'Rekam Jejak Immutable Aktivitas Baca/Tulis Database Firestore',
      },
      {
        id: 'standards_master',
        name: 'Master Baku Mutu & Konfigurasi',
        icon: Sliders,
        isNew: true,
        subtitle: 'Pengelolaan Koleksi standards/{id} & Ambang Internal Perusahaan',
        regulationBasis: 'Kepmen LH 113/2003 · Permen LH/BPLH 11/2025 · PP 22/2021',
        regulationSearchKey: '113',
      },
    ]
  }
];

export const APP_TABS: NavItem[] = APP_MENU_GROUPS.flatMap(g => g.items);

export const APP_TAB_MAP: Record<string, NavItem> = Object.fromEntries(
  APP_TABS.map(item => [item.id, item])
);

export const VALID_TABS = APP_TABS.map(t => t.id);

export type AppTabId = string;

export const MOBILE_PRIMARY_TABS = ['dashboard', 'monitoring', 'waste', 'reclamation'];

export const MOBILE_SECONDARY_TABS = APP_TABS.map(t => t.id).filter(id => !MOBILE_PRIMARY_TABS.includes(id));
