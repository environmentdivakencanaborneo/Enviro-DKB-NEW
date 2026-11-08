/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Bell, 
  RefreshCw, 
  User 
} from 'lucide-react';
import { AlertNotification } from '../types';
import { BackupStatus } from '../services/backupService';
import { formatTimestamp } from '../utils/dateUtils';

import MiningEnvIcon, { MiningEnvIconType } from './MiningEnvIcon';

interface HeaderProps {
  backupStatus: BackupStatus;
  alerts: AlertNotification[];
  user: any;
  setSyncModalOpen: (open: boolean) => void;
  setUserModalOpen: (open: boolean) => void;
  currentTab: string;
  hasWriteAuthority: boolean;
  onSync: () => void;
}

export default function Header({ 
  backupStatus, 
  alerts, 
  user,
  setSyncModalOpen,
  setUserModalOpen,
  currentTab,
  hasWriteAuthority,
  onSync
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const unreadCount = alerts.filter(x => {
    if (x.createdBy === 'system') return !(x.readBy || []).includes(user?.email || '');
    return !x.read;
  }).length;

  useEffect(() => {
    fetch('/api/system-info')
      .then(res => res.json())
      .then(data => {
        if (data && data.status === 'online') {
          setServerOnline(true);
        } else {
          setServerOnline(false);
        }
      })
      .catch(() => {
        setServerOnline(false);
      });
  }, []);

  const getTabIconType = (tab: string): MiningEnvIconType => {
    switch (tab) {
      case 'dashboard': return 'emblem';
      case 'monitoring': return 'water-kpl';
      case 'reclamation': return 'reclamation';
      case 'waste': return 'tps-b3';
      case 'solid_waste': return 'solid-waste';
      case 'reports': return 'surface-water';
      case 'costs': return 'reclamation';
      case 'documents':
      case 'regulatory_watch':
      case 'compliance_matrix':
      case 'incidents':
      case 'findings':
      case 'executive':
      case 'notifications':
      case 'registration_approval':
      case 'user_management':
      case 'role_management':
      default:
        return 'compliance';
    }
  };

  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'Dashboard Lingkungan & Compliance';
      case 'executive': return 'Dashboard Eksekutif & ESG Tambang';
      case 'monitoring': return 'Pemantauan Air Limbah & Curah Hujan';
      case 'reclamation': return 'Reklamasi & Nursery Management';
      case 'waste': return 'Manajemen Limbah Bahan Berbahaya & Beracun (B3)';
      case 'solid_waste': return 'Pengolahan Sampah Non-B3 — Permen LH 7/2025';
      case 'documents': return 'Manajemen AMDAL, UKL-UPL & Perizinan';
      case 'regulatory_watch': return 'Pemantau Regulasi Lingkungan Tambang';
      case 'compliance_matrix': return 'Matriks Pemantauan RKL-RPL';
      case 'incidents': return 'Insiden Lingkungan & Kedaruratan';
      case 'findings': return 'Temuan Audit Lingkungan & CAPA';
      case 'reports': return 'Generasi Laporan & Kinerja Kepatuhan';
      case 'costs': return 'Anggaran & Realisasi Biaya Lingkungan Hidup';
      case 'notifications': return 'Histori Notifikasi & Peringatan Dini';
      case 'registration_approval': return 'Persetujuan Registrasi Karyawan';
      case 'user_management': return 'Manajemen Pengguna & Akun Enterprise';
      case 'role_management': return 'Matriks Otoritas & Peranan (RBAC)';
      default: return 'Monitoring Lingkungan Pertambangan';
    }
  };

  const handleSyncClick = () => {
    onSync();
  };

  return (
    <header 
      id="main-app-header"
      className="bg-white border-b border-[#E6ECE6] py-3.5 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 select-none shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
    >
      {/* Title block & Breadcrumb */}
      <div className="flex-1 min-w-0 pr-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-medium text-[#6D7B73] tracking-wide font-sans">
            Konsesi Tambang
          </span>
          <span className="text-[#E6ECE6] text-[10px] font-light">/</span>
          <span className="text-[10px] font-bold text-[#4D7C5A] tracking-wider uppercase">
            {user?.company || 'PT DIVA KENCANA BORNEO'}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/80 shrink-0 shadow-sm">
            <MiningEnvIcon type={getTabIconType(currentTab)} size={28} />
          </div>
          <div>
            <h2 className="text-[17px] sm:text-[19px] font-bold tracking-tight text-[#23312B] font-heading leading-tight">
              {getPageTitle(currentTab)}
            </h2>
            
            {/* Clean compact status pill bar */}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#3FA66B]/10 border border-[#3FA66B]/25 text-[10px] text-[#2F5A46] font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3FA66B] animate-pulse"></span>
                LINGKUNGAN: OPTIMAL
              </div>

              <span className="text-slate-300 text-[10px] hidden sm:inline">•</span>

              <div className="inline-flex items-center gap-1">
                {hasWriteAuthority ? (
                  <span className="px-2 py-0.5 rounded-full bg-[#4D7C5A]/10 border border-[#4D7C5A]/20 text-[9px] text-[#2F5A46] font-bold tracking-wide uppercase font-sans">
                    Otoritas Penuh
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-[#E2A43B]/10 border border-[#E2A43B]/20 text-[9px] text-[#8F5E13] font-bold tracking-wide uppercase font-sans">
                    Akses Baca Saja
                  </span>
                )}
              </div>

              <span className="text-slate-300 text-[10px] hidden sm:inline">•</span>

              <div className="inline-flex items-center gap-1.5" title="Koneksi Sistem">
                <span className={`h-1.5 w-1.5 rounded-full ${serverOnline === true ? 'bg-[#3FA66B]' : serverOnline === false ? 'bg-[#E2A43B]' : 'bg-[#E6ECE6]'}`} />
                <span className="text-[9px] text-[#6D7B73] font-manrope font-bold tracking-wider uppercase">
                  {serverOnline === true ? 'SYS LIVE' : serverOnline === false ? 'LOCAL' : 'CONNECTING...'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons list */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Google Sync state connector */}
        <button
          id="header-sync-trigger"
          onClick={handleSyncClick}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all duration-200 ${
            backupStatus.status === 'synced' 
              ? 'bg-[#3FA66B]/8 border-[#3FA66B]/20 text-[#2F5A46] hover:bg-[#3FA66B]/15 hover:shadow-sm' 
              : backupStatus.status === 'syncing'
              ? 'bg-[#E2A43B]/8 border-[#E2A43B]/20 text-[#8F5E13]'
              : 'bg-white border-[#E6ECE6] text-[#6D7B73] hover:bg-[#F5F6F2]'
          }`}
          disabled={backupStatus.status === 'syncing'}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${backupStatus.status === 'syncing' ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline font-sans">
            {backupStatus.status === 'synced' ? 'Google Synced' :
             backupStatus.status === 'syncing' ? 'Menyinkronkan...' : 'Google Sync'}
          </span>
        </button>

        {/* Notifications and Alert center */}
        <div className="relative">
          <button
            id="notification-bell-trigger"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 rounded-xl bg-white border border-[#E6ECE6] hover:bg-[#F5F6F2] hover:text-[#4D7C5A] transition-all text-[#6D7B73] relative cursor-pointer"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 bg-[#D95C5C] text-[10px] font-bold text-white rounded-full flex items-center justify-center animate-bounce-short shadow-md shadow-[#D95C5C]/20">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Quick Dropdown notifications */}
          {showNotifications && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowNotifications(false)} 
              />
              <div 
                id="notifications-popover"
                className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-[#E6ECE6] rounded-2xl shadow-xl p-4 overflow-hidden z-50 animate-fade-in text-[#23312B]"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#E6ECE6]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#6D7B73]">Notifikasi Terbaru ({unreadCount})</h4>
                  <button 
                    id="header-notif-view-all"
                    onClick={() => {
                      setShowNotifications(false);
                      window.location.hash = 'notifications';
                    }}
                    className="text-[11px] text-[#4D7C5A] hover:underline cursor-pointer font-bold"
                  >
                    Buka semua
                  </button>
                </div>
                <div className="divide-y divide-[#E6ECE6] max-h-80 overflow-y-auto mt-2 pr-1">
                  {alerts.length === 0 ? (
                    <p className="text-xs text-[#6D7B73] text-center py-6">Tidak ada notifikasi kepatuhan terbaru.</p>
                  ) : (
                    alerts.slice(0, 4).map(alert => {
                      const isRead = alert.createdBy === 'system' ? (alert.readBy || []).includes(user?.email || '') : alert.read;
                      return (
                      <div key={alert.id} className={`py-3 flex flex-col gap-1 text-left ${isRead ? 'opacity-60' : ''}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] px-2 py-0.5 rounded font-bold font-manrope ${
                            alert.type === 'Critical' ? 'bg-[#D95C5C]/10 text-[#9C3333] border border-[#D95C5C]/20' :
                            alert.type === 'Warning' ? 'bg-[#E2A43B]/10 text-[#8F5E13] border border-[#E2A43B]/20' :
                            'bg-[#5C8DBA]/10 text-[#2B547E] border border-[#5C8DBA]/20'
                          }`}>
                            {alert.category}
                          </span>
                          <span className="text-[9px] text-[#6D7B73] font-manrope">
                            {formatTimestamp(alert.timestamp, 'id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <h5 className={`text-[12px] font-bold leading-snug ${isRead ? 'text-[#6D7B73]' : 'text-[#23312B]'}`}>{alert.title}</h5>
                          {!isRead && (
                            <span className="h-1.5 w-1.5 bg-[#D95C5C] rounded-full shadow-[0_0_5px_rgba(217,92,92,0.6)]"></span>
                          )}
                        </div>
                        <p className={`text-[11px] line-clamp-2 leading-relaxed text-[#6D7B73]`}>{alert.message}</p>
                      </div>
                    )})
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User profile dropdown button */}
        <button
          id="profile-header-trigger"
          onClick={() => setUserModalOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#E6ECE6] hover:bg-[#F5F6F2] cursor-pointer transition-all duration-200"
        >
          <div className="h-6 w-6 rounded-full bg-[#DCE5DA] border border-[#E6ECE6] flex items-center justify-center text-[#2F5A46] font-bold text-xs">
            {user?.name?.slice(0,1).toUpperCase() || 'U'}
          </div>
          <span className="text-xs font-semibold text-[#23312B] hidden md:inline truncate max-w-[120px]">
            {user?.name?.split(' ')[0] || 'User'}
          </span>
        </button>
      </div>
    </header>
  );
}

