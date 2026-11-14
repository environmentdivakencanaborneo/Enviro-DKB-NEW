import React, { useState } from 'react';
import { NurseryData, ReclamationPlan, NurseryStockOut } from '../types';
import { AlertCircle, FileCheck2 } from 'lucide-react';
import { todayLocalISO } from '../utils/dateUtils';

interface Props {
  nursery: NurseryData[];
  nurseryStockOut: NurseryStockOut[];
  plans: ReclamationPlan[];
  initialData?: NurseryStockOut | null;
  onClose: () => void;
  onSubmit: (data: Omit<NurseryStockOut, 'id' | 'createdAt' | 'createdBy'>) => void;
}

export default function NurseryStockOutForm({ nursery, nurseryStockOut, plans, initialData, onClose, onSubmit }: Props) {
  const [formData, setFormData] = useState({
    tanggal: initialData?.tanggal || todayLocalISO(),
    jenisBibitId: initialData?.jenisBibitId || '',
    jumlahKeluar: initialData?.jumlahKeluar?.toString() || '',
    satuan: initialData?.satuan || 'Batang',
    jenisTransaksi: initialData?.jenisTransaksi || 'Penanaman',
    kapling: initialData?.kapling || '',
    tujuan: initialData?.tujuan || '',
    lokasiPenanaman: initialData?.lokasiPenanaman || '',
    luasReklamasi: initialData?.luasReklamasi?.toString() || '',
    penanggungJawab: initialData?.penanggungJawab || '',
    keterangan: initialData?.keterangan || ''
  });
  
  const [errorMsg, setErrorMsg] = useState('');

  const selectedNursery = nursery.find(n => n.id === formData.jenisBibitId);
  
  const stokMasuk = selectedNursery ? selectedNursery.quantity : 0;
  const stokKeluar = nurseryStockOut.filter(out => out.jenisBibitId === formData.jenisBibitId && out.id !== initialData?.id).reduce((sum, out) => sum + out.jumlahKeluar, 0);
  const stokTersedia = stokMasuk - stokKeluar;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNursery) return;
    
    if (!formData.lokasiPenanaman.trim()) {
      setErrorMsg("Lokasi Penanaman wajib diisi.");
      return;
    }

    const qty = parseInt(formData.jumlahKeluar);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg("Jumlah keluar harus lebih dari 0.");
      return;
    }
    
    if (qty > stokTersedia) {
      setErrorMsg("Jumlah Bibit Keluar melebihi stok tersedia.");
      return;
    }
    
    onSubmit({
      tanggal: formData.tanggal,
      jenisBibitId: selectedNursery.id,
      namaBibit: selectedNursery.plantType,
      species: selectedNursery.plantType,
      jumlahKeluar: qty,
      satuan: formData.satuan,
      jenisTransaksi: formData.jenisTransaksi as any,
      kapling: formData.kapling || undefined,
      tujuan: formData.tujuan,
      lokasiPenanaman: formData.lokasiPenanaman.trim(),
      luasReklamasi: parseFloat(formData.luasReklamasi) || 0,
      penanggungJawab: formData.penanggungJawab,
      keterangan: formData.keterangan
    });
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className="text-left"
    >

      {errorMsg && (
        <div className="mb-4 p-3 bg-neon-red/10 border border-neon-red/35 text-neon-red text-xs rounded-xl flex items-center gap-2">
          <AlertCircle size={14} />
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-[10px] font-bold text-text-low uppercase tracking-wider mb-1">Tanggal</label>
          <input 
            type="date" 
            required
            value={formData.tanggal}
            onChange={e => setFormData({...formData, tanggal: e.target.value})}
            className="w-full px-3 py-2 text-xs font-mono"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-text-low uppercase tracking-wider mb-1">Jenis Transaksi</label>
          <select
            required
            value={formData.jenisTransaksi}
            onChange={e => setFormData({...formData, jenisTransaksi: e.target.value as any})}
            className="w-full px-3 py-2 text-xs cursor-pointer"
          >
            <option value="Penanaman">Penanaman</option>
            <option value="Penggantian Tanaman Mati">Penggantian Tanaman Mati</option>
            <option value="Distribusi">Distribusi</option>
            <option value="Mutasi">Mutasi</option>
            <option value="Rusak">Rusak</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-text-low uppercase tracking-wider mb-1">Jenis Bibit</label>
          <select
            required
            value={formData.jenisBibitId}
            onChange={e => setFormData({...formData, jenisBibitId: e.target.value})}
            className="w-full px-3 py-2 text-xs cursor-pointer"
          >
            <option value="">-- Pilih Jenis Bibit --</option>
            {nursery.map(n => (
              <option key={n.id} value={n.id}>{n.plantType} ({n.location})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-text-low uppercase tracking-wider mb-1">Jumlah Keluar</label>
          <input 
            type="number" 
            required
            min="1"
            value={formData.jumlahKeluar}
            onChange={e => setFormData({...formData, jumlahKeluar: e.target.value})}
            className="w-full px-3 py-2 text-xs font-mono tabular-nums"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-text-low uppercase tracking-wider mb-1">Satuan</label>
          <input 
            type="text" 
            required
            value={formData.satuan}
            onChange={e => setFormData({...formData, satuan: e.target.value})}
            className="w-full px-3 py-2 text-xs opacity-85"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-text-low uppercase tracking-wider mb-1">Tujuan Penanaman</label>
          <input 
            type="text" 
            required
            value={formData.tujuan}
            onChange={e => setFormData({...formData, tujuan: e.target.value})}
            placeholder="Contoh: Revegetasi"
            className="w-full px-3 py-2 text-xs"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-text-low uppercase tracking-wider mb-1">Blok / Area Reklamasi (Opsional)</label>
          <select
            value={formData.kapling}
            onChange={e => setFormData({...formData, kapling: e.target.value})}
            className="w-full px-3 py-2 text-xs cursor-pointer"
          >
            <option value="">-- Pilih Blok Reklamasi (Opsional) --</option>
            {plans.map(p => (
              <option key={p.id} value={p.areaName}>{p.areaName} ({p.targetYear} - {p.sizeHa} Ha)</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-[10px] font-bold text-text-low uppercase tracking-wider mb-1">Lokasi Penanaman *</label>
          <textarea 
            required
            rows={2}
            value={formData.lokasiPenanaman}
            onChange={e => setFormData({...formData, lokasiPenanaman: e.target.value})}
            placeholder='Contoh: "Blok A Barat, Disposal Timur, Area Reklamasi Tahap 2" atau "Jalur Hauling KM 3" atau "Area Revegetasi Selatan Settling Pond"'
            className="w-full px-3 py-2 text-xs"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-text-low uppercase tracking-wider mb-1">Luas Reklamasi (Ha)</label>
          <input 
            type="number" 
            step="0.01"
            required
            value={formData.luasReklamasi}
            onChange={e => setFormData({...formData, luasReklamasi: e.target.value})}
            className="w-full px-3 py-2 text-xs font-mono tabular-nums"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-text-low uppercase tracking-wider mb-1">Penanggung Jawab</label>
          <input 
            type="text" 
            required
            value={formData.penanggungJawab}
            onChange={e => setFormData({...formData, penanggungJawab: e.target.value})}
            className="w-full px-3 py-2 text-xs"
          />
        </div>
        <div className="lg:col-span-2">
          <label className="block text-[10px] font-bold text-text-low uppercase tracking-wider mb-1">Keterangan</label>
          <input 
            type="text" 
            value={formData.keterangan}
            onChange={e => setFormData({...formData, keterangan: e.target.value})}
            className="w-full px-3 py-2 text-xs"
          />
        </div>
      </div>

      {selectedNursery && (
        <div className="bg-bg-2/70 p-4 rounded-xl border border-border-neon flex gap-6 mt-4 mb-4">
          <div>
            <span className="block text-[10px] text-neon-green uppercase font-bold tracking-wider">Bibit Masuk</span>
            <span className="text-sm font-bold text-neon-green font-mono tabular-nums">{stokMasuk} batang</span>
          </div>
          <div>
            <span className="block text-[10px] text-neon-red uppercase font-bold tracking-wider">Bibit Keluar</span>
            <span className="text-sm font-bold text-neon-red font-mono tabular-nums">{stokKeluar + (parseInt(formData.jumlahKeluar) || 0)} batang</span>
          </div>
          <div>
            <span className="block text-[10px] text-text-mid uppercase font-bold tracking-wider">Sisa Stok</span>
            <span className={`text-sm font-bold font-mono tabular-nums ${stokTersedia - (parseInt(formData.jumlahKeluar) || 0) < 0 ? 'text-neon-red' : 'text-text-hi'}`}>
              {stokTersedia - (parseInt(formData.jumlahKeluar) || 0)} batang
            </span>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border-subtle">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-xs font-bold text-text-mid hover:text-text-hi hover:bg-bg-2 border border-border-subtle transition-colors cursor-pointer"
        >
          Batal
        </button>
        <button
          type="submit"
          className="neon-btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-xs cursor-pointer"
        >
          <FileCheck2 size={14} />
          Simpan Transaksi
        </button>
      </div>
    </form>
  );
}
