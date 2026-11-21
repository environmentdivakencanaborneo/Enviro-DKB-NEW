# Changelog — DEM (Diva Enviro Monitor)

Seluruh perubahan utama hingga versi **3.1.0 (Remediasi Audit Menyeluruh P0/P1/P2)** pada proyek **DEM — Diva Enviro Monitor** (PT Diva Kencana Borneo).

---

## [3.1.0] — 2026-11-15 (Remediasi Audit Keamanan, Kepatuhan & Integritas Data)

### 1. Prioritas P0 — Perbaikan Kritis Keamanan & Integritas Data
- **[P0.1] Antitesis Coercion Nol & Evaluasi Kepatuhan 5-Status (`waterQualityEval.ts`, `MonitoringView.tsx`, `DomesticWastewaterView.tsx`, `DashboardView.tsx`, `ReportsView.tsx`, `evidenceCalc.ts`, `exportService.ts`)**:
  - Mengganti seluruh `parseFloat(...) || 0` dengan `parseStrictNumber` (mengembalikan `null` untuk kosong/`NaN`/`Infinity`).
  - Menerapkan kesimpulan eksplisit `MEMENUHI`, `TIDAK MEMENUHI`, `DATA TIDAK LENGKAP`, `BELUM DIEVALUASI`, dan `TIDAK BERLAKU`.
  - Menghapus fallback regulasi keras dan mewajibkan kesesuaian satuan (`unitMap`).
- **[P0.2] Baku Mutu Dinamis Berbasis Titik Penaatan, Tanggal & Verifikasi Resmi (`regulations.ts`, `StandardsConfigModal.tsx`, `StandardsMasterView.tsx`, `migrations.ts`)**:
  - Menghapus nilai TSS 150 mg/L / 300 mg/L yang sebelumnya ditetapkan sepihak pada kode tanpa nomor SK terverifikasi (`STD-WW-PERTEK-2025-TSS` dibiarkan `maxLimit: null`, `verificationStatus: 'Perlu verifikasi'`, `effectiveStatus: 'MENUNGGU VERIFIKASI'`).
  - Menambahkan lifecycle `DRAFT | MENUNGGU VERIFIKASI | BERLAKU | DIUBAH | DICABUT`, `locationCode`, `effectiveFrom`/`effectiveTo`, `applicable`, dan `revisionHistory` di `/standards/{id}`.
- **[P0.3] Hardening Firebase Auth & Firestore Rules Revisi 06 (`authService.tsx`, `AuthView.tsx`, `permissionService.ts`, `firestore.rules`, `App.tsx`)**:
  - Menegakkan gerbang ganda `emailVerified`, `isActiveApproved()` (`status === 'Active' && isApproved === true && isActive !== false && deleted !== true`), serta blokir akun `Suspended`/`Pending`/`Disabled`/`Rejected`/`Deleted`.
  - Memisahkan akun *break-glass*, menolak *self-approval* & *self-escalation* pada `/users/{uid}` dan `/roles/{email}`, serta mengunci QR publik `/evidence_verify/{token}` dengan `allow list: if false`.
- **[P0.4] Penguatan Audit Trail (`auditService.ts`, `dbService.ts`, `firestore.rules`)**:
  - Mengembalikan `AuditWriteResult` eksplisit (`success`/`error`) dengan notifikasi peringatan bila audit gagal, serta mencatat `beforeData`, `afterData`, `correctionReason`, dan `module` ke `/audit_logs` (*immutable append-only* dengan `keys().hasOnly`).
  - *Catatan*: Pencegahan bypass total oleh klien yang dimodifikasi tetap memerlukan implementasi Cloud Functions backend tepercaya.
- **[P0.5] Penggantian `alert()` / `window.open()` dengan Toast & Safe UI (`MonitoringView.tsx`, `WasteB3View.tsx`, `RegulatoryWatchView.tsx`, `SettingsModals.tsx`)**: Mengganti panggilan `alert()` yang tersisa dengan `triggerToast()`.

### 2. Prioritas P1 — Konsistensi Domain & Akurasi Perhitungan
- **[P1.1] Masa Simpan Limbah B3 per Jenis & Ledger Historis (`wasteCatalog.ts`, `wasteLedger.ts`, `WasteB3View.tsx`, `dbService.ts`)**:
  - Mengganti asumsi seragam 90 hari dengan katalog per jenis limbah (`90 / 180 / 365 hari` beserta flag `PERLU VERIFIKASI` sebelum cek Rintek TPS).
  - Menambahkan filter `asOfDate` historis serta blokir stok negatif tanpa otorisasi `Superintendent+` dan alasan koreksi minimal 5 karakter.
