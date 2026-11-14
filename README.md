# DEM — Diva Enviro Monitor (v3.0.0)

Sistem Manajemen Lingkungan & Kepatuhan Pertambangan Batubara Terintegrasi untuk **PT Diva Kencana Borneo (PT DKB)**, Kalimantan Timur.

Dibangun dengan **React 19, TypeScript 5.8, Vite 6, Tailwind CSS v4 (tema *Neon Mining Ops*)**, serta **Firebase Authentication & Cloud Firestore** dengan aturan keamanan ABAC (*Attribute-Based Access Control*) Revisi 05, *offline cache*, ekspor Excel (`exceljs`), verifikasi QR publik, dan pencadangan Google Drive.

---

## Daftar Modul (32 Modul dalam 9 Kelompok Menu)

### 1. Ringkasan & Kinerja
1. **Dashboard Operasional (`dashboard`)** — Ringkasan harian kepatuhan air limbah, air permukaan, curah hujan, stok LB3 TPS, pemilahan sampah, dan peringatan dini.
2. **Dashboard Eksekutif & ESG (`executive`)** — Ikhtisar tata kelola manajemen, kepatuhan RKL-RPL, Jamrek, CAPA, dan insiden lingkungan (*Superintendent+*).
3. **PROPER & RKAB Lingkungan (`proper_rkab`)** — Evaluasi peringkat PROPER (Emas, Hijau, Biru, Merah, Hitam) dengan kriteria master yang dikelola Superintendent, serta target & realisasi RKAB tahunan (*Superintendent+ / Auditor read-only*).

### 2. Persetujuan & Kepatuhan
4. **Persetujuan Lingkungan & Perizinan (`documents`)** — Register AMDAL/UKL-UPL, Addendum, PB, dan OSS Berbasis Risiko beserta agenda kepatuhan.
5. **Register Pertek & SLO (`pertek_slo`) `[BARU]`** — Register Persetujuan Teknis & Surat Kelayakan Operasional (air limbah, emisi, penyimpanan LB3), titik penaatan, masa berlaku, dan kewajiban pelaporan.
6. **Matriks Kewajiban RKL-RPL & Pertek (`compliance_matrix`)** — Pemantauan pemenuhan kewajiban RKL-RPL & persyaratan Pertek.
7. **Kalender Pelaporan Wajib (`reporting_calendar`) `[BARU]`** — Jadwal & tanda terima pelaporan periodik (RKL-RPL semesteran, laporan Pertek, neraca & logbook LB3, laporan GRK tahunan Maret, RKAB, dan laporan reklamasi) dengan pengingat H-30 / H-14 / H-7.
8. **Regulatory Watch (`regulatory_watch`)** — Pemantauan perubahan regulasi KLH/BPLH, ESDM, Kementerian Kehutanan, dan Pemda (*Superintendent+ / Auditor read-only*).
9. **Register IADL & Risiko (ISO 14001) (`iadl_risk`)** — Identifikasi Aspek & Dampak Lingkungan beserta mitigasi risiko operasional.
10. **Pengawasan Eksternal & Sanksi Administratif (`supervision`) `[BARU]`** — Catatan inspeksi instansi eksternal (DLH/KLH/ESDM/Kehutanan), berita acara pengawasan, tindak lanjut sanksi, dan tautan ke CAPA.

### 3. Pengendalian Pencemaran Air
11. **Air Limbah Tambang, Air Permukaan & Curah Hujan (`monitoring`)** — Pemantauan harian outlet KPL (`pH`, `TSS`, `Debit`, `Fe`, `Mn`), badan air penerima (`pH`, `TSS`, `DO`, `BOD`, `COD`, `Fe terlarut`, `Mn terlarut`), dan stasiun curah hujan; evaluasi dinamis memakai master `standards/{id}`.
12. **Pengolahan Air Asam Tambang (`amd_treatment`)** — Log pengapuran aktif, flokulasi, lahan basah buatan (*constructed wetland*), dan dosis bahan kimia.
13. **Air Limbah Domestik — IPAL Camp & Kantor (`domestic_wastewater`) `[BARU]`** — Pemantauan efluen IPAL domestik (`pH`, `BOD`, `COD`, `TSS`, `Minyak & Lemak`, `Amoniak`, `Total Coliform`) terintegrasi dengan master baku mutu.
14. **Evidence Hub (`evidence`)** — Penerbitan Berita Acara Sampling Harian & Rekap Bulanan bernomor urut atomik (`FR-EMS-WQ-YYYY-xxxxx`), tanda tangan berjenjang (*Disiapkan -> Diperiksa -> Disetujui*), hash SHA-256 snapshot, cetak A4, ekspor rekap `.xlsx`, dan QR verifikasi publik (`#/verify/:token`).

