/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
}

export default function NotificationsView({
  alerts,
  onMarkRead,
  onMarkAllRead,
  onClearAll
}: NotificationsViewProps) {
  const unreadCount = alerts.filter(x => !x.read).length;

  return (
    <div id="notifications-view-wrapper" className="space-y-6 text-slate-200 text-left max-w-4xl">
      {/* Alert Header Control Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/10 text-teal-400 rounded-xl">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Histori Alert & Log Baku Mutu</h4>
            <p className="text-xs text-slate-500 mt-0.5">Terdapat {unreadCount} alert kepatuhan yang belum dibaca</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="notif-mark-all-read"
            onClick={onMarkAllRead}
            className="flex items-center gap-2 px-3.5 py-2 border border-slate-800 hover:border-slate-705 bg-slate-950/40 text-xs font-semibold rounded-xl text-slate-300 transition-colors cursor-pointer"
          >
            <CheckCheck className="h-4 w-4" />
            Tandai semua dibaca
          </button>
          
          <button
            id="notif-clear-all"
            onClick={() => {
              if (confirm("Wipe seluruh histori notifikasi kepatuhan?")) {
                onClearAll();
              }
            }}
            className="flex items-center gap-2 px-3.5 py-2 border border-red-500/20 hover:bg-red-500/10 text-xs font-semibold rounded-xl text-red-400 transition-colors cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            Bersihkan log
          </button>
        </div>
      </div>

      {/* Primary Alerts Feed */}
      <div className="space-y-3.5">
        {alerts.length === 0 ? (
          <div className="bg-[#111726]/80 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            Tidak ada histori peringatan atau log kepatuhan tambang yang tersimpan.
          </div>
        ) : (
          alerts.map(alert => {
            const isCrit = alert.type === 'Critical';
            return (
              <div 
                key={alert.id}
                className={`p-5 rounded-2xl border text-left flex gap-4 transition-all ${
                  alert.read ? 'bg-[#111726]/40 border-slate-900 opacity-60' : 'bg-[#111726]/80 border-slate-850'
                } ${!alert.read && isCrit ? 'border-red-500/30' : ''}`}
              >
                {/* Category Icon indicator */}
                <div className={`p-3 rounded-xl shrink-0 h-11 w-11 flex items-center justify-center border ${
                  isCrit 
                    ? 'bg-red-500/10 border-red-500/20 text-red-450' 
                    : alert.type === 'Warning' 
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' 
                    : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                }`}>
                  {isCrit ? <ShieldAlert className="h-5.5 w-5.5" /> : <Info className="h-5.5 w-5.5" />}
                </div>

                {/* Info blocks */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border ${
                        alert.category === 'Wastewater' ? 'bg-blue-500/10 border-blue-500/25 text-blue-400' :
                        alert.category === 'B3 Waste' ? 'bg-amber-500/10 border-amber-500/25 text-amber-500' : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}>
                        {alert.category}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(alert.timestamp).toLocaleString('id-ID')}
                      </span>
                    </div>

                    {!alert.read && (
                      <button
                        id={`notif-read-btn-${alert.id}`}
                        onClick={() => onMarkRead(alert.id)}
                        className="text-[11px] text-teal-400 hover:underline cursor-pointer font-semibold font-sans"
                      >
                        Tandai sudah dibaca
                      </button>
                    )}
                  </div>

                  <h5 className="text-sm font-bold text-slate-100">{alert.title}</h5>
                  <p className="text-xs text-slate-350 leading-relaxed font-sans mt-1">{alert.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