- **[P1.2] Integritas Perhitungan Emisi GRK (`ghgCalc.ts`, `GhgInventoryView.tsx`, `dbService.ts`, `exportService.ts`)**:
  - Faktor emisi disaring ketat berdasarkan kategori, satuan, dan tahun berlaku (`effectiveYear <= reportingYear`).
  - Faktor kosong menghasilkan `emissionsTco2e: null` dan `BELUM TERHITUNG` (bukan `0`), serta menyimpan snapshot faktor lengkap pada aktivitas sehingga pembaruan master tidak mengubah riwayat historis.
- **[P1.3] Enkripsi Backup AES-256-GCM & Laporan Restore Non-Atomik (`collections.ts`, `backupService.ts`, `SettingsModals.tsx`)**:
  - Menginventarisasi seluruh 32 koleksi di `BACKUP_INVENTORY`, mengenkripsi cadangan lokal & Drive dengan `AES-256-GCM` + `PBKDF2-SHA256` + `SHA-256`, mengecualikan koleksi sistem pada `RESTORE_EXCLUDED_COLLECTIONS`, dan menyajikan laporan gagal/parsial secara jujur untuk mode `merge` dan `replace`.
- **[P1.4] Integritas Regulatory Watch & Validasi Kalender (`validation.ts`, `RegulatoryWatchView.tsx`, `regulations.ts`)**:
  - Menghapus asumsi tanggal terbit/berlaku pada regulasi 2025–2026 yang belum terverifikasi (`MENUNGGU VERIFIKASI`, `issueDate: ''`), memisahkan tanggal penetapan/pengundangan/berlaku, serta menambahkan validator kalender ketat `isValidCalendarDate` dan anti-`NaN`/`Infinity`.

### 3. Prioritas P2 & Pengujian Otomatis (`tests/*.test.ts`)
- **[P2.1–P2.3] Isolasi Cache Lokal & Konsistensi UI (`googleSync.ts`, `authService.tsx`, `StatusBadge.tsx`, `PublicVerifyView.tsx`)**: Menambahkan namespace `uid` dan TTL 12 jam pada cache lokal, pembersihan menyeluruh saat logout, serta badge eksplisit untuk `Data Tidak Lengkap`, `Belum Dievaluasi`, `Perlu Verifikasi`, dan `Tidak Berlaku`.
- **[Section 7] Penambahan 6 Suite Pengujian Otomatis (`tests/*.test.ts`)**: Pengujian unit & integrasi untuk `waterQualityEval`, `wasteLedger`, `ghgCalc`, `backupService` (AES-256-GCM + merge/replace/mid-failure), `validation`/`permissionService`, serta verifikasi invarian statis `firestore.rules`.

---

## [3.0.1] — 2026-11-14

### Penghapusan Modul
- Menghapus menu dan modul **Kewajiban Kehutanan (`forestry_ppkh` — PPKH & Rehabilitasi DAS)** beserta seluruh komponen, schema Zod, service CRUD, listener Firestore, aturan `firestore.rules`, dan entri `firebase-blueprint.json`, karena seluruh area konsesi perusahaan berada pada **Areal Penggunaan Lain (APL)**. Kelompok menu disesuaikan menjadi **Reklamasi & Pascatambang**.

---

## [3.0.0] — 2026-11-14

