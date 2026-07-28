import React, { useState } from 'react';
import { NurseryData, ReclamationPlan, NurseryStockOut } from '../types';
import { AlertCircle, FileCheck2, ArrowRight } from 'lucide-react';

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
    tanggal: initialData?.tanggal || new Date().toISOString().split('T')[0],
    jenisBibitId: initialData?.jenisBibitId || '',
    jumlahKeluar: initialData?.jumlahKeluar?.toString() || '',
    satuan: initialData?.satuan || 'Batang',
    jenisTransaksi: initialData?.jenisTransaksi || 'Penanaman',
    tujuan: initialData?.tujuan || '',
    kapling: initialData?.kapling || '',
    blok: initialData?.blok || '',
    pit: initialData?.pit || '',
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
      species: selectedNursery.plantType, // Can use plantType for species as fallback
      jumlahKeluar: qty,
      satuan: formData.satuan,
      tujuan: formData.tujuan,
      kapling: formData.kapling,
      blok: formData.blok,
      pit: formData.pit,
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
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle size={14} />
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tanggal</label>
          <input 
            type="date" 
            required
            value={formData.tanggal}
            onChange={e => setFormData({...formData, tanggal: e.target.value})}
            className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Jenis Transaksi</label>
          <select
            required
            value={formData.jenisTransaksi}
            onChange={e => setFormData({...formData, jenisTransaksi: e.target.value as any})}
            className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
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
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Jenis Bibit</label>
          <select
            required
            value={formData.jenisBibitId}
            onChange={e => setFormData({...formData, jenisBibitId: e.target.value})}
            className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
          >
            <option value="">-- Pilih Jenis Bibit --</option>
            {nursery.map(n => (
              <option key={n.id} value={n.id}>{n.plantType} ({n.location})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Jumlah Keluar</label>
          <input 
            type="number" 
            required
            min="1"
            value={formData.jumlahKeluar}
            onChange={e => setFormData({...formData, jumlahKeluar: e.target.value})}
            className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Satuan</label>
          <input 
            type="text" 
            required
            value={formData.satuan}
            onChange={e => setFormData({...formData, satuan: e.target.value})}
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tujuan Penanaman</label>
          <input 
            type="text" 
            required
            value={formData.tujuan}
            onChange={e => setFormData({...formData, tujuan: e.target.value})}
            placeholder="Contoh: Revegetasi"
            className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Kapling Reklamasi</label>
          <select
            required
            value={formData.kapling}
            onChange={e => {
              const selectedPlan = plans.find(p => p.id === e.target.value);
              setFormData({
                ...formData, 
                kapling: e.target.value,
                luasReklamasi: selectedPlan ? selectedPlan.sizeHa.toString() : ''
              });
            }}
            className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
          >
            <option value="">-- Pilih Kapling / Area --</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.areaName} ({p.targetYear})</option>
            ))}
            <option value="lainnya">Area Lainnya / Non-Rencana</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Blok</label>
          <input 
            type="text" 
            required
            value={formData.blok}
            onChange={e => setFormData({...formData, blok: e.target.value})}
            className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pit</label>
          <input 
            type="text" 
            required
            value={formData.pit}
            onChange={e => setFormData({...formData, pit: e.target.value})}
            className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Luas Reklamasi (Ha)</label>
          <input 
            type="number" 
            step="0.01"
            required
            value={formData.luasReklamasi}
            onChange={e => setFormData({...formData, luasReklamasi: e.target.value})}
            className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Penanggung Jawab</label>
          <input 
            type="text" 
            required
            value={formData.penanggungJawab}
            onChange={e => setFormData({...formData, penanggungJawab: e.target.value})}
            className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
        </div>
        <div className="lg:col-span-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Keterangan</label>
          <input 
            type="text" 
            value={formData.keterangan}
            onChange={e => setFormData({...formData, keterangan: e.target.value})}
            className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
        </div>
      </div>

      {selectedNursery && (
        <div className="bg-green-50/50 p-4 rounded-xl border border-green-100 flex gap-6 mt-4 mb-4">
          <div>
            <span className="block text-[10px] text-green-700 uppercase font-bold tracking-wider">Bibit Masuk</span>
            <span className="text-sm font-bold text-green-900">{stokMasuk} batang</span>
          </div>
          <div>
            <span className="block text-[10px] text-rose-700 uppercase font-bold tracking-wider">Bibit Keluar</span>
            <span className="text-sm font-bold text-rose-900">{stokKeluar + (parseInt(formData.jumlahKeluar) || 0)} batang</span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-700 uppercase font-bold tracking-wider">Sisa Stok</span>
            <span className={`text-sm font-bold ${stokTersedia - (parseInt(formData.jumlahKeluar) || 0) < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {stokTersedia - (parseInt(formData.jumlahKeluar) || 0)} batang
            </span>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
        >
          Batal
        </button>
        <button
          type="submit"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-green-600 hover:bg-green-700 text-white transition-colors"
        >
          <FileCheck2 size={14} />
          Simpan Transaksi
        </button>
      </div>
    </form>
  );
}
