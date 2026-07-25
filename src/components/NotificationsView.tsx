/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlertNotification } from '../types';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  AlertTriangle, 
  Info, 
  ShieldAlert, 
  Clock,
  Waves
} from 'lucide-react';

interface NotificationsViewProps {
  alerts: AlertNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  userEmail?: string;
}

export default function NotificationsView({
  alerts,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
  userEmail
}: NotificationsViewProps) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const unreadCount = alerts.filter(x => {
    if (x.createdBy === 'system') return !(x.readBy || []).includes(userEmail || '');
    return !x.read;
  }).length;

  return (
    <div id="notifications-view-wrapper" className="space-y-6 text-slate-700 text-left max-w-4xl">
      {/* Alert Header Control Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/60 p-4 border border-slate-200 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/10 text-teal-600 rounded-xl">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Histori Alert & Log Baku Mutu</h4>
            <p className="text-xs text-slate-500 mt-0.5">Terdapat {unreadCount} alert kepatuhan yang belum dibaca</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="notif-mark-all-read"
            onClick={onMarkAllRead}
            className="flex items-center gap-2 px-3.5 py-2 border border-slate-200 hover:border-slate-700 bg-white text-xs font-semibold rounded-xl text-slate-600 transition-colors cursor-pointer"
          >
            <CheckCheck className="h-4 w-4" />
            Tandai semua dibaca
          </button>
          
          <button
            id="notif-clear-all"
            onClick={() => {
              setDeleteConfirm(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 border border-red-500/20 hover:bg-red-500/10 text-xs font-semibold rounded-xl text-red-600 transition-colors cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            Bersihkan log
          </button>
        </div>
      </div>

      {/* Primary Alerts Feed */}
      <div className="space-y-3.5">
        {alerts.length === 0 ? (
          <div className="bg-white/80 border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
            Tidak ada histori peringatan atau log kepatuhan tambang yang tersimpan.
          </div>
        ) : (
          alerts.filter(a => !(a.clearedBy || []).includes(userEmail || "")).map(alert => {
            const isCrit = alert.type === 'Critical';
            const isRead = alert.createdBy === 'system' ? (alert.readBy || []).includes(userEmail || '') : alert.read;
            return (
              <div 
                key={alert.id}
                className={`p-5 rounded-2xl border text-left flex gap-4 transition-all ${
                  isRead ? 'bg-white/40 border-slate-900 opacity-60' : 'bg-white/80 border-slate-200'
                } ${!isRead && isCrit ? 'border-red-500/30' : ''}`}
              >
                {/* Category Icon indicator */}
                <div className={`p-3 rounded-xl shrink-0 h-11 w-11 flex items-center justify-center border ${
                  isCrit 
                    ? 'bg-rose-50 border-rose-200 text-rose-600' 
                    : alert.type === 'Warning' 
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' 
                    : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                }`}>
                  {isCrit ? <ShieldAlert className="h-5.5 w-5.5" /> : <Info className="h-5.5 w-5.5" />}
                </div>

                {/* Info blocks */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border ${
                        alert.category === 'Wastewater' ? 'bg-blue-500/10 border-blue-500/25 text-blue-600' :
                        alert.category === 'B3 Waste' ? 'bg-amber-500/10 border-amber-500/25 text-amber-500' : 'bg-white border-slate-200 text-slate-500'
                      }`}>
                        {alert.category}
                      </span>
                      {alert.createdBy === 'system' && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">SYSTEM</span>
                      )}
                      <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(alert.timestamp).toLocaleString('id-ID')}
                      </span>
                    </div>

                    {!isRead && (
                      <button
                        id={`notif-read-btn-${alert.id}`}
                        onClick={() => onMarkRead(alert.id)}
                        className="text-[11px] text-teal-500 hover:underline cursor-pointer font-semibold font-sans"
                      >
                        Tandai sudah dibaca
                      </button>
                    )}
                  </div>

                  <h5 className={`text-sm font-bold ${isRead ? 'text-slate-500' : 'text-slate-800'}`}>{alert.title}</h5>
                  <p className={`text-xs leading-relaxed font-sans mt-1 ${isRead ? 'text-slate-500' : 'text-slate-600'}`}>{alert.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {deleteConfirm && (
        <div id="delete-confirm-modal-notif" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-slate-700 text-left">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="p-1 rounded-lg bg-red-500/10 text-red-500">
                <Trash2 size={16} />
              </span>
              Konfirmasi Wipe Notifikasi
            </h3>
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              Wipe seluruh histori notifikasi kepatuhan? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-3.5 py-2 rounded-xl text-xs bg-white hover:bg-slate-100 text-slate-600 font-bold transition-colors cursor-pointer"
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
                className="px-3.5 py-2 rounded-xl text-xs bg-red-600 hover:bg-red-500 text-slate-900 font-bold transition-colors cursor-pointer"
              >
                Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