### 1. Pengamanan Kritis, Tinggi & Hardening Firestore Rules (`CRIT-`, `HIGH-`, `SR-`, `SEC-`)
- **[CRIT-01 / SR-02] Isolasi Akun Nonaktif pada `isApprovedUser()`**: Menolak akun berstatus `Pending`, `Disabled`, `Rejected`, `Deleted`, atau memiliki `isActive == false` maupun `deleted == true` di `firestore.rules` dan disinkronkan dengan `isActiveApproved()` di `permissionService.ts`.
- **[CRIT-02 / SR-05] Kompatibilitas Timestamp & Audit Trail `vNurseryStockOut()` & Validator Domain**: Mendukung tipe `timestamp` (`serverTimestamp()`) maupun string ISO pada `createdAt`/`updatedAt` serta memperketat validator skema pada `surfacewater`, `rainfall`, `nursery`, `nursery_stock_out`, `reclamation` (`RP-`/`RG-`), `waste_b3` (`WI-`/`WO-`), `solid_waste`, dan `costs`.
- **[CRIT-03] Perbaikan `vEnvDocument()` pada `/documents/{docId}`**: Penyelarasan validator dokumen Persetujuan Lingkungan (`DOC-*`) dan agenda kepatuhan (`EV-*`).
- **[HIGH-03] Pengamanan Koleksi Publik QR `/evidence_verify/{token}`**: `allow get: if true;` (scan QR publik tanpa login), `allow list: if false;` (mencegah enumerasi token), validasi `vEvidenceVerify()`, dan pembatasan transisi status berdasarkan peran (`Operator` -> `Disiapkan`, `Foreman` -> `Diperiksa`, `Admin` -> `Disetujui`/`Dibatalkan`, `Superintendent` -> revisi `Disiapkan`).
- **[SR-01 / SEC-] Audit Trail Immutable Append-Only**: Pengetatan `/audit_logs/{logId}` (`uid == request.auth.uid`, `user == request.auth.token.email`, `timestamp == request.time`, whitelist kolom & aksi, `details.size() <= 1000`, serta blokir permanen `update` dan `delete`).
- **[SR-03 / SEC-] Pembatasan Baca Profil `/users/{userId}`**: Hanya dapat dibaca oleh pemilik UID bersangkutan atau `isAdmin()`.
- **[SR-04 / SEC-] Hardening `/notifications` & `/alerts`**: Wajib `isActiveMember()` + validator `vNotification()` saat `create`/`update`; hapus dibatasi `isSuperintendent()`.
- **[SR-06 / SEC-] Sinkronisasi Hierarki `ROLE_RANK`**: Penyelarasan peringkat 7 peran (`Viewer 0 < Auditor 1 < Operator 2 < Foreman 2.5 < Environment Superintendent 3 < Environment Manager 4 < Admin 5`) antara `src/utils/roles.ts`, `src/services/permissionService.ts`, dan `firestore.rules` (termasuk alias `Manager`/`Env Manager` -> `Environment Manager`).
- **[SR-07 / SEC-] Isolasi Akun Darurat (*Break-Glass Admin*)**: Pemisahan email darurat ke helper `isBreakGlassAdmin()` di `firestore.rules`, sedangkan administrasi peran reguler dikelola melalui koleksi `/roles/{email}`.
- **[SEC-] Proteksi Privilege Escalation Registrasi**: Pendaftar baru pada `/users/{uid}` dikunci dengan `role == 'Viewer'` dan `isApproved == false`; field sensitif (`role`, `isApproved`, `status`, `approvedBy`, `approvedAt`) dilarang diubah oleh pengguna biasa pada `update`.

### 2. Integritas Data & Validasi (`DATA-`)
- **[DATA-01] Ledger FIFO Limbah B3 (`wasteLedger.ts` & `dbService.ts`)**: Perhitungan stok aktual per jenis & umur simpan TPS berbasis alokasi FIFO dari `waste_in` dan `waste_out`, disertai blokir penghapusan/perubahan batch yang menyebabkan *shortfall* manifest keluar.
- **[DATA-02] Penomoran Evidence Atomik & Hash SHA-256 (`evidenceService.ts`)**: `runTransaction` pada `/counters/{id}` (`FR-EMS-WQ-YYYY-xxxxx`), pemisahan penyiap vs pemeriksa vs penyetuju, deteksi perubahan data sumber (*snapshot hash mismatch*), dan penolakan penerbitan tanpa foto sampling.
- **[DATA-03] Master Baku Mutu Dinamis (`/standards` & `/app_meta`)**: Evaluasi air limbah tambang (`wastewater`), air permukaan (`surfacewater`), dan air limbah domestik (`domestic_wastewater`) membaca master koleksi `standards/{id}` serta konfigurasi internal `app_meta/env_thresholds` dan `app_meta/proper_criteria`.
- **[DATA-04] Validasi Zod Terpadu (`src/utils/validation.ts`)**: Penambahan dan pembaruan skema Zod untuk seluruh entitas lama maupun 7 koleksi modul baru FASE 3.

