/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  Menu, 
  X,
  LogOut, 
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { GoogleSyncConfig } from '../types';
import DivaLogo from './DivaLogo';
import { APP_TABS, MOBILE_PRIMARY_TABS, MOBILE_SECONDARY_TABS } from '../data/navigation';

interface MobileNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  syncConfig: GoogleSyncConfig;
  user: any;
  setSyncModalOpen: (open: boolean) => void;
  setUserModalOpen: (open: boolean) => void;
  onLogout?: () => void;
}

export default function MobileNav({
  currentTab,
  setCurrentTab,
  syncConfig,
  user,
  setSyncModalOpen,
  setUserModalOpen,
  onLogout
}: MobileNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const primaryTabs = APP_TABS.filter(t => MOBILE_PRIMARY_TABS.includes(t.id));
  const secondaryTabs = APP_TABS.filter(t => MOBILE_SECONDARY_TABS.includes(t.id));

  const handleTabClick = (id: string) => {
    setCurrentTab(id);
    setMenuOpen(false);
  };

  return (
    <>
      {/* Floating Bottom Nav Bar */}
      <div 
        id="mobile-nav-bar"
        className="fixed bottom-0 left-0 right-0 z-40 nav-glass border-t border-slate-200/50 md:hidden px-4 py-2.5 flex justify-around items-center shadow-[0_-8px_30px_rgba(0,0,0,0.06)] safe-bottom"
      >
        {primaryTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <motion.button whileTap={{ scale: 0.95 }}
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-300 cursor-pointer ${
                isActive ? 'text-emerald-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-emerald-600' : 'text-slate-500'} />
              <span className="text-[10px] tracking-wide font-medium">{tab.name}</span>
            </motion.button>
          );
        })}

        {/* More Menu Toggle Button */}
        <motion.button whileTap={{ scale: 0.95 }}
          onClick={() => setMenuOpen(true)}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-300 cursor-pointer ${
            menuOpen ? 'text-emerald-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-700'
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
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 bg-white z-[45] md:hidden"
            />

            {/* Bottom Drawer Content */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[rgba(0,0,0,0.08)] rounded-t-3xl max-h-[85vh] overflow-y-auto pb-12 md:hidden text-slate-700 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]"
            >
              {/* Header Indicator Pull bar */}
              <div className="w-12 h-1.5 bg-slate-700/50 rounded-full mx-auto my-3.5" />

              <div className="px-6 pb-4 flex items-center justify-between border-b border-[rgba(0,0,0,0.05)]">
                <div className="flex items-center gap-2.5">
                  <DivaLogo variant="full" size={36} />
                </div>
                <motion.button whileTap={{ scale: 0.95 }}
                  onClick={() => setMenuOpen(false)}
                  className="p-1.5 bg-[rgba(0,0,0,0.05)] hover:bg-[rgba(0,0,0,0.1)] text-slate-500 hover:text-slate-900 rounded-full cursor-pointer transition-colors"
                >
                  <X size={16} />
                </motion.button>
              </div>

              {/* Drawer Links */}
              <div className="p-5 grid grid-cols-2 gap-3">
                {secondaryTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = currentTab === tab.id;
                  return (
                    <motion.button whileTap={{ scale: 0.95 }}
                      key={tab.id}
                      onClick={() => handleTabClick(tab.id)}
                      className={`flex flex-col justify-center items-center gap-2.5 p-4 rounded-2xl border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                          : 'bg-white border-[rgba(0,0,0,0.04)] hover:bg-[rgba(0,0,0,0.06)] text-slate-600'
                      }`}
                    >
                      <Icon size={24} className={isActive ? 'text-emerald-600' : 'text-slate-500'} />
                      <span className="text-[11px] font-semibold tracking-wide text-center leading-tight">{tab.name}</span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Settings, Sync & Profile Panel */}
              <div className="mx-5 mb-6 mt-1 p-4 bg-white border border-[rgba(0,0,0,0.04)] rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-slate-500 font-mono font-bold tracking-widest uppercase">Sync Status</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className={`h-2.5 w-2.5 rounded-full ${
                        syncConfig.syncStatus === 'synced' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' :
                        syncConfig.syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'
                      }`} />
                      <p className="text-xs font-semibold text-slate-600 capitalize">
                        {syncConfig.syncStatus === 'synced' ? 'Online & Synced' :
                         syncConfig.syncStatus === 'syncing' ? 'Syncing...' : 'Local (Offline)'}
                      </p>
                    </div>
                  </div>
                  <motion.button whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setMenuOpen(false);
                      setSyncModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-[rgba(0,0,0,0.05)] hover:bg-[rgba(0,0,0,0.1)] text-slate-600 text-xs rounded-xl font-bold border border-[rgba(0,0,0,0.05)] cursor-pointer transition-colors"
                  >
                    CONFIG
                  </motion.button>
                </div>

                {/* Profile info nested */}
                <div className="pt-4 border-t border-[rgba(0,0,0,0.04)] flex items-center justify-between">
                  <div 
                    onClick={() => {
                      setMenuOpen(false);
                      setUserModalOpen(true);
                    }}
                    className="flex items-center gap-3 overflow-hidden cursor-pointer group"
                  >
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-700/20 flex items-center justify-center text-[13px] font-bold text-emerald-600 border border-emerald-500/30 group-hover:border-emerald-500/50 transition-colors shrink-0">
                      {user?.name?.slice(0, 2).toUpperCase() || 'US'}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-slate-700 truncate group-hover:text-slate-900 transition-colors">{user?.name || 'Administrator'}</p>
                      <p className="text-[10px] text-slate-500 font-mono truncate">{user?.company || 'PT Diva Kencana Borneo'}</p>
                    </div>
                  </div>

                  {onLogout && (
                    <motion.button whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setMenuOpen(false);
                        onLogout();
                      }}
                      className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 rounded-xl font-bold border border-red-500/20 flex items-center justify-center cursor-pointer ml-2 transition-colors shrink-0"
                      title="Log Out"
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
