/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  LayoutDashboard, 
  Droplet, 
  Sprout, 
  Trash2, 
  FileText, 
  FileLock, 
  Bell, 
  CloudLightning,
  ChevronLeft,
  ChevronRight,
  HardHat,
  RefreshCw
} from 'lucide-react';
import { GoogleSyncConfig } from '../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  syncConfig: GoogleSyncConfig;
  user: any;
  setSyncModalOpen: (open: boolean) => void;
}

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  syncConfig, 
  user,
  setSyncModalOpen
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'monitoring', name: 'Pemantauan Lingkungan', icon: Droplet },
    { id: 'reclamation', name: 'Reklamasi Tambang', icon: Sprout },
    { id: 'waste', name: 'Limbah B3 TPS', icon: Trash2 },
    { id: 'reports', name: 'Laporan Tambang', icon: FileText },
    { id: 'documents', name: 'Dokumen & Perizinan', icon: FileLock },
    { id: 'notifications', name: 'Notifikasi & Alerts', icon: Bell },
  ];

  return (
    <aside 
      id="sidebar-container"
      className={`glass-aside text-slate-200 transition-all duration-300 flex flex-col justify-between select-none h-screen sticky top-0 md:relative z-40 ${
        collapsed ? 'w-16' : 'w-72'
      }`}
    >
      {/* Upper Brand Section */}
      <div>
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          {!collapsed && (
            <div className="flex items-center gap-2.5 animate-fade-in">
              <div className="bg-emerald-500 text-slate-950 p-2 rounded-lg font-bold shadow-lg shadow-emerald-500/10">
                <HardHat className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-white font-sans">
                  ENV-COAL <span className="text-emerald-500 font-extrabold">PRO</span>
                </h1>
                <p className="text-[10px] text-slate-500 font-mono tracking-wider">INDONESIA COMPLIANCE</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="bg-emerald-500 text-slate-950 p-2 rounded-lg font-bold mx-auto">
              <HardHat className="h-5 w-5" />
            </div>
          )}
          <button 
            id="sidebar-toggle-btn"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:block p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
 
        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5 flex-1">
          {menuItems.map(item => {
            const IconComponent = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                id={`sidebar-link-${item.id}`}
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 group text-left cursor-pointer ${
                  isActive 
                    ? 'bg-white/10 text-emerald-400 border border-white/10 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
                }`}
              >
                <IconComponent className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-105 ${
                  isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'
                }`} />
                {!collapsed && (
                  <span className="text-sm font-medium tracking-wide">
                    {item.name}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Database/Sync widget */}
      <div className="p-3 border-t border-white/5">
        {!collapsed ? (
          <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">Google Sync</span>
              <button 
                id="sidebar-sync-settings"
                onClick={() => setSyncModalOpen(true)}
                className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
              >
                Atur
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full animate-pulse ${
                syncConfig.syncStatus === 'synced' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                syncConfig.syncStatus === 'syncing' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-red-500'
              }`} />
              <p className="text-xs font-medium text-slate-300 capitalize">
                {syncConfig.syncStatus === 'synced' ? 'Terhubung & Sinkron' :
                 syncConfig.syncStatus === 'syncing' ? 'Menyingkronkan...' : 'Mode Lokal (Offline)'}
              </p>
            </div>
            {syncConfig.lastSynced && (
              <p className="text-[9px] text-slate-500 mt-1.5 font-mono">
                Terakhir: {new Date(syncConfig.lastSynced).toLocaleString('id-ID')}
              </p>
            )}
            
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 text-slate-400">
              <div className="h-7 w-7 rounded-full bg-white/10 border border-white/5 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                {user?.name?.slice(0, 2).toUpperCase() || 'AD'}
              </div>
              <div className="overflow-hidden">
                <p className="text-[11px] font-semibold text-slate-300 truncate">{user?.name || 'User Tambang'}</p>
                <p className="text-[9px] text-slate-500 truncate">{user?.company || 'PT Diva Kencana'}</p>
              </div>
            </div>
          </div>
        ) : (
          <button 
            id="sidebar-quick-config-btn"
            onClick={() => setSyncModalOpen(true)}
            className="mx-auto w-10 h-10 bg-white/5 rounded-xl border border-white/5 flex items-center justify-center hover:border-emerald-500/50 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
            title="Kelola Google Sync"
          >
            <RefreshCw className={`h-4.5 w-4.5 ${syncConfig.syncStatus === 'syncing' ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        )}
      </div>
    </aside>
  );
}
