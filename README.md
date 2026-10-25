# DEM — Diva Enviro Monitor
**PT Diva Kencana Borneo**

Sistem manajemen dan pemantauan lingkungan pertambangan batubara terintegrasi untuk operasi site PT Diva Kencana Borneo. Aplikasi ini memfasilitasi pencatatan lapangan, evaluasi kepatuhan baku mutu otomatis, audit inventaris limbah, pemantauan revegetasi & reklamasi, kalender kepatuhan regulasi, pelacakan insiden lingkungan & CAPA, serta pelaporan otomatis periodik.

---

## Fitur Utama

1. **Pemantauan Kualitas Air & Hidrologi**
   - **Air Limbah Tambang (KPL / Settling Pond)**: Evaluasi baku mutu otomatis terhadap Kepmen LH No. 113 Tahun 2003 dan SK Pertek Air Limbah PT DKB No. 503/IPAL-LH/DPM-PTSP/2021 (pH 6,0–9,0; TSS maks 300 mg/L; Fe maks 7,0 mg/L; Mn maks 4,0 mg/L; Debit dipantau).
   - **Air Permukaan (Sungai/Badan Air Penerima)**: Evaluasi kepatuhan terhadap baku mutu PP No. 22 Tahun 2021 Lampiran VI Kelas II.
   - **Curah Hujan**: Pencatatan data stasiun penakar hujan harian, intensitas hujan, dan analisis risiko hidrolis kolam pengendap sedimen.

2. **Pengelolaan Limbah**
   - **Limbah Bahan Berbahaya & Beracun (B3)**: Manifest masuk/keluar TPS B3, monitoring masa simpan 90/180/365 hari berbasis tanggal lokal (WITA), dan peringatan kadaluarsa otomatis.
   - **Sampah Padat (Solid Waste)**: Pencatatan neraca sampah domestik/organik/anorganik dan pemilahan daur ulang.

3. **Reklamasi & Pembibitan (Nursery)**
   - Inventarisasi bibit tanaman pionir & klimaks lokal Kalimantan.
   - Pencatatan pengeluaran bibit (Stock-Out) dengan lokasi penanaman terperinci.
   - Perhitungan rasio kesehatan bibit tanaman ('Sehat' / 'Healthy').
   - Pemantauan rencana vs realisasi fisik penataan lahan (Ha) dan anggaran (IDR).
   - Validasi dokumen dana jaminan reklamasi (garansi bank) sesuai ketentuan Ditjen Minerba ESDM.

4. **Kepatuhan Regulasi, Insiden & CAPA**
   - Kalender kewajiban pelaporan lingkungan (RKL-RPL, Simpel, Spph, Proper).
   - Pelaporan insiden tumpahan ceceran B3 / sedimentasi liar dengan tindakan perbaikan & pencegahan (CAPA) terintegrasi.
   - Repositori dokumen legal perizinan lingkungan hidup (AMDAL, UKL-UPL, Izin IPAL).

5. **Pelaporan & Ekspor Data**
   - Generator laporan periodik (Mingguan: Senin–Minggu, Bulanan: Bulan–Tahun) dengan filter leksikografis ISO lokal.
   - Tampilan cetak format A4 portrait siap print/simpan ke PDF.
   - Ekspor seluruh basis data ke spreadsheet Microsoft Excel (`.xlsx`) menggunakan `exceljs`.

---

## Kebutuhan Sistem & Menjalankan Aplikasi

- **Node.js**: versi 18 atau 20+
- **Manajer Paket**: `npm`

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Menjalankan Server Pengembangan
```bash
npm run dev
```
Aplikasi akan berjalan pada port `3000` (atau sesuai konfigurasi env). Akses antarmuka melalui peramban web di `http://localhost:3000`.

### 3. Pengecekan Tipe & Linting Kode
```bash
npm run lint
```

### 4. Build untuk Produksi
```bash
npm run build
```

---

## Variabel Lingkungan (.env)

Aplikasi menggunakan variabel lingkungan berikut (lihat `.env.example`):

| Variabel | Keterangan | Wajib/Opsional |
|----------|------------|----------------|
| `PORT` | Port server Node.js / Express (standar: `3000`) | Opsional |
| `NODE_ENV` | Mode lingkungan (`development` atau `production`) | Opsional |
| `APP_URL` | URL publik tempat aplikasi di-hosting (Cloud Run / domain custom) | Opsional |

---

## Lisensi & Hak Cipta
Hak Cipta © PT Diva Kencana Borneo. Seluruh hak dilindungi undang-undang.
