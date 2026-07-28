import {
  LayoutDashboard,
  PieChart,
  Droplet,
  Sprout,
  Trash2,
  RefreshCw,
  Coins,
  FileText,
  FileLock,
  BookOpen,
  Bell,
  Globe2,
  Award,
  AlertOctagon,
  CheckSquare,
  Flame,
  UserCheck,
  Users,
  ShieldCheck,
  LucideIcon
} from 'lucide-react';

export interface NavItem {
  id: string;
  name: string;
  icon: LucideIcon;
  hasBadge?: boolean;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

export const APP_MENU_GROUPS: NavGroup[] = [
  {
    group: 'OPERASIONAL',
    items: [
      { id: 'dashboard', name: 'Dashboard Operasional', icon: LayoutDashboard },
      { id: 'executive', name: 'Dashboard Eksekutif', icon: PieChart },
      { id: 'monitoring', name: 'Pemantauan Air', icon: Droplet },
      { id: 'reclamation', name: 'Reklamasi', icon: Sprout },
    ]
  },
  {
    group: 'LIMBAH',
    items: [
      { id: 'waste', name: 'Limbah B3 TPS', icon: Trash2 },
      { id: 'solid_waste', name: 'Pengolahan Sampah', icon: RefreshCw },
    ]
  },
  {
    group: 'KEPATUHAN',
    items: [
      { id: 'documents', name: 'Registrasi Perizinan', icon: FileLock },
      { id: 'regulatory_watch', name: 'Pemantau Regulasi', icon: BookOpen },
      { id: 'compliance_matrix', name: 'Matriks RKL-RPL', icon: CheckSquare },
      { id: 'incidents', name: 'Insiden & Kedaruratan', icon: Flame },
      { id: 'findings', name: 'Temuan & CAPA', icon: AlertOctagon },
    ]
  },
  {
    group: 'PELAPORAN',
    items: [
      { id: 'reports', name: 'Laporan Tambang', icon: FileText },
      { id: 'costs', name: 'Biaya Lingkungan', icon: Coins },
      { id: 'notifications', name: 'Notifikasi', icon: Bell, hasBadge: true },
    ]
  },
  {
    group: 'ADMINISTRASI',
    items: [
      { id: 'registration_approval', name: 'Registration Approval', icon: UserCheck },
      { id: 'user_management', name: 'User Management', icon: Users },
      { id: 'role_management', name: 'Role Management', icon: ShieldCheck },
    ]
  }
];

export const APP_TABS: NavItem[] = APP_MENU_GROUPS.flatMap(g => g.items);

export const VALID_TABS = APP_TABS.map(t => t.id);

export type AppTabId = string; // Since id is string in interface

export const MOBILE_PRIMARY_TABS = ['dashboard', 'monitoring', 'reclamation', 'waste'];

export const MOBILE_SECONDARY_TABS = APP_TABS.map(t => t.id).filter(id => !MOBILE_PRIMARY_TABS.includes(id));