### 4. Udara, Emisi & Iklim
15. **Udara Ambien, Emisi & Kebisingan (`air_emission`)** — Pemantauan partikulat `PM10`, `PM2.5`, `TSP`, emisi sumber bergerak/tidak bergerak, dan kebisingan.
16. **Inventarisasi Emisi GRK (`ghg_inventory`) `[BARU]`** — Log aktivitas emisi (solar, listrik PLN/genset, peledakan, perubahan lahan), master faktor emisi terkonfigurasi, perhitungan $\text{tCO}_2\text{e}$, dan rekap tahunan untuk pelaporan Maret.

### 5. Pengelolaan Limbah
17. **Limbah B3 — TPS, Logbook, Neraca & Manifest Elektronik (`waste`)** — Logbook masuk/keluar TPS LB3 berbasis alokasi FIFO, pelacakan umur penyimpanan (`75 hari` peringatan dini / `90 hari` default batas), dan manifest elektronik.
18. **Limbah Non-B3 & Sampah Domestik (`solid_waste`)** — Pencatatan sampah organik, anorganik, dan residu dengan KPI persentase pemilahan/pengolahan internal yang dapat dikonfigurasi (default `30%`).

### 6. Reklamasi & Pascatambang *(Area Konsesi 100% APL)*
19. **Reklamasi & Nursery (`reclamation`)** — Inventaris bibit persemaian (*nursery*), penyaluran bibit keluar, rencana & realisasi reklamasi lahan tambang.
20. **Jaminan Reklamasi & Pascatambang (`reclamation_guarantee`) `[BARU]`** — Pengelolaan instrumen jaminan (termasuk Deposito Berjangka Bank Pemerintah), nilai penempatan, status pencairan, dan pemantauan jatuh tempo Jamrek/JamPT.
21. **Tanah Pucuk, Erosi & Sedimentasi (`topsoil_erosion`)** — Neraca *stockpile topsoil*, penanaman *cover crop*, dan pengendalian erosi/sedimentasi.
22. **Keanekaragaman Hayati & TSL Dilindungi (`biodiversity`)** — Inventarisasi flora/fauna, status konservasi, dan pemantauan koridor satwa.

### 7. Insiden & Perbaikan
23. **Insiden & Tanggap Darurat Pencemaran (`incidents`)** — Pelaporan tumpahan, luapan KPL, dan insiden lingkungan beserta tindakan penanggulangan.
24. **CAPA & Temuan (`findings`)** — Pelacakan tindakan korektif dan preventif (*Corrective & Preventive Action*) dari audit internal, PROPER, maupun pengawasan eksternal.

### 8. Biaya & Pelaporan
25. **Biaya Lingkungan (`costs`)** — Rencana & realisasi anggaran OPEX/CAPEX pengelolaan lingkungan (*Superintendent+ / Auditor read-only*).
26. **Laporan Lingkungan Tambang (`reports`)** — Rekapitulasi lintas-modul dan ekspor multi-sheet Excel (`.xlsx`).

### 9. Sistem & Administrasi
27. **Notifikasi & Peringatan Dini (`notifications`)** — Log peringatan pelampauan baku mutu, batas simpan TPS, persetujuan, dan jadwal kepatuhan.
28. **Persetujuan Registrasi (`registration_approval`)** — Verifikasi pendaftar baru (*Pending -> Active / Rejected*) beserta penetapan peran awal (*Manager+*).
29. **Manajemen Pengguna (`user_management`)** — Pengelolaan status akun (*Enable/Disable*, soft-delete, reset password, ubah peran) (*Manager+*).
30. **Matriks Peran / RBAC (`role_management`)** — Konfigurasi matriks hak akses di `app_meta/permission_matrix` (*Admin*).
31. **Audit Trail Sistem (`audit_log`)** — Log aktivitas baca/tulis Firestore yang *immutable append-only* (*Superintendent+ / Auditor read-only*).
32. **Master Baku Mutu & Konfigurasi (`standards_master`) `[BARU]`** — Pengelolaan master koleksi `standards/{id}` dan ambang batas internal (`app_meta/env_thresholds`) (*Superintendent+ / Auditor read-only*).

