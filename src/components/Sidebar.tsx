/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  RefreshCw,
  Search,
} from 'lucide-react';
import { GoogleSyncConfig } from '../types';
import DivaLogo from './DivaLogo';
import MiningEnvIcon from './MiningEnvIcon';
import { APP_MENU_GROUPS } from '../data/navigation';
import { useAuth } from '../services/authService';
import { canAccessModule } from '../services/permissionService';
import { getScopedKey } from '../utils/googleSync';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  syncConfig: GoogleSyncConfig;
  user: any;
  setSyncModalOpen: (open: boolean) => void;
  onLogout?: () => void;
  onOpenSearch?: () => void;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  syncConfig,
  user,
  setSyncModalOpen,
  onLogout,
  onOpenSearch,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { profile } = useAuth();
  const storageKey = getScopedKey('dem_sidebar_groups');

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore storage errors
    }
    return {
      'RINGKASAN & KINERJA': true,
      'PERSETUJUAN & KEPATUHAN': true,
    };
  });

  // Auto-expand the group containing the active tab
  useEffect(() => {
    const activeGroup = APP_MENU_GROUPS.find((g) => g.items.some((i) => i.id === currentTab));
    if (activeGroup && !expandedGroups[activeGroup.group]) {
      setExpandedGroups((prev) => {
        const next = { ...prev, [activeGroup.group]: true };
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    }
  }, [currentTab, storageKey]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const next = { ...prev, [groupName]: !prev[groupName] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const filteredGroups = APP_MENU_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccessModule(profile, item.id)),
  })).filter((group) => group.items.length > 0);

  return (
    <aside
      id="sidebar-container"
      className={`glass-aside no-print transition-all duration-300 ease-in-out hidden md:flex flex-col justify-between select-none h-screen sticky top-0 z-40 ${
        collapsed ? 'w-[74px]' : 'w-72'
      }`}
    >
      {/* Upper Brand Section */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="flex items-center justify-between p-[18px] border-b border-border-neon relative shrink-0">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 animate-fade-in pl-1">
              <div className="dark:drop-shadow-[0_0_12px_rgba(57,255,136,0.35)]">
                <DivaLogo variant="full" size={38} />
              </div>
              <div
                className="p-1 rounded-lg bg-bg-2 border border-border-neon shadow-sm"
                title="Diva Enviro Monitor — Coal Mining Eco-Emblem"
              >
                <MiningEnvIcon type="emblem" size={26} />
              </div>
            </div>
          ) : (
            <div className="mx-auto flex flex-col items-center justify-center gap-1.5 animate-fade-in">
              <div className="dark:drop-shadow-[0_0_10px_rgba(57,255,136,0.35)]">
                <DivaLogo variant="icon" size={26} />
              </div>
              <MiningEnvIcon type="emblem" size={22} />
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.9 }}
            id="sidebar-toggle-btn"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex items-center justify-center absolute -right-3 top-6 h-6 w-6 bg-bg-2 border border-border-neon rounded-full hover:border-neon-cyan text-text-mid hover:text-neon-cyan transition-colors cursor-pointer z-50 shadow-sm"
            title={collapsed ? 'Expand Menu' : 'Collapse Menu'}
            aria-label={collapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </motion.button>
        </div>

        {/* Quick Search Trigger */}
        {onOpenSearch && (
          <div className="px-4 pt-3">
            {!collapsed ? (
              <button
                type="button"
                onClick={onOpenSearch}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-bg-0/80 hover:bg-bg-2 border border-border-neon text-text-mid hover:text-text-hi text-xs transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2 truncate">
                  <Search className="w-3.5 h-3.5 text-neon-cyan shrink-0" />
                  <span className="truncate">Cari modul / regulasi...</span>
                </span>
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-2 border border-border-subtle text-text-mid shrink-0">
                  ⌘K
                </kbd>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenSearch}
                title="Cari Modul / Regulasi (Ctrl+K)"
                aria-label="Cari Modul / Regulasi"
                className="w-full flex items-center justify-center py-2 rounded-xl bg-bg-0/80 hover:bg-bg-2 border border-border-neon text-neon-cyan cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Navigation Items */}
        <nav className="p-3.5 space-y-3 mt-1 flex-1 pb-4" aria-label="Menu Utama">
          {filteredGroups.map((group) => {
            const isExpanded = collapsed || !!expandedGroups[group.group];
            return (
              <div key={group.group} className="space-y-1">
                {!collapsed && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.group)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-[10px] font-semibold tracking-[0.16em] text-text-low hover:text-text-mid uppercase font-sans cursor-pointer rounded-lg hover:bg-bg-2/60 transition-colors"
                  >
                    <span className="truncate text-left">{group.group}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-75" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-75" />
                    )}
                  </button>
                )}
                {isExpanded &&
                  group.items.map((item) => {
                    const IconComponent = item.icon;
                    const isActive = currentTab === item.id;
                    return (
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        id={`sidebar-link-${item.id}`}
                        key={item.id}
                        onClick={() => setCurrentTab(item.id)}
                        title={collapsed ? item.name : item.subtitle}
                        className={`w-full flex items-center ${
                          collapsed ? 'justify-center px-2' : 'justify-start px-3'
                        } gap-2.5 py-2 rounded-xl transition-all duration-150 group text-left cursor-pointer relative overflow-hidden ${
                          isActive
                            ? 'bg-neon-cyan/10 text-text-hi font-semibold border border-neon-cyan/35 shadow-[0_0_16px_rgba(0,240,255,0.14)]'
                            : 'text-text-mid border border-transparent hover:bg-bg-2/80 hover:text-text-hi'
                        }`}
                      >
                        {/* Active 3px neon-cyan left bar */}
                        {isActive && (
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-neon-cyan shadow-[0_0_10px_var(--theme-neon-cyan)]"
                          />
                        )}

                        <div className="relative flex items-center justify-center shrink-0">
                          <IconComponent
                            className={`h-[17px] w-[17px] transition-colors duration-150 stroke-[1.75] ${
                              isActive
                                ? 'text-neon-cyan'
                                : 'text-text-mid group-hover:text-neon-cyan'
                            }`}
                          />
                          {item.hasBadge && (
                            <span
                              aria-hidden="true"
                              className="absolute -top-1 -right-1 h-2 w-2 bg-neon-red rounded-full shadow-glow-red"
                            />
                          )}
                        </div>

                        {!collapsed && (
                          <>
                            <span
                              className={`text-[12.5px] leading-snug tracking-wide font-sans flex-1 truncate ${
                                isActive ? 'font-semibold text-text-hi' : 'font-medium text-text-mid group-hover:text-text-hi'
                              }`}
                            >
                              {item.name}
                            </span>
                            {item.isNew && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/35 uppercase shrink-0 font-mono">
                                BARU
                              </span>
                            )}
                          </>
                        )}
                      </motion.button>
                    );
                  })}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Database/Sync & Profile widget */}
      <div className="p-3.5 border-t border-border-neon shrink-0">
        {!collapsed ? (
          <div className="bg-bg-2/80 p-3.5 rounded-2xl border border-border-neon space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-text-low">
                  Sync Status
                </span>
                <button
                  id="sidebar-sync-settings"
                  onClick={() => setSyncModalOpen(true)}
                  className="text-[10px] font-bold text-neon-cyan hover:underline tracking-wider transition-colors cursor-pointer uppercase font-mono"
                >
                  CONFIG
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${
                    syncConfig.syncStatus === 'synced'
                      ? 'bg-neon-green'
                      : syncConfig.syncStatus === 'syncing'
                      ? 'bg-neon-amber animate-pulse'
                      : 'bg-neon-red'
                  }`}
                />
                <p className="text-xs font-medium text-text-hi">
                  {syncConfig.syncStatus === 'synced'
                    ? 'Online & Synced'
                    : syncConfig.syncStatus === 'syncing'
                    ? 'Syncing data...'
                    : 'Local / Offline'}
                </p>
              </div>
              {syncConfig.lastSynced && (
                <p className="text-[10px] text-text-mid pl-4 font-mono tabular-nums mt-0.5 truncate">
                  Last: {new Date(syncConfig.lastSynced).toLocaleString('id-ID')}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-border-subtle flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="h-8 w-8 rounded-full bg-neon-cyan/15 border border-neon-cyan/35 flex items-center justify-center text-xs font-bold text-neon-cyan shrink-0 font-mono">
                  {user?.name?.slice(0, 2).toUpperCase() || 'US'}
                </div>
                <div className="overflow-hidden flex flex-col justify-center">
                  <p className="text-[12.5px] font-semibold text-text-hi truncate leading-tight">
                    {user?.name || 'Administrator'}
                  </p>
                  <span className="text-[9px] text-neon-green font-mono uppercase tracking-wider font-semibold truncate mt-0.5">
                    {user?.role || 'ENV LEAD'}
                  </span>
                </div>
              </div>

              {onLogout && (
                <button
                  id="sidebar-logout-btn"
                  onClick={onLogout}
                  className="p-2 bg-bg-0 hover:bg-neon-red/15 text-text-mid hover:text-neon-red border border-border-subtle hover:border-neon-red/40 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0"
                  title="Keluar dari Panel"
                  aria-label="Keluar dari Panel"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 items-center">
            <button
              id="sidebar-quick-config-btn"
              onClick={() => setSyncModalOpen(true)}
              className="w-10 h-10 bg-bg-2 rounded-xl border border-border-neon flex items-center justify-center hover:border-neon-cyan text-text-mid hover:text-neon-cyan transition-colors cursor-pointer"
              title="Google Sync Settings"
              aria-label="Pengaturan Google Sync"
            >
              <RefreshCw
                className={`h-4 w-4 ${syncConfig.syncStatus === 'syncing' ? 'animate-spin text-neon-amber' : ''}`}
              />
            </button>

            {onLogout && (
              <button
                id="sidebar-quick-logout-btn"
                onClick={onLogout}
                className="w-10 h-10 bg-bg-2 hover:bg-neon-red/15 border border-border-subtle hover:border-neon-red/40 text-text-mid hover:text-neon-red rounded-xl flex items-center justify-center transition-all cursor-pointer"
                title="Keluar"
                aria-label="Keluar"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
