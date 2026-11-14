/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import ModalPortal from './ModalPortal';
import { APP_MENU_GROUPS } from '../data/navigation';
import { canAccessModule } from '../services/permissionService';
import { UserProfile } from '../types';
import { Search, X, ArrowRight, BookOpen } from 'lucide-react';

interface MenuSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tabId: string) => void;
  profile: UserProfile | null;
  currentTab: string;
}

export default function MenuSearchModal({
  isOpen,
  onClose,
  onSelectTab,
  profile,
  currentTab,
}: MenuSearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const accessibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list: { group: string; item: (typeof APP_MENU_GROUPS)[number]['items'][number] }[] = [];
    for (const g of APP_MENU_GROUPS) {
      for (const item of g.items) {
        if (!canAccessModule(profile, item.id)) continue;
        if (
          !q ||
          item.name.toLowerCase().includes(q) ||
          g.group.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          (item.regulationBasis || '').toLowerCase().includes(q)
        ) {
          list.push({ group: g.group, item });
        }
      }
    }
    return list;
  }, [query, profile]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(accessibleItems.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && accessibleItems[selectedIndex]) {
      e.preventDefault();
      onSelectTab(accessibleItems[selectedIndex].item.id);
      onClose();
    }
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-bg-0/75 backdrop-blur-sm animate-fade-in no-print"
        onClick={onClose}
      >
        <div
          className="glass-panel rounded-2xl shadow-glow-cyan w-full max-w-xl overflow-hidden text-left text-text-hi"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          <div className="px-4 py-3 border-b border-border-neon flex items-center gap-3 bg-bg-2/70">
            <Search className="w-4 h-4 text-neon-cyan shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari modul, grup menu, atau dasar regulasi (mis. Pertek, GRK, 113, PROPER)..."
              className="flex-1 text-xs sm:text-sm text-text-hi placeholder:text-text-low px-3 py-1.5 bg-bg-0 border border-border-neon rounded-xl"
            />
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-text-mid hover:text-text-hi rounded-lg cursor-pointer"
              title="Tutup (Esc)"
              aria-label="Tutup Pencarian"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-border-subtle">
            {accessibleItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-mid">
                Tidak ada modul yang cocok dengan pencarian &ldquo;{query}&rdquo;.
              </div>
            ) : (
              accessibleItems.map(({ group, item }, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;
                const isCurrent = item.id === currentTab;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => {
                      onSelectTab(item.id);
                      onClose();
                    }}
                    className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors cursor-pointer ${
                      isSelected ? 'bg-neon-cyan/10' : 'hover:bg-bg-2/60'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                        isCurrent
                          ? 'bg-neon-cyan text-[#04121A] border-neon-cyan'
                          : 'bg-bg-0 text-neon-cyan border-border-neon'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-hi truncate">{item.name}</span>
                        {item.isNew && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/35 uppercase font-mono">
                            BARU
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-text-mid truncate ml-auto">{group}</span>
                      </div>
                      <p className="text-[11px] text-text-mid truncate mt-0.5">{item.subtitle}</p>
                      {item.regulationBasis && (
                        <div className="inline-flex items-center gap-1 text-[10px] text-neon-violet font-medium mt-0.5">
                          <BookOpen className="w-3 h-3" />
                          <span className="truncate">{item.regulationBasis}</span>
                        </div>
                      )}
                    </div>
                    <ArrowRight
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected ? 'text-neon-cyan' : 'text-text-low'
                      }`}
                    />
                  </button>
                );
              })
            )}
          </div>

          <div className="px-4 py-2 bg-bg-2 border-t border-border-neon flex items-center justify-between text-[10px] text-text-mid font-mono">
            <span>↑↓ Navigasi · Enter Buka · Esc Tutup</span>
            <span className="tabular-nums">{accessibleItems.length} modul tersedia</span>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
