/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  Bell,
  BookOpen,
  Monitor,
  Moon,
  RefreshCw,
  Search,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { AlertNotification } from '../types';
import { BackupStatus } from '../services/backupService';
import { formatTimestamp } from '../utils/dateUtils';
import { APP_TAB_MAP } from '../data/navigation';
import type { ThemePreference } from '../utils/theme';

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
  onOpenRegulatory?: (searchKey: string) => void;
  onOpenSearch?: () => void;
  themePreference: ThemePreference;
  onChangeTheme: (pref: ThemePreference) => void;
}

export default function Header({
  backupStatus,
  alerts,
  user,
  setUserModalOpen,
  currentTab,
  hasWriteAuthority,
  onSync,
  onOpenRegulatory,
  onOpenSearch,
  themePreference,
  onChangeTheme,
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  const unreadAlerts = alerts.filter((x) => {
    if (x.createdBy === 'system') return !(x.readBy || []).includes(user?.email || '');
    return !x.read;
  });
  const unreadCount = unreadAlerts.length;
  // Badge neon-red berdenyut (pulse) HANYA untuk notifikasi Critical yang belum dibaca
  const hasUnreadCritical = unreadAlerts.some((x) => x.type === 'Critical');

  useEffect(() => {
    fetch('/api/system-info')
      .then((res) => res.json())
      .then((data) => {
        setServerOnline(Boolean(data && data.status === 'online'));
      })
      .catch(() => {
        setServerOnline(false);
      });
  }, []);

  const getTabIconType = (tab: string): MiningEnvIconType => {
    switch (tab) {
      case 'dashboard':
        return 'emblem';
      case 'monitoring':
      case 'amd_treatment':
      case 'domestic_wastewater':
        return 'water-kpl';
      case 'air_emission':
      case 'ghg_inventory':
      case 'reports':
        return 'surface-water';
      case 'reclamation':
      case 'reclamation_guarantee':
      case 'topsoil_erosion':
      case 'biodiversity':
      case 'costs':
        return 'reclamation';
      case 'waste':
        return 'tps-b3';
      case 'solid_waste':
        return 'solid-waste';
      default:
        return 'compliance';
    }
  };

  const tabMeta = APP_TAB_MAP[currentTab];
  const pageTitle = tabMeta?.name || 'Monitoring Lingkungan Pertambangan';
  const pageSubtitle = tabMeta?.subtitle || '';
  const regulationBasis = tabMeta?.regulationBasis;

  const themeOptions: { id: ThemePreference; label: string; Icon: typeof Moon }[] = [
    { id: 'dark', label: 'Neon Gelap', Icon: Moon },
    { id: 'light', label: 'Terang Lapangan', Icon: Sun },
    { id: 'system', label: 'Sistem', Icon: Monitor },
  ];

  return (
    <header
      id="main-app-header"
      className="glass-header no-print py-3 px-4 sm:px-6 lg:px-8 flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 sticky top-0 z-30 select-none"
    >
      {/* Left: Title block & Breadcrumb */}
      <div className="flex-1 min-w-[240px]">
        <div className="flex items-center gap-2 mb-1 text-[10px]">
          <span className="font-medium text-text-mid tracking-wide font-sans">
            Konsesi Tambang
          </span>
          <span className="text-text-low" aria-hidden="true">/</span>
          <span className="font-bold text-neon-green tracking-wider uppercase font-mono">
            {user?.company || 'PT DIVA KENCANA BORNEO'}
          </span>
        </div>

        <div className="flex items-start sm:items-center gap-3">
          <div className="p-1.5 rounded-xl bg-bg-2 border border-border-neon shrink-0 shadow-sm">
            <MiningEnvIcon type={getTabIconType(currentTab)} size={28} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[16px] sm:text-[18px] font-bold tracking-tight text-text-hi font-heading leading-tight truncate">
              {pageTitle}
            </h2>
            {pageSubtitle && (
              <p className="text-[11px] text-text-mid truncate mt-0.5">{pageSubtitle}</p>
            )}

            {/* Status, Role & Regulation Chips */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 text-[10px] text-neon-cyan font-bold font-mono whitespace-nowrap">
                <ShieldCheck className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>{user?.role || 'User'}</span>
                <span aria-hidden="true">·</span>
                <span>{hasWriteAuthority ? 'Otoritas Penuh' : 'Baca Saja'}</span>
              </span>

              {regulationBasis && (
                <button
                  type="button"
                  onClick={() => onOpenRegulatory?.(tabMeta?.regulationSearchKey ?? '')}
                  title="Lihat dasar regulasi terkait di Regulatory Watch"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-neon-violet/12 hover:bg-neon-violet/20 border border-neon-violet/35 text-[10px] text-neon-violet font-semibold transition-colors cursor-pointer max-w-xs truncate whitespace-nowrap"
                >
                  <BookOpen className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">Dasar Regulasi: {regulationBasis}</span>
                </button>
              )}

              <span
                className="hidden xl:inline-flex items-center gap-1.5 text-[10px] text-text-mid font-mono uppercase tracking-wider px-1.5"
                title="Koneksi Sistem"
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${
                    serverOnline === true
                      ? 'bg-neon-green'
                      : serverOnline === false
                      ? 'bg-neon-amber'
                      : 'bg-text-low'
                  }`}
                />
                <span>{serverOnline === true ? 'SYS LIVE' : serverOnline === false ? 'LOCAL' : 'SYNC...'}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Search, 3-Option Theme Toggle, Sync, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap sm:flex-nowrap justify-end">
        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            title="Cari Modul / Regulasi (Ctrl+K)"
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border border-border-neon bg-bg-2/80 hover:border-neon-cyan text-xs font-medium text-text-mid hover:text-text-hi cursor-pointer transition-colors whitespace-nowrap shrink-0"
          >
            <Search className="h-3.5 w-3.5 text-neon-cyan" aria-hidden="true" />
            <span className="hidden xl:inline">Cari Menu</span>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-0 border border-border-subtle text-text-mid">
              ⌘K
            </kbd>
          </button>
        )}

        {/* 3-Option Theme Mode Toggle */}
        <div
          role="group"
          aria-label="Pilih mode tampilan"
          className="inline-flex items-center p-1 rounded-xl bg-bg-2 border border-border-neon shrink-0"
        >
          {themeOptions.map(({ id, label, Icon }) => {
            const active = themePreference === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChangeTheme(id)}
                aria-pressed={active}
                title={`Mode ${label}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/40 shadow-sm'
                    : 'text-text-mid hover:text-text-hi border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden xl:inline">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Google Sync state connector */}
        <button
          id="header-sync-trigger"
          onClick={onSync}
          disabled={backupStatus.status === 'syncing'}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all whitespace-nowrap shrink-0 ${
            backupStatus.status === 'synced'
              ? 'bg-neon-green/10 border-neon-green/35 text-neon-green hover:bg-neon-green/15'
              : backupStatus.status === 'syncing'
              ? 'bg-neon-amber/10 border-neon-amber/35 text-neon-amber'
              : 'bg-bg-2 border-border-neon text-text-mid hover:text-text-hi hover:border-neon-cyan'
          }`}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${backupStatus.status === 'syncing' ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span className="hidden md:inline font-sans">
            {backupStatus.status === 'synced'
              ? 'Google Synced'
              : backupStatus.status === 'syncing'
              ? 'Menyinkronkan...'
              : 'Google Sync'}
          </span>
        </button>

        {/* Notifications and Alert center */}
        <div className="relative">
          <button
            id="notification-bell-trigger"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label={`Notifikasi (${unreadCount} belum dibaca)`}
            className="p-2.5 rounded-xl bg-bg-2 border border-border-neon hover:border-neon-cyan hover:text-neon-cyan transition-all text-text-mid relative cursor-pointer"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                className={`absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1 text-[10px] font-bold font-mono rounded-full flex items-center justify-center ${
                  hasUnreadCritical
                    ? 'bg-neon-red text-white animate-critical-pulse shadow-glow-red'
                    : 'bg-neon-cyan text-[#04121A]'
                }`}
              >
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
                className="absolute right-0 mt-3 w-80 sm:w-96 glass-panel rounded-2xl p-4 overflow-hidden z-50 animate-fade-in text-text-hi shadow-glow-cyan"
              >
                <div className="flex items-center justify-between pb-3 border-b border-border-neon">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-mid font-heading">
                    Notifikasi Terbaru ({unreadCount})
                  </h4>
                  <button
                    id="header-notif-view-all"
                    onClick={() => {
                      setShowNotifications(false);
                      window.location.hash = 'notifications';
                    }}
                    className="text-[11px] text-neon-cyan hover:underline cursor-pointer font-bold"
                  >
                    Buka semua
                  </button>
                </div>
                <div className="divide-y divide-border-subtle max-h-80 overflow-y-auto mt-2 pr-1">
                  {alerts.length === 0 ? (
                    <p className="text-xs text-text-mid text-center py-6">
                      Tidak ada notifikasi kepatuhan terbaru.
                    </p>
                  ) : (
                    alerts.slice(0, 4).map((alert) => {
                      const isRead =
                        alert.createdBy === 'system'
                          ? (alert.readBy || []).includes(user?.email || '')
                          : alert.read;
                      return (
                        <div
                          key={alert.id}
                          className={`py-3 flex flex-col gap-1 text-left ${isRead ? 'opacity-65' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono ${
                                alert.type === 'Critical'
                                  ? 'badge-exceeded'
                                  : alert.type === 'Warning'
                                  ? 'badge-warning'
                                  : 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30'
                              }`}
                            >
                              {alert.category}
                            </span>
                            <span className="text-[10px] text-text-mid font-mono tabular-nums">
                              {formatTimestamp(alert.timestamp, 'id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <h5 className={`text-[12px] font-bold leading-snug ${isRead ? 'text-text-mid' : 'text-text-hi'}`}>
                              {alert.title}
                            </h5>
                            {!isRead && alert.type === 'Critical' && (
                              <span
                                aria-hidden="true"
                                className="h-2 w-2 shrink-0 bg-neon-red rounded-full animate-critical-pulse"
                              />
                            )}
                          </div>
                          <p className="text-[11px] line-clamp-2 leading-relaxed text-text-mid">
                            {alert.message}
                          </p>
                        </div>
                      );
                    })
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
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg-2 border border-border-neon hover:border-neon-cyan cursor-pointer transition-all shrink-0"
        >
          <div className="h-6 w-6 rounded-full bg-neon-cyan/15 border border-neon-cyan/40 flex items-center justify-center text-neon-cyan font-bold text-xs font-mono">
            {user?.name?.slice(0, 1).toUpperCase() || 'U'}
          </div>
          <span className="text-xs font-semibold text-text-hi hidden md:inline truncate max-w-[110px]">
            {user?.name?.split(' ')[0] || 'User'}
          </span>
        </button>
      </div>
    </header>
  );
}
