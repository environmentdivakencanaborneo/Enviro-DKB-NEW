/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import ModalPortal from './ModalPortal';
import StatusBadge from './StatusBadge';
import TableSkeleton from './TableSkeleton';
import EmptyState from './EmptyState';
import { BiodiversityData } from '../types';
import { biodiversityService } from '../services/dbService';
import { exportToExcel } from '../services/exportService';
import { formatConservationStatus, isProtectedConservationStatus } from '../data/regulations';
import { todayLocalISO } from '../utils/dateUtils';
import {
  NEON_CHART,
  NEON_TOOLTIP_CONTENT_STYLE,
  NEON_TOOLTIP_LABEL_STYLE,
  NEON_TOOLTIP_ITEM_STYLE,
} from '../utils/chartTheme';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';
import {
  Trees,
  Plus,
  Search,
  Pencil,
  Trash2,
  FileSpreadsheet,
  ShieldAlert,
  Bird,
  X
} from 'lucide-react';

interface BiodiversityViewProps {
  data: BiodiversityData[];
  isLoading: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onUnauthorizedAction: (action: string) => void;
}

export default function BiodiversityView({
  data,
  isLoading,
  canEdit,
  canDelete,
  onUnauthorizedAction
}: BiodiversityViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BiodiversityData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [date, setDate] = useState(todayLocalISO());
  const [zone, setZone] = useState('Blok Reklamasi Tahun 2024 / Koridor Hutan');
  const [category, setCategory] = useState<BiodiversityData['category']>('Flora');
  const [speciesName, setSpeciesName] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [conservationStatus, setConservationStatus] = useState<BiodiversityData['conservationStatus']>('Umum');
  const [count, setCount] = useState<number>(0);
  const [observationMethod, setObservationMethod] = useState('Transek Garis & Pengamatan Visual');
  const [condition, setCondition] = useState<BiodiversityData['condition']>('Sehat');
  const [officer, setOfficer] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setDate(todayLocalISO());
    setZone('Blok Reklamasi Tahun 2024');
    setCategory('Flora');
    setSpeciesName('');
    setScientificName('');
    setConservationStatus('Umum');
    setCount(0);
    setObservationMethod('Transek Garis & Pengamatan Visual');
    setCondition('Sehat');
    setOfficer('');
    setNotes('');
    setErrorMsg(null);
  };

  const openCreate = () => {
    if (!canEdit) return onUnauthorizedAction('Tambah Observasi Kehati');
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: BiodiversityData) => {
    if (!canEdit) return onUnauthorizedAction('Edit Observasi Kehati');
    setEditingId(item.id);
    setDate(item.date);
    setZone(item.zone);
    setCategory(item.category);
    setSpeciesName(item.speciesName);
    setScientificName(item.scientificName);
    setConservationStatus(item.conservationStatus);
    setCount(item.count);
    setObservationMethod(item.observationMethod);
    setCondition(item.condition);
    setOfficer(item.officer);
    setNotes(item.notes || '');
    setErrorMsg(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return onUnauthorizedAction('Simpan Observasi Kehati');
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const payload: Omit<BiodiversityData, 'id'> = {
        date,
        zone: zone.trim(),
        category,
        speciesName: speciesName.trim(),
        scientificName: scientificName.trim(),
        conservationStatus,
        count: Number(count),
        observationMethod: observationMethod.trim(),
        condition,
        officer: officer.trim(),
        notes: notes.trim() || undefined,
      };
      if (editingId) {
        await biodiversityService.update(editingId, payload);
      } else {
        await biodiversityService.add(payload);
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menyimpan data keanekaragaman hayati.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((d) => {
      const matchQuery =
        d.speciesName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.scientificName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.zone.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = categoryFilter === 'ALL' || d.category === categoryFilter;
      return matchQuery && matchCat;
    });
  }, [data, searchQuery, categoryFilter]);

  const kpis = useMemo(() => {
    const uniqueSpecies = new Set(data.map((d) => d.speciesName.toLowerCase())).size;
    const protectedCount = data.filter((d) => isProtectedConservationStatus(d.conservationStatus)).length;
    const totalIndividuals = data.reduce((s, d) => s + (d.count || 0), 0);
    const endangered = data.filter((d) => d.condition === 'Terancam').length;
    return { uniqueSpecies, protectedCount, totalIndividuals, endangered };
  }, [data]);

  const chartData = useMemo(() => {
    const groups: Record<string, { category: string; Spesies: number; Individu: number }> = {
      Flora: { category: 'Flora', Spesies: 0, Individu: 0 },
      Fauna: { category: 'Fauna', Spesies: 0, Individu: 0 },
      'Koridor Satwa': { category: 'Koridor Satwa', Spesies: 0, Individu: 0 },
    };
    filteredData.forEach((d) => {
      if (groups[d.category]) {
        groups[d.category].Spesies += 1;
        groups[d.category].Individu += d.count;
      }
    });
    return Object.values(groups);
  }, [filteredData]);

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-3xl">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-neon-cyan">
            Permen LHK No. P.106/2018 &amp; UU No. 5/1990 jo. UU No. 32/2024 • Kementerian Kehutanan
          </span>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-text-hi mt-1 flex items-center gap-2.5">
            <Trees className="h-6 w-6 text-neon-green" />
            Keanekaragaman Hayati (Flora, Fauna &amp; Koridor Satwa)
          </h2>
          <p className="text-xs text-text-mid mt-1">
            Inventarisasi spesies flora endemik reklamasi, pemantauan fauna liar, dan perlindungan satwa dilindungi di area konsesi.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() =>
              exportToExcel(
                filteredData.map((d) => ({
                  ID: d.id,
                  Tanggal: d.date,
                  Zona: d.zone,
                  Kategori: d.category,
                  'Nama Lokal': d.speciesName,
                  'Nama Ilmiah': d.scientificName,
                  'Status Konservasi': formatConservationStatus(d.conservationStatus),
                  Jumlah: d.count,
                  Metode: d.observationMethod,
                  Kondisi: d.condition,
                  Pengamat: d.officer,
                })),
                'DEM_Keanekaragaman_Hayati'
              )
            }
            disabled={filteredData.length === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-bg-1 border border-border-neon hover:border-neon-cyan/40 hover:bg-bg-2 text-text-hi text-xs font-bold cursor-pointer disabled:opacity-50 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4 text-neon-green" />
            Ekspor Excel
          </button>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl neon-btn-primary text-xs cursor-pointer">
            <Plus className="h-4 w-4" />
            Catat Observasi Kehati
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="neon-card p-5">
          <div className="flex items-center justify-between text-xs text-text-mid font-bold uppercase">
            <span>Ragam Spesies Terdata</span>
            <Trees className="h-4 w-4 text-neon-green" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-neon-green mt-2">{kpis.uniqueSpecies} Jenis</p>
          <p className="text-[11px] text-text-low mt-1">{data.length} catatan pengamatan</p>
        </div>
        <div className="neon-card p-5">
          <div className="flex items-center justify-between text-xs text-text-mid font-bold uppercase">
            <span>Total Individu</span>
            <Bird className="h-4 w-4 text-neon-cyan" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-text-hi mt-2">{kpis.totalIndividuals.toLocaleString('id-ID')}</p>
          <p className="text-[11px] text-text-low mt-1">Akumulasi flora &amp; fauna dijumpai</p>
        </div>
        <div className="neon-card p-5">
          <div className="flex items-center justify-between text-xs text-text-mid font-bold uppercase">
            <span>Spesies Dilindungi / IUCN</span>
            <ShieldAlert className="h-4 w-4 text-neon-amber" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-neon-amber mt-2">{kpis.protectedCount}</p>
          <p className="text-[11px] text-text-low mt-1">Status Permen LHK P.106/2018 atau IUCN</p>
        </div>
        <div className="neon-card p-5">
          <span className="text-xs text-text-mid font-bold uppercase">Kondisi Terancam</span>
          <p className="text-2xl font-bold font-mono tabular-nums text-neon-red mt-2">{kpis.endangered}</p>
          <p className="text-[11px] text-text-low mt-1">Memerlukan perlindungan koridor</p>
        </div>
      </div>

      {/* Chart */}
      {filteredData.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="text-sm font-bold font-heading text-text-hi uppercase tracking-wider mb-3">
            Distribusi Pengamatan Flora, Fauna &amp; Koridor Satwa
          </h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={NEON_CHART.gridStroke} />
                <XAxis dataKey="category" stroke={NEON_CHART.tickFill} tick={{ fill: NEON_CHART.tickFill, fontSize: 11 }} tickLine={false} />
                <YAxis stroke={NEON_CHART.tickFill} tick={{ fill: NEON_CHART.tickFill, fontSize: 10 }} tickLine={false} />
                <RechartsTooltip
                  contentStyle={NEON_TOOLTIP_CONTENT_STYLE}
                  labelStyle={NEON_TOOLTIP_LABEL_STYLE}
                  itemStyle={NEON_TOOLTIP_ITEM_STYLE}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: NEON_CHART.tickFill }} />
                <Bar dataKey="Spesies" name="Jumlah Catatan" fill={NEON_CHART.cyan} radius={[6, 6, 0, 0]} />
                <Bar dataKey="Individu" name="Jumlah Individu" fill={NEON_CHART.green} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-low pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama spesies, ilmiah, atau zona..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="Flora">Flora</option>
            <option value="Fauna">Fauna</option>
            <option value="Koridor Satwa">Koridor Satwa</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="neon-table text-left text-xs">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-wider font-mono">
                <th className="p-3">Tanggal</th>
                <th className="p-3">Spesies &amp; Nama Ilmiah</th>
                <th className="p-3">Zona &amp; Metode</th>
                <th className="p-3 text-center">Kategori</th>
                <th className="p-3 text-center">Konservasi</th>
                <th className="p-3 text-center">Jumlah</th>
                <th className="p-3 text-center">Kondisi</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-4">
                    <TableSkeleton columns={8} rows={5} />
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4">
                    <EmptyState
                      icon={Trees}
                      title="Belum ada data observasi keanekaragaman hayati"
                      description="Tambahkan catatan inventarisasi flora, fauna, atau pemantauan koridor satwa."
                    />
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const condTone =
                    item.condition === 'Sehat'
                      ? 'Memenuhi'
                      : item.condition === 'Bermigrasi'
                      ? 'Dipantau'
                      : 'Tidak Memenuhi';
                  const consLabel = formatConservationStatus(item.conservationStatus);
                  const consTone = item.conservationStatus === 'Umum' ? 'Dipantau' : 'Mendekati';
                  return (
                    <tr key={item.id}>
                      <td className="p-3 font-mono font-semibold text-text-hi tabular-nums">{item.date}</td>
                      <td className="p-3">
                        <p className="font-bold text-text-hi">{item.speciesName}</p>
                        <p className="text-[10px] italic text-text-mid">{item.scientificName || '-'}</p>
                      </td>
                      <td className="p-3">
                        <p className="font-semibold text-text-hi">{item.zone}</p>
                        <p className="text-[10px] text-text-mid">{item.observationMethod} • {item.officer}</p>
                      </td>
                      <td className="p-3 text-center font-semibold text-text-hi">{item.category}</td>
                      <td className="p-3 text-center">
                        <StatusBadge status={consTone} label={consLabel} />
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-text-hi tabular-nums">{item.count}</td>
                      <td className="p-3 text-center">
                        <StatusBadge status={condTone} label={item.condition} />
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => openEdit(item)} className="p-1.5 text-neon-cyan bg-neon-cyan/10 hover:bg-neon-cyan/20 rounded-lg cursor-pointer transition-colors" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                          <button
                            onClick={() => {
                              if (!canDelete) return onUnauthorizedAction('Hapus Observasi Kehati');
                              setDeleteTarget(item);
                            }}
                            className="p-1.5 text-neon-red bg-neon-red/10 hover:bg-neon-red/20 rounded-lg cursor-pointer transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <ModalPortal>
          <div className="fixed inset-0 bg-bg-0/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="glass-panel rounded-3xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border-neon">
                <h3 className="text-sm font-bold font-heading uppercase tracking-wider text-neon-cyan">
                  {editingId ? 'Edit Observasi Keanekaragaman Hayati' : 'Input Observasi Flora & Fauna'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1 text-text-low hover:text-text-hi cursor-pointer"><X className="h-4 w-4" /></button>
              </div>
              {errorMsg && <div className="p-3 rounded-xl bg-neon-red/10 border border-neon-red/30 text-xs text-neon-red">{errorMsg}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Tanggal</label>
                    <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Kategori</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="w-full px-3 py-2 text-xs">
                      <option value="Flora">Flora</option>
                      <option value="Fauna">Fauna</option>
                      <option value="Koridor Satwa">Koridor Satwa</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Zona Pengamatan</label>
                    <input type="text" required value={zone} onChange={(e) => setZone(e.target.value)} className="w-full px-3 py-2 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Nama Spesies Lokal</label>
                    <input type="text" required value={speciesName} onChange={(e) => setSpeciesName(e.target.value)} placeholder="cth. Ulin / Rangkong Badak" className="w-full px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Nama Ilmiah</label>
                    <input type="text" value={scientificName} onChange={(e) => setScientificName(e.target.value)} placeholder="cth. Eusideroxylon zwageri" className="w-full px-3 py-2 text-xs italic" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Status Konservasi</label>
                    <select value={conservationStatus} onChange={(e) => setConservationStatus(e.target.value as any)} className="w-full px-3 py-2 text-xs">
                      <option value="Umum">Umum</option>
                      <option value="Endemik">Endemik</option>
                      <option value="IUCN Threatened">IUCN Threatened</option>
                      <option value="Dilindungi (Permen LHK P.106/2018)">Dilindungi (Permen LHK P.106/2018)</option>
                      {conservationStatus === 'Dilindungi (PP 106/2018)' && (
                        <option value="Dilindungi (PP 106/2018)">Dilindungi (Data Lama PP 106/2018)</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Jumlah Individu</label>
                    <input type="number" min="0" required value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Kondisi</label>
                    <select value={condition} onChange={(e) => setCondition(e.target.value as any)} className="w-full px-3 py-2 text-xs">
                      <option value="Sehat">Sehat</option>
                      <option value="Bermigrasi">Bermigrasi</option>
                      <option value="Terancam">Terancam</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Metode Pengamatan</label>
                    <input type="text" required value={observationMethod} onChange={(e) => setObservationMethod(e.target.value)} className="w-full px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Pengamat / Biologist</label>
                    <input type="text" required value={officer} onChange={(e) => setOfficer(e.target.value)} className="w-full px-3 py-2 text-xs" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Catatan</label>
                  <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 text-xs" />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl border border-border-subtle text-text-mid hover:text-text-hi text-xs font-semibold cursor-pointer">Batal</button>
                  <button type="submit" disabled={isSaving} className="px-5 py-2 rounded-xl neon-btn-primary text-xs cursor-pointer disabled:opacity-50">
                    {isSaving ? 'Menyimpan...' : 'Simpan Observasi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {deleteTarget && (
        <ModalPortal>
          <div className="fixed inset-0 bg-bg-0/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="glass-panel rounded-3xl max-w-sm w-full p-6 space-y-4">
              <h3 className="text-sm font-bold font-heading text-text-hi">Hapus Catatan Kehati?</h3>
              <p className="text-xs text-text-mid">Hapus data spesies <strong className="text-text-hi">{deleteTarget.speciesName}</strong> di {deleteTarget.zone}?</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-xl border border-border-subtle text-text-mid hover:text-text-hi text-xs font-semibold cursor-pointer">Batal</button>
                <button onClick={async () => { await biodiversityService.delete(deleteTarget.id); setDeleteTarget(null); }} className="px-4 py-2 rounded-xl neon-btn-danger text-xs cursor-pointer">Hapus</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
