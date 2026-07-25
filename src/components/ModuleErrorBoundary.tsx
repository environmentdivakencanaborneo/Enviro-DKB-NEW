/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { AlertOctagon, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  moduleName: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ModuleErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error terdeteksi pada modul [${this.props.moduleName}]:`, error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleHardReset = () => {
    // Hapus hanya key milik aplikasi ini
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.includes('coal_monitor') || key.includes('coal_pro'))) {
        localStorage.removeItem(key);
      }
    }
    sessionStorage.clear();
    window.location.href = '/';
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div id="module-error-boundary-card" className="bg-white border border-red-950/50 rounded-xl p-8 max-w-2xl mx-auto my-12 text-slate-700 shadow-xl relative z-50">
          <div className="flex items-center space-x-4 mb-6 border-b border-red-950 pb-4">
            <div className="p-3 bg-red-950/40 rounded-lg text-red-500">
              <AlertOctagon className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono text-red-600 tracking-wide uppercase">MODUL GAGAL DI-RENDER</h2>
              <p className="text-xs text-red-600/85 font-semibold mt-0.5">Sistem Pengaman Mandiri (Secure Boundary) Terpicu</p>
            </div>
          </div>

          <p className="text-slate-500 text-sm mb-4 leading-relaxed">
            Terjadi gangguan teknis saat menjalankan modul <strong className="text-emerald-600 font-mono">[{this.props.moduleName}]</strong>. 
            Hal ini dapat terjadi akibat data masukan yang tidak lengkap, ketidakcocokan skema chart, atau koneksi terputus tiba-tiba.
          </p>

          {this.state.error && (
            <div className="bg-white rounded-lg p-4 font-mono text-xs text-red-500/90 border border-red-950/20 overflow-x-auto max-h-40 mb-6 select-all">
              <span className="font-bold text-red-600">Pesan Kesalahan:</span> {this.state.error.message}
              {this.state.error.stack && (
                <div className="text-red-700/60 mt-1 whitespace-pre">{this.state.error.stack.split('\n').slice(0, 3).join('\n')}</div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-3 sm:space-y-0">
            <button
              onClick={this.handleReload}
              className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-sm font-semibold rounded-lg flex items-center justify-center space-x-2 transition-all shadow-md cursor-pointer border border-emerald-600"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Muat Ulang Aplikasi</span>
            </button>
            <button
              onClick={this.handleHardReset}
              className="px-5 py-2.5 bg-white hover:bg-white text-slate-500 hover:text-slate-900 text-sm font-semibold rounded-lg flex items-center justify-center space-x-2 transition-all cursor-pointer border border-slate-200"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
              <span>Reset Cache Total (Hard Reset)</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