---

## Tabel Dasar Regulasi per Modul (Pemutakhiran FASE 2–3)

| Modul | Dasar Regulasi Utama di Aplikasi |
| :--- | :--- |
| **Dashboard Operasional (`dashboard`)** | PP No. 22 Tahun 2021 · Kepmen ESDM No. 1827 K/30/MEM/2018 |
| **Dashboard Eksekutif & ESG (`executive`)** | Permen LH/BPLH No. 7 Tahun 2025 · Kepmen ESDM No. 344.K/MB.01/MEM.B/2025 |
| **PROPER & RKAB Lingkungan (`proper_rkab`)** | Permen LH/BPLH No. 7 Tahun 2025 (mencabut Permen LHK No. 1/2021) · Permen ESDM No. 17 Tahun 2025 jo. Permen ESDM No. 6 Tahun 2026 (menggantikan rezim RKAB multi-tahun Permen ESDM 10/2023) |
| **Persetujuan Lingkungan & Perizinan (`documents`)** | PP No. 28 Tahun 2025 (berlaku 5 Juni 2025, menggantikan PP 5/2021) · Permen LH/BPLH No. 22 Tahun 2025 |
| **Register Pertek & SLO (`pertek_slo`)** | Permen LHK No. 5 Tahun 2021 |
| **Matriks Kewajiban RKL-RPL & Pertek (`compliance_matrix`)** | PP No. 22 Tahun 2021 |
| **Kalender Pelaporan Wajib (`reporting_calendar`)** | PP No. 22 Tahun 2021 · Permen ESDM No. 17 Tahun 2025 · Permen LH/BPLH No. 7 Tahun 2026 |
| **Regulatory Watch (`regulatory_watch`)** | Katalog regulasi KLH/BPLH, ESDM, Kementerian Kehutanan & Pemprov Kaltim (termasuk UU No. 2/2025 & UU No. 32/2024) |
| **Register IADL & Risiko (`iadl_risk`)** | ISO 14001:2015 · PP No. 22 Tahun 2021 |
| **Pengawasan Eksternal & Sanksi (`supervision`)** | Permen LH/BPLH No. 6 Tahun 2026 |
| **Air Limbah Tambang, Air Permukaan & Hujan (`monitoring`)** | Kepmen LH No. 113 Tahun 2003 (pH, Fe, Mn) · SK Pertek Air Limbah PT DKB No. 503/IPAL-LH/DPM-PTSP/2021 / Perda Kaltim No. 2/2011 (TSS 300 mg/L) · PP No. 22 Tahun 2021 Lampiran VI Kelas II |
| **Pengolahan Air Asam Tambang (`amd_treatment`)** | Kepmen LH No. 113 Tahun 2003 · Permen LHK No. 5 Tahun 2022 |
| **Air Limbah Domestik (`domestic_wastewater`)** | Permen LH/BPLH No. 11 Tahun 2025 |
| **Evidence Hub (`evidence`)** | Kepmen LH No. 113 Tahun 2003 · PP No. 22 Tahun 2021 |
| **Udara Ambien, Emisi & Kebisingan (`air_emission`)** | PP No. 22 Tahun 2021 Lampiran VII |
| **Inventarisasi Emisi GRK (`ghg_inventory`)** | Perpres No. 110 Tahun 2025 · Permen LH/BPLH No. 7 Tahun 2026 |
| **Limbah B3 (`waste`)** | PP No. 22 Tahun 2021 Lampiran IX · Permen LHK No. 6 Tahun 2021 |
| **Limbah Non-B3 & Sampah Domestik (`solid_waste`)** | UU No. 18 Tahun 2008 · PP No. 81 Tahun 2012 · Permen LHK No. 19 Tahun 2021 (target pemilahan merupakan KPI internal perusahaan) |
| **Reklamasi & Nursery (`reclamation`)** | Kepmen ESDM No. 344.K/MB.01/MEM.B/2025 · Kepmen ESDM No. 1827 K/30/MEM/2018 |
| **Jaminan Reklamasi & Pascatambang (`reclamation_guarantee`)** | Kepmen ESDM No. 344.K/MB.01/MEM.B/2025 (Deposito Berjangka pada Bank Pemerintah) |
| **Tanah Pucuk, Erosi & Sedimentasi (`topsoil_erosion`)** | Kepmen ESDM No. 1827 K/30/MEM/2018 |
| **Keanekaragaman Hayati (`biodiversity`)** | Permen LHK No. P.106/MENLHK/SETJEN/KUM.1/12/2018 · UU No. 32 Tahun 2024 |
| **Insiden & Tanggap Darurat (`incidents`)** | PP No. 22 Tahun 2021 · Kepmen ESDM No. 1827 K/30/MEM/2018 |
| **CAPA & Temuan (`findings`)** | ISO 14001:2015 · Permen LH/BPLH No. 6 Tahun 2026 & No. 7 Tahun 2025 |
| **Biaya Lingkungan (`costs`)** | Permen ESDM No. 17 Tahun 2025 jo. No. 6 Tahun 2026 (RKAB) |
| **Laporan Lingkungan Tambang (`reports`)** | PP No. 22 Tahun 2021 · Kepmen ESDM No. 1827 K/30/MEM/2018 · RKAB/RKL-RPL |
| **Master Baku Mutu & Konfigurasi (`standards_master`)** | Kepmen LH No. 113 Tahun 2003 · Permen LH/BPLH No. 11 Tahun 2025 · PP No. 22 Tahun 2021 |

