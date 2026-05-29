/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  Bell, 
  CloudCheck, 
  CloudLightning, 
  RefreshCw, 
  User, 
  VolumeX, 
  Volume2, 
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { GoogleSyncConfig, AlertNotification } from '../types';
import { runGoogleSync } from '../utils/googleSync';

interface HeaderProps {
  syncConfig: GoogleSyncConfig;
  alerts: AlertNotification[];
  user: any;
  setSyncModalOpen: (open: boolean) => void;
  setUserModalOpen: (open: boolean) => void;
  onRefresh: () => void;
  currentTab: string;
}

export default function Header({ 
  syncConfig, 
  alerts, 
  user,
  setSyncModalOpen,
  setUserModalOpen,
  onRefresh,
  currentTab
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = alerts.filter(x => !x.read).length;

  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'Dashboard Lingkungan & Compliance';
      case 'monitoring': return 'Pemantauan Air Limbah & Curah Hujan';
      case 'reclamation': return 'Reklamasi & Nursery Management';
      case 'waste': return 'Manajemen Limbah Bahan Berbahaya & Beracun (B3)';
      case 'reports': return 'Generasi Laporan & Kinerja Kepatuhan';
      case 'documents': return 'Manajemen AMDAL, UKL-UPL & Perizinan';
      case 'notifications': return 'Histori Notifikasi & Kepatuhan';
      default: return 'Monitoring Lingkungan Pertambangan';
    }
  };

  const handleSyncClick = async () => {
    if (!syncConfig.clientId || !syncConfig.spreadsheetId) {
      setSyncModalOpen(true);
      return;
    }
    await runGoogleSync();
    onRefresh();
  };

  return (
    <header 
      id="main-app-header"
      className="glass-header py-3.5 px-6 flex items-center justify-between sticky top-0 z-30 select-none"
    >
      {/* Title block */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-white font-sans mr-2">
          {getPageTitle(currentTab)}
        </h2>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-slate-400">Grup Konsesi:</span>
          <span className="text-[10px] text-emerald-400 font-semibold uppercase">{user?.company || 'PT DIVA KENCANA BORNEO'}</span>
        </div>
      </div>

      {/* Action buttons list */}
      <div className="flex items-center gap-3">
        {/* Google Sync state connector */}
        <button
          id="header-sync-trigger"
          onClick={handleSyncClick}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
            syncConfig.syncStatus === 'synced' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
              : syncConfig.syncStatus === 'syncing'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
          }`}
          disabled={syncConfig.syncStatus === 'syncing'}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncConfig.syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">
            {syncConfig.syncStatus === 'synced' ? 'Google Synced' :
             syncConfig.syncStatus === 'syncing' ? 'Menyingkronkan...' : 'Offline Sync'}
          </span>
        </button>

        {/* Notifications and Alert center */}
        <div className="relative">
          <button
            id="notification-bell-trigger"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all text-slate-300 relative cursor-pointer"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 bg-red-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center animate-bounce shadow-lg shadow-red-500/20">
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
                className="absolute right-0 mt-3 w-80 sm:w-96 glass-panel rounded-2xl shadow-2xl p-4 overflow-hidden z-50 animate-fade-in text-slate-200"
              >
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Notifikasi Terbaru ({unreadCount})</h4>
                  <button 
                    id="header-notif-view-all"
                    onClick={() => {
                      setShowNotifications(false);
                      // Switch to tab
                      window.location.hash = 'notifications';
                    }}
                    className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                  >
                    Buka semua
                  </button>
                </div>
                <div className="divide-y divide-white/10 max-h-80 overflow-y-auto mt-2">
                  {alerts.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">Tidak ada notifikasi kepatuhan terbaru.</p>
                  ) : (
                    alerts.slice(0, 4).map(alert => (
                      <div key={alert.id} className={`py-3 flex flex-col gap-1 text-left ${alert.read ? 'opacity-65' : ''}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] px-2 py-0.5 rounded font-bold font-mono ${
                            alert.type === 'Critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            alert.type === 'Warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                            {alert.category}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {new Date(alert.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <h5 className="text-[12px] font-semibold text-slate-100">{alert.title}</h5>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{alert.message}</p>
                      </div>
                    ))
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
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white cursor-pointer transition-all"
        >
          <div className="h-6 w-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <User className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-semibold text-slate-300 hidden md:inline truncate max-w-[120px]">
            {user?.name?.split(' ')[0] || 'User'}
          </span>
        </button>
      </div>
    </header>
  );
}
