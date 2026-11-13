import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  RefreshCw,
  Search
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
  onOpenSearch
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

  const filteredGroups = APP_MENU_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => canAccessModule(profile, item.id))
  })).filter(group => group.items.length > 0);

  return (
    <aside 
      id="sidebar-container"
      className={`bg-[#2E4B3D] border-r border-forest-800 transition-all duration-300 ease-in-out hidden md:flex flex-col justify-between select-none h-screen sticky top-0 md:relative z-40 ${
        collapsed ? 'w-[72px]' : 'w-72'
      }`}
    >
      {/* Upper Brand Section */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="flex items-center justify-between p-[18px] border-b border-white/10 relative shrink-0">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 animate-fade-in pl-1">
              <div className="text-white filter brightness-0 invert">
                <DivaLogo variant="full" size={38} />
              </div>
              <div className="p-1 rounded-lg bg-emerald-950/60 border border-emerald-500/25 shadow-sm" title="Diva Enviro Monitor — Coal Mining Eco-Emblem">
                <MiningEnvIcon type="emblem" size={26} />
              </div>
            </div>
          ) : (
            <div className="mx-auto flex flex-col items-center justify-center gap-1.5 animate-fade-in">
              <div className="text-white filter brightness-0 invert">
                <DivaLogo variant="icon" size={26} />
              </div>
              <MiningEnvIcon type="emblem" size={22} />
            </div>
          )}
          
          <motion.button whileTap={{ scale: 0.9 }} 
            id="sidebar-toggle-btn"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex items-center justify-center absolute -right-3 top-6 h-6 w-6 bg-white border border-[#E6ECE6] rounded-full hover:bg-forest-50 text-forest-900 hover:text-forest-600 transition-colors cursor-pointer z-50 shadow-sm"
            title={collapsed ? "Expand Menu" : "Collapse Menu"}
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
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white/85 text-xs transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-[#A8B9A5]" />
                  <span>Cari modul / regulasi...</span>
                </span>
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/20 text-white/75">⌘K</kbd>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenSearch}
                title="Cari Modul / Regulasi (Ctrl+K)"
                className="w-full flex items-center justify-center py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/85 cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Navigation Items */}
        <nav className="p-4 space-y-3 mt-1 flex-1 pb-4">
          {filteredGroups.map((group) => {
            const isExpanded = collapsed || !!expandedGroups[group.group];
            return (
              <div key={group.group} className="space-y-1">
                {!collapsed && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.group)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-[10px] font-bold tracking-widest text-[#A8B9A5]/90 hover:text-white uppercase font-sans cursor-pointer rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <span className="truncate text-left">{group.group}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-75" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-75" />
                    )}
                  </button>
                )}
                {isExpanded && group.items.map(item => {
                  const IconComponent = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <motion.button whileTap={{ scale: 0.97 }}
                      id={`sidebar-link-${item.id}`}
                      key={item.id}
                      onClick={() => setCurrentTab(item.id)}
                      title={collapsed ? item.name : item.subtitle}
                      className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-start'} gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 group text-left cursor-pointer relative overflow-hidden ${
                        isActive 
                          ? 'bg-[#4D7C5A] text-white font-semibold shadow-[0_4px_16px_rgba(77,124,90,0.25)]' 
                          : 'text-white/80 hover:bg-[#365645] hover:text-white'
                      }`}
                    >
                      <div className="relative flex items-center justify-center shrink-0">
                        <IconComponent className={`h-[17px] w-[17px] transition-transform duration-200 group-hover:scale-105 stroke-[1.5] ${
                          isActive ? 'text-white' : 'text-white/80 group-hover:text-white'
                        }`} />
                        
                        {item.hasBadge && (
                          <div className="absolute -top-1 -right-1 h-2 w-2 bg-[#D95C5C] rounded-full shadow-[0_0_6px_rgba(217,92,92,0.6)]"></div>
                        )}
                      </div>
                      
                      {!collapsed && (
                        <>
                          <span className={`text-[12.5px] leading-snug tracking-wide font-sans flex-1 ${isActive ? 'font-semibold text-white' : 'font-medium text-white/85'}`}>
                            {item.name}
                          </span>
                          {item.isNew && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-200 border border-emerald-300/25 uppercase shrink-0">
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
      <div className="p-4 border-t border-white/5">
        {!collapsed ? (
          <div className="bg-[#365645] p-4 rounded-2xl border border-white/5 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#A8B9A5]">Sync Status</span>
              <button 
                id="sidebar-sync-settings"
                onClick={() => setSyncModalOpen(true)}
                className="text-[9px] font-bold text-white/90 hover:text-[#DCE5DA] tracking-wider transition-colors cursor-pointer uppercase"
              >
                CONFIG
              </button>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className={`h-2 w-2 rounded-full ${
                syncConfig.syncStatus === 'synced' ? 'bg-[#3FA66B]' :
                syncConfig.syncStatus === 'syncing' ? 'bg-[#E2A43B] animate-pulse' : 'bg-[#D95C5C]'
              }`} />
              <p className="text-[12px] font-medium text-white">
                {syncConfig.syncStatus === 'synced' ? 'Online & Synced' : 
                 syncConfig.syncStatus === 'syncing' ? 'Syncing data...' : 'Local / Offline'}
              </p>
            </div>
            {syncConfig.lastSynced && (
              <p className="text-[9px] text-[#A8B9A5] font-manrope pl-4 font-mono">
                Last: {new Date(syncConfig.lastSynced).toLocaleString('id-ID')}
              </p>
            )}
            
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="h-8 w-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {user?.name?.slice(0, 2).toUpperCase() || 'US'}
                </div>
                <div className="overflow-hidden flex flex-col justify-center">
                  <p className="text-[12.5px] font-semibold text-white truncate leading-tight">{user?.name || 'Administrator'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[8px] bg-white/20 text-[#DCE5DA] px-1.5 py-[1px] rounded uppercase font-bold tracking-wider">
                      {user?.role || 'ENV LEAD'}
                    </span>
                  </div>
                </div>
              </div>
              
              {onLogout && (
                <button
                  id="sidebar-logout-btn"
                  onClick={onLogout}
                  className="p-2 bg-white/5 hover:bg-white/10 text-white/80 hover:text-[#D95C5C] rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 ml-1"
                  title="Keluar dari Panel"
                >
                  <LogOut className="h-[14px] w-[14px]" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 items-center">
            <button 
              id="sidebar-quick-config-btn"
              onClick={() => setSyncModalOpen(true)}
              className="w-10 h-10 bg-white/5 rounded-xl border border-white/5 flex items-center justify-center hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer group"
              title="Google Sync Settings"
            >
              <RefreshCw className={`h-[18px] w-[18px] group-hover:scale-105 transition-transform ${syncConfig.syncStatus === 'syncing' ? 'animate-spin text-[#E2A43B]' : ''}`} />
            </button>
            
            {onLogout && (
              <button 
                id="sidebar-quick-logout-btn"
                onClick={onLogout}
                className="w-10 h-10 bg-[#D95C5C]/10 hover:bg-[#D95C5C]/20 text-white/80 hover:text-[#D95C5C] rounded-xl flex items-center justify-center transition-all cursor-pointer"
                title="Keluar"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