---

## Hierarki Peran (RBAC) & Akun Break-Glass

### Hierarki `ROLE_RANK`
1. `Viewer` (`0`) — Akses baca modul operasional yang diizinkan (tidak dapat menambah, mengubah, atau menghapus data).
2. `Auditor` (`1`) — Akses baca modul operasional + akses *read-only* khusus ke `audit_log`, `compliance_matrix`, `regulatory_watch`, `proper_rkab`, dan `costs`.
3. `Operator` (`2`) — Tambah/ubah data operasional harian & terbitkan Evidence Harian (`Disiapkan`). Tidak boleh menghapus data.
4. `Foreman` (`2.5`) — Seluruh hak Operator + menandatangani verifikasi Evidence (`Diperiksa`) untuk dokumen yang bukan disiapkan oleh dirinya sendiri.
5. `Environment Superintendent` (`3`) — Hak hapus pada koleksi operasional, kelola Master Baku Mutu (`standards`), ambang internal (`env_thresholds`), kriteria PROPER (`proper_criteria`), dokumen izin, biaya lingkungan, regulasi, Pertek/SLO, Pengawasan Eksternal, dan revisi Evidence.
6. `Environment Manager` (`4`) — Hak administratif (`registration_approval`, `user_management`), persetujuan akhir Evidence (`Disetujui`) & pembatalan (`Dibatalkan`), hapus dokumen/biaya/regulasi/master baku mutu (`isAdmin()` di `firestore.rules`).
7. `Admin` (`5`) — Seluruh kewenangan sistem termasuk `role_management` (`app_meta/permission_matrix`).

> Akun dengan status `Pending`, `Disabled`, `Rejected`, `Deleted`, atau `isActive == false` maupun `deleted == true` ditolak oleh `isApprovedUser()` di `firestore.rules` dan `isActiveApproved()` di `permissionService.ts`.

### Catatan Akun Break-Glass (`isBreakGlassAdmin()`)
Untuk pemulihan darurat apabila seluruh dokumen `/roles/{email}` terhapus atau rusak, `firestore.rules` mengisolasi dua email berikut secara ketat ke helper `isBreakGlassAdmin()`:
- `environmentdivakencanaborneo@gmail.com`
- `admin@divaborneo.co.id`

**Catatan Operasional Keamanan:**
- Email *break-glass* tetap wajib terautentikasi via Firebase Auth dan memiliki akun pengguna yang aktif (tidak diblokir di Firebase Auth).
- Pengelolaan hak administratif harian **wajib** dilakukan melalui koleksi `/roles/{email}` dan menu **Manajemen Pengguna / Persetujuan Registrasi** di dalam aplikasi, bukan dengan menambah email hardcoded ke `firestore.rules`.
- Pastikan kredensial kedua akun *break-glass* disimpan dengan MFA aktif dan dipantau pada log audit.

