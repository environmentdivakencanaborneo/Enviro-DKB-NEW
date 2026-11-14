/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import ModalPortal from './ModalPortal';
import { AlertNotification } from '../types';
import { formatTimestamp } from '../utils/dateUtils';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Info, 
  ShieldAlert, 
  Clock,
  Waves,
  Recycle
} from 'lucide-react';
import EmptyState from './EmptyState';

interface NotificationsViewProps {
  alerts: AlertNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  userEmail?: string;
  canDelete?: boolean;
}

export default function NotificationsView({
  alerts,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
  userEmail,
  canDelete = false
}: NotificationsViewProps) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const unreadCount = alerts.filter(x => {
    if (x.createdBy === 'system') return !(x.readBy || []).includes(userEmail || '');
    return !x.read;
  }).length;
  const visibleAlerts = alerts.filter(a => !(a.clearedBy || []).includes(userEmail || ""));

  return (
    <div id="notifications-view-wrapper" className="space-y-6 text-text-hi text-left max-w-4xl">
      {/* Alert Header Control Toolbar */}
      <div className="glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30 rounded-xl shadow-glow-cyan">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-mid font-mono">Histori Alert &amp; Log Baku Mutu</h4>
            <p className="text-xs text-text-mid mt-0.5">Terdapat <span className="font-mono font-bold text-neon-cyan tabular-nums">{unreadCount}</span> alert kepatuhan yang belum dibaca</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="notif-mark-all-read"
            onClick={onMarkAllRead}
            className="flex items-center gap-2 px-3.5 py-2 border border-border-neon bg-bg-1 hover:bg-bg-2 text-xs font-semibold rounded-xl text-text-hi transition-colors cursor-pointer"
          >
            <CheckCheck className="h-4 w-4 text-neon-cyan" />
            Tandai semua dibaca
          </button>
          
          {canDelete && (
            <button
              id="notif-clear-all"
              onClick={() => {
                setDeleteConfirm(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 neon-btn-danger text-xs rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              Bersihkan log
            </button>
          )}
        </div>
      </div>

      {/* Primary Alerts Feed */}
      <div className="space-y-3.5">
        {alerts.length === 0 || visibleAlerts.length === 0 ? (
          <div className="glass-panel rounded-2xl p-6">
            <EmptyState
              title="Belum ada histori peringatan"
              description="Tidak ada histori peringatan atau log kepatuhan tambang yang tersimpan."
              icon={Bell}
            />
          </div>
        ) : (
          visibleAlerts.map(alert => {
            const isCrit = alert.type === 'Critical';
            const isRead = alert.createdBy === 'system' ? (alert.readBy || []).includes(userEmail || '') : alert.read;
            return (
              <div 
                key={alert.id}
                className={`glass-panel p-5 rounded-2xl text-left flex gap-4 transition-all ${
                  isRead ? 'opacity-65' : ''
                } ${!isRead && isCrit ? 'border-neon-red/45 shadow-glow-red' : ''}`}
              >
                {/* Category Icon indicator */}
                <div className={`p-3 rounded-xl shrink-0 h-11 w-11 flex items-center justify-center border ${
                  isCrit 
                    ? 'bg-neon-red/15 border-neon-red/35 text-neon-red' 
                    : alert.type === 'Warning' 
                    ? 'bg-neon-amber/15 border-neon-amber/35 text-neon-amber' 
                    : alert.category === 'Solid Waste'
                    ? 'bg-neon-green/15 border-neon-green/35 text-neon-green'
                    : 'bg-neon-cyan/15 border-neon-cyan/35 text-neon-cyan'
                }`}>
                  {isCrit ? (
                    <ShieldAlert className="h-5.5 w-5.5" />
                  ) : alert.category === 'Solid Waste' ? (
                    <Recycle className="h-5.5 w-5.5" />
                  ) : alert.category === 'Wastewater' || alert.category === 'SurfaceWater' ? (
                    <Waves className="h-5.5 w-5.5" />
                  ) : (
                    <Info className="h-5.5 w-5.5" />
                  )}
                </div>

                {/* Info blocks */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full border ${
                        alert.category === 'Wastewater' ? 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan' :
                        alert.category === 'B3 Waste' ? 'bg-neon-amber/10 border-neon-amber/30 text-neon-amber' :
                        alert.category === 'Solid Waste' ? 'bg-neon-green/10 border-neon-green/30 text-neon-green' :
                        alert.category === 'SurfaceWater' ? 'bg-neon-violet/10 border-neon-violet/30 text-neon-violet' :
                        'bg-bg-2 border-border-subtle text-text-mid'
                      }`}>
                        {alert.category}
                      </span>
                      {alert.createdBy === 'system' && (
                        <span className="text-[10px] font-bold font-mono text-text-mid bg-bg-2 px-1.5 py-0.5 rounded border border-border-subtle">SYSTEM</span>
                      )}
                      <span className="text-[10px] text-text-mid font-mono tabular-nums flex items-center gap-1">
                        <Clock className="h-3 w-3 text-neon-cyan" />
                        {formatTimestamp(alert.timestamp, 'id-ID')}
                      </span>
                    </div>

                    {!isRead && (
                      <button
                        id={`notif-read-btn-${alert.id}`}
                        onClick={() => onMarkRead(alert.id)}
                        className="text-[11px] text-neon-cyan hover:underline cursor-pointer font-semibold font-sans"
                      >
                        Tandai sudah dibaca
                      </button>
                    )}
                  </div>

                  <h5 className={`text-sm font-bold font-heading ${isRead ? 'text-text-mid' : 'text-text-hi'}`}>{alert.title}</h5>
                  <p className={`text-xs leading-relaxed font-sans mt-1 ${isRead ? 'text-text-low' : 'text-text-mid'}`}>{alert.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {deleteConfirm && (
        <ModalPortal>
          <div id="delete-confirm-modal-notif" className="fixed inset-0 bg-bg-0/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="glass-panel rounded-2xl p-6 max-w-sm w-full text-text-hi text-left">
              <h3 className="text-sm font-bold text-text-hi font-heading flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-neon-red/10 border border-neon-red/30 text-neon-red">
                  <Trash2 size={16} />
                </span>
                Konfirmasi Wipe Notifikasi
              </h3>
              <p className="text-xs text-text-mid mt-3 leading-relaxed">
                Wipe seluruh histori notifikasi kepatuhan? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex justify-end gap-2 mt-5">
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="px-3.5 py-2 rounded-xl text-xs bg-bg-1 hover:bg-bg-2 border border-border-subtle text-text-mid hover:text-text-hi font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={async () => {
                    setDeleteConfirm(false);
                    try {
                      await onClearAll();
                    } catch (err: any) {
                      alert('Gagal membersihkan log: ' + err.message);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs bg-neon-red/15 hover:bg-neon-red/25 text-neon-red border border-neon-red/45 font-bold transition-colors cursor-pointer"
                >
                  Hapus Semua
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