### 3. Pemutakhiran Regulasi Lingkungan & Pertambangan (`REG-` — FASE 2)
- **[REG-01] Pengelolaan Sampah & Limbah Non-B3**: Menghapus rujukan keliru ke `Permen LH 7/2025` pada modul sampah dan menggantinya dengan `UU No. 18/2008`, `PP No. 81/2012`, dan `Permen LHK No. 19/2021`, dengan target persentase pemilahan internal yang dapat dikonfigurasi (`app_meta/env_thresholds`, default `30%`).
- **[REG-02] PROPER**: Memperbarui rujukan dari `Permen LHK No. 1/2021` (dicabut) ke `Permen LH/BPLH No. 7 Tahun 2025`, menambahkan peringkat aktual `Hitam`, dan memindahkan kriteria penilaian ke master data yang dikelola Superintendent (`app_meta/proper_criteria`).
- **[REG-03] RKAB Tahunan**: Memperbarui rujukan dari `Permen ESDM No. 10/2023` ke `Permen ESDM No. 17 Tahun 2025 jo. Permen ESDM No. 6 Tahun 2026`.
- **[REG-04] Reklamasi & Jaminan Pascatambang**: Menambahkan rujukan `Kepmen ESDM No. 344.K/MB.01/MEM.B/2025` (termasuk Deposito Berjangka pada Bank Pemerintah) dan catatan sinkronisasi terhadap `Kepmen ESDM No. 1827 K/30/MEM/2018`.
- **[REG-05] Perizinan Berusaha & Persetujuan Lingkungan**: Memperbarui rujukan dari `PP 5/2021` ke `PP No. 28 Tahun 2025` & `Permen LH/BPLH No. 22 Tahun 2025`.
- **[REG-06] Air Permukaan & Air Limbah Tambang**: Memisahkan pH/Fe/Mn (`Kepmen LH 113/2003`) dan TSS (`SK Pertek PT DKB No. 503/IPAL-LH/DPM-PTSP/2021` / `Perda Kaltim 2/2011`), serta menandai Fe terlarut & Mn terlarut Kelas II (`PP 22/2021 Lamp. VI`) berstatus `Perlu verifikasi`.
- **[REG-07] Kehati & TSL Dilindungi**: Memperbaiki rujukan ke `Permen LHK No. P.106/2018` dan `UU No. 32 Tahun 2024`.
- **[REG-08] Pertambangan Minerba**: Pemutakhiran payung hukum ke `UU No. 4/2009 jo. UU No. 2 Tahun 2025` (Perubahan Keempat).
- **[REG-09] Katalog Regulatory Watch**: Pemutakhiran seed 15 regulasi utama KLH/BPLH, ESDM, Kehutanan, dan Kaltim (`REGULATORY_WATCH_SEED_15`).

### 4. Struktur Menu & 7 Modul Baru (FASE 3)
- Penataan ulang navigasi menjadi **9 kelompok menu** dengan subjudul dasar regulasi terstruktur dan tautan cepat ke `regulatory_watch`, serta fitur pencarian menu `Ctrl/Cmd+K` (`MenuSearchModal`).
- **Modul baru yang dibangun lengkap (Schema Zod, Service CRUD + Offline Cache + Audit Trail, Listener Firestore, Rules, View + Ekspor Excel)**:
  1. `pertek_slo` — Register Pertek & SLO (`Permen LHK 5/2021`)
  2. `reporting_calendar` — Kalender Pelaporan Wajib dengan pengingat H-30/H-14/H-7
  3. `supervision` — Pengawasan Eksternal & Sanksi Administratif (`Permen LH/BPLH 6/2026`)
  4. `domestic_wastewater` — Air Limbah Domestik IPAL Camp & Kantor (`Permen LH/BPLH 11/2025`)
  5. `ghg_inventory` — Inventarisasi Emisi GRK & Master Faktor Emisi (`Perpres 110/2025`, `Permen LH/BPLH 7/2026`)
  6. `reclamation_guarantee` — Modul khusus Jaminan Reklamasi & Pascatambang (`Kepmen ESDM 344.K/2025`)
  7. `forestry_ppkh` — Kewajiban Kehutanan PPKH & Rehabilitasi DAS
  8. `standards_master` — Master Baku Mutu (`standards/{id}`) & Ambang Internal

### 5. Performa, Kualitas UI & Tema Neon Mining Ops (`PERF-`, `QA-`, FASE 4)
- **[PERF-01] Code Splitting View & Vendor Chunking**: 25 modul berat dimuat melalui `React.lazy` + `Suspense`, dan `vite.config.ts` memecah vendor besar (`exceljs`, `firebase`, `recharts`) ke `manualChunks` terpisah (catatan: chunk inti `index-*.js` saat ini masih > 500 kB karena beberapa komponen tetap terimpor statis di `App.tsx`).
- **[QA-01] Perbaikan Hydration Error Tabel Reklamasi**: Menghapus text-node spasi berlebih di dalam elemen `<tr>` pada `ReclamationView.tsx`.
- **[QA-02] Sinkronisasi `TableSkeleton` & Error Boundary**: Penyeragaman prop `columns` pada `TableSkeleton` di seluruh modul lazy serta pembungkusan tiap modul dengan `ModuleErrorBoundary`.
- **[FASE 4] Redesign Visual Tema "Neon Mining Ops"**: Pembaruan design token Tailwind v4 (`src/index.css`) dengan mode gelap default, dukungan toggle mode terang, tipografi *Space Grotesk / Inter / JetBrains Mono* (`tabular-nums`), panel kaca neon, badge status kepatuhan (`Memenuhi` / `Mendekati` / `Melampaui` / `Dipantau`), dan grafik `NEON_CHART` di seluruh komponen.