---

## Menjalankan Proyek & Deploy `firestore.rules`

### Pengembangan Lokal & Build
```bash
# 1. Instal dependensi
npm install

# 2. Jalankan server dev (port 3000)
npm run dev

# 3. Pemeriksaan tipe TypeScript
npm run lint
# atau:
npx tsc --noEmit

# 4. Build produksi
npm run build
```

### Cara Deploy `firestore.rules`

**Opsi A — Firebase CLI (Produksi / Konsol):**
```bash
# 1. Login & pilih project Firebase PT DKB
firebase login
firebase use <PROJECT_ID>

# 2. Validasi & deploy hanya Firestore Security Rules
firebase deploy --only firestore:rules
```

**Opsi B — Melalui AI Studio (lingkungan proyek terhubung):**
- Pastikan file `/firebase-applet-config.json` sudah terkonfigurasi dan `firestore.rules` mutakhir.
- Jalankan aksi deploy rules Firebase (`DeployRules` / tombol deploy Firebase di AI Studio) setiap kali terjadi perubahan pada `/firestore.rules`.

---

## PERLU VERIFIKASI MANUAL

Daftar item regulasi dan ambang teknis berikut **wajib diverifikasi secara manual** oleh *Environment Superintendent* / Tim Legal Lingkungan terhadap dokumen resmi perusahaan dan peraturan terbaru sebelum dijadikan dasar pelaporan eksternal resmi:

1. **(a) Batas Fe & Mn Terlarut Air Permukaan Kelas II (`PP No. 22 Tahun 2021 Lampiran VI`)**:
   - Pada seed aplikasi (`STD-SW-FE = 0,3 mg/L` dan `STD-SW-MN = 0,1 mg/L`), keduanya diberi status `Perlu verifikasi` karena penerapan angka baku mutu logam terlarut badan air Kelas II bergantung pada catatan/klasifikasi dalam Lampiran VI PP 22/2021 dan penetapan kelas badan air penerima dalam Persetujuan Lingkungan site.
2. **(b) Seluruh Baku Mutu Air Limbah Tambang terhadap SK Pertek Terbaru**:
   - Saat ini nilai rujukan TSS (`300 mg/L`) mengacu pada SK Pertek PT DKB No. `503/IPAL-LH/DPM-PTSP/2021` & Perda Kaltim No. 2/2011, sementara pH (`6,0–9,0`), Fe (`7,0 mg/L`), dan Mn (`4,0 mg/L`) mengacu pada Kepmen LH No. 113/2003. Apabila PT DKB telah menerbitkan addendum/Pertek pembuangan air limbah terbaru, perbarui ambang di menu **Master Baku Mutu & Konfigurasi**.
3. **(c) Batas Masa Simpan Limbah B3 per Jenis terhadap Rincian Teknis Penyimpanan di Persetujuan Lingkungan**:
   - Katalog default aplikasi memakai 90/180/365 hari (peringatan dini 75 hari) sesuai kategori umum Permen LHK No. 6/2021. Pastikan durasi maksimal per kode limbah cocok dengan Rincian Teknis (Rintek) penyimpanan LB3 pada Persetujuan Lingkungan TPS PT DKB.
4. **(d) Nomor Permen LH/BPLH Tahun 2026 tentang Laboratorium Lingkungan Hidup**:
   - Verifikasi nomor resmi, tanggal pengundangan, dan ketentuan akreditasi/registrasi laboratorium penguji eksternal (pengganti/pembaruan Permen LHK No. P.23/2020) sebelum mencantumkan nomor peraturan pada Berita Acara atau dokumen legal eksternal.
5. **(e) Irisan Kepmen ESDM No. 1827 K/30/MEM/2018 dengan Kepmen ESDM No. 344.K/MB.01/MEM.B/2025 pada Aspek Reklamasi**:
   - Periksa kembali kesesuaian matriks kriteria keberhasilan reklamasi, format rencana tahunan, dan ketentuan penempatan Jaminan Reklamasi & Pascatambang (Deposito Berjangka pada Bank Pemerintah) antara ketentuan umum GMP 1827/2018 dan pedoman teknis terbaru 344.K/2025.
