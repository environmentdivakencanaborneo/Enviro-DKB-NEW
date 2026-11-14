/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Menu, X, LogOut, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { GoogleSyncConfig } from '../types';
import DivaLogo from './DivaLogo';
import { APP_MENU_GROUPS, APP_TABS, MOBILE_PRIMARY_TABS } from '../data/navigation';
import { useAuth } from '../services/authService';
import { canAccessModule } from '../services/permissionService';

interface MobileNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  syncConfig: GoogleSyncConfig;
  user: any;
  setSyncModalOpen: (open: boolean) => void;
  setUserModalOpen: (open: boolean) => void;
  onLogout?: () => void;
  onOpenSearch?: () => void;
}

export default function MobileNav({
  currentTab,
  setCurrentTab,
  syncConfig,
  user,
  setSyncModalOpen,
  setUserModalOpen,
  onLogout,
  onOpenSearch,
}: MobileNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { profile } = useAuth();

  const primaryTabs = APP_TABS.filter(
    (t) => MOBILE_PRIMARY_TABS.includes(t.id) && canAccessModule(profile, t.id)
  );
  const groupedDrawerTabs = APP_MENU_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => canAccessModule(profile, item.id)),
  })).filter((g) => g.items.length > 0);

  const handleTabClick = (id: string) => {
    setCurrentTab(id);
    setMenuOpen(false);
  };

  return (
    <>
      {/* Floating Bottom Nav Bar */}
      <div
        id="mobile-nav-bar"
        className="fixed bottom-0 left-0 right-0 z-40 nav-glass no-print md:hidden px-3 py-1.5 flex justify-around items-center safe-bottom"
      >
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <motion.button
              whileTap={{ scale: 0.95 }}
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
                isActive ? 'text-neon-cyan font-bold' : 'text-text-mid hover:text-text-hi'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-neon-cyan' : 'text-text-mid'} />
              <span className="text-[10px] tracking-wide font-medium max-w-[68px] truncate">
                {tab.name}
              </span>
            </motion.button>
          );
        })}

        {/* More Menu Toggle Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setMenuOpen(true)}
          className={`min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            menuOpen ? 'text-neon-cyan font-bold' : 'text-text-mid hover:text-text-hi'
          }`}
        >
          <Menu size={20} />
          <span className="text-[10px] tracking-wide font-medium">Menu</span>
        </motion.button>
      </div>

      {/* Slide-up Bottom Drawer / Sheet Menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Scrim Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.72 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 bg-bg-0 z-[45] md:hidden no-print"
            />

            {/* Bottom Drawer Content */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-bg-1 border-t border-border-neon rounded-t-3xl max-h-[85vh] overflow-y-auto pb-12 md:hidden no-print text-text-hi shadow-glow-cyan"
            >
              {/* Header Indicator Pull bar */}
              <div className="w-12 h-1.5 bg-border-neon rounded-full mx-auto my-3.5" />

              <div className="px-6 pb-4 flex items-center justify-between border-b border-border-neon">
                <div className="flex items-center gap-2.5 dark:drop-shadow-[0_0_10px_rgba(57,255,136,0.35)]">
                  <DivaLogo variant="full" size={36} />
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setMenuOpen(false)}
                  aria-label="Tutup Menu"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-bg-2 border border-border-neon text-text-mid hover:text-text-hi rounded-full cursor-pointer transition-colors"
                >
                  <X size={18} />
                </motion.button>
              </div>

              {onOpenSearch && (
                <div className="px-5 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenSearch();
                    }}
                    className="w-full min-h-[44px] flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-bg-0 border border-border-neon text-xs text-text-mid font-medium cursor-pointer"
                  >
                    <Search className="w-4 h-4 text-neon-cyan" />
                    <span>Cari modul atau dasar regulasi...</span>
                  </button>
                </div>
              )}

              {/* Grouped Drawer Links */}
              <div className="p-5 space-y-5">
                {groupedDrawerTabs.map((group) => (
                  <div key={group.group} className="space-y-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-low px-1">
                      {group.group}
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {group.items.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = currentTab === tab.id;
                        return (
                          <motion.button
                            whileTap={{ scale: 0.96 }}
                            key={tab.id}
                            onClick={() => handleTabClick(tab.id)}
                            className={`min-h-[56px] flex flex-col justify-center items-center gap-2 p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                              isActive
                                ? 'bg-neon-cyan/10 border-neon-cyan/50 text-neon-cyan shadow-glow-cyan'
                                : 'bg-bg-2/70 border-border-subtle hover:border-border-neon text-text-mid hover:text-text-hi'
                            }`}
                          >
                            {tab.isNew && (
                              <span className="absolute top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/35 uppercase font-mono">
                                BARU
                              </span>
                            )}
                            <Icon size={20} className={isActive ? 'text-neon-cyan' : 'text-text-mid'} />
                            <span className="text-[11px] font-semibold tracking-wide text-center leading-tight">
                              {tab.name}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Settings, Sync & Profile Panel */}
              <div className="mx-5 mb-6 mt-1 p-4 bg-bg-2 border border-border-neon rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-text-low font-mono font-bold tracking-widest uppercase">
                      Sync Status
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${
                          syncConfig.syncStatus === 'synced'
                            ? 'bg-neon-green'
                            : syncConfig.syncStatus === 'syncing'
                            ? 'bg-neon-amber animate-pulse'
                            : 'bg-neon-red'
                        }`}
                      />
                      <p className="text-xs font-semibold text-text-hi capitalize">
                        {syncConfig.syncStatus === 'synced'
                          ? 'Online & Synced'
                          : syncConfig.syncStatus === 'syncing'
                          ? 'Syncing...'
                          : 'Local (Offline)'}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setMenuOpen(false);
                      setSyncModalOpen(true);
                    }}
                    className="min-h-[44px] px-4 py-2 bg-bg-0 hover:border-neon-cyan text-text-hi text-xs rounded-xl font-bold border border-border-neon cursor-pointer transition-colors"
                  >
                    CONFIG
                  </motion.button>
                </div>

                {/* Profile info */}
                <div className="pt-4 border-t border-border-subtle flex items-center justify-between gap-2">
                  <div
                    onClick={() => {
                      setMenuOpen(false);
                      setUserModalOpen(true);
                    }}
                    className="flex items-center gap-3 overflow-hidden cursor-pointer group min-h-[44px]"
                  >
                    <div className="h-9 w-9 rounded-full bg-neon-cyan/15 flex items-center justify-center text-[13px] font-bold text-neon-cyan border border-neon-cyan/35 shrink-0 font-mono">
                      {user?.name?.slice(0, 2).toUpperCase() || 'US'}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-text-hi truncate">
                        {user?.name || 'Administrator'}
                      </p>
                      <p className="text-[10px] text-text-mid font-mono truncate">
                        {user?.company || 'PT Diva Kencana Borneo'}
                      </p>
                    </div>
                  </div>

                  {onLogout && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setMenuOpen(false);
                        onLogout();
                      }}
                      className="min-h-[44px] min-w-[44px] p-2.5 neon-btn-danger rounded-xl flex items-center justify-center cursor-pointer ml-2 shrink-0"
                      title="Log Out"
                      aria-label="Keluar"
                    >
                      <LogOut size={16} />
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
