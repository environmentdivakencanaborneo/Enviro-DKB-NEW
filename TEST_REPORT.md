# Laporan Pengujian & Verifikasi Audit — DEM (Diva Enviro Monitor) v3.1.0

**Tanggal Pengujian:** 2026-11-15  
**Lingkup:** Remediasi Audit Menyeluruh (P0, P1, P2) & Pengujian Otomatis Section 7 (A–E)  
**Perusahaan:** PT Diva Kencana Borneo (PT DKB)

---

## 1. Ringkasan Eksekutif

| Pemeriksaan | Perintah / Mekanisme | Status | Hasil & Catatan |
| :--- | :--- | :--- | :--- |
| **TypeScript Check** | `npx tsc --noEmit` | **LULUS** | 0 error pada seluruh berkas `/src/**` dan `/tests/**`. |
| **Lint Check** | `npm run lint` (`tsc --noEmit`) | **LULUS** | Skrip lint proyek menjalankan `tsc --noEmit` (0 error). ESLint terpisah tidak terpasang di `package.json`. |
| **Production Build** | `npm run build` (`vite build && esbuild server.ts`) | **LULUS** | 2.984 modul tertransformasi (21,46 detik), `dist/server.cjs` 3,0 kB. Chunk inti `index-Dzr8hfw8.js` = **1.324,91 kB** (gzip **319,08 kB**); vendor lazy terpisah: `exceljs` (939,77 kB), `firebase` (700,81 kB), `recharts` (463,68 kB). |
| **Unit & Integration Tests** | `npx tsx --test tests/*.test.ts` | **LULUS (36/36)** | 6 suite pengujian (`waterQuality`, `firestoreRules`, `wasteB3`, `ghg`, `backupCrypto`, `regulatoryAndValidation`), **36 test case lulus, 0 gagal** (4,14 detik). |
| **Deploy `firestore.rules`** | `DeployRules` RPC (`service: fax`) | **SELESAI** | Berhasil men-deploy `firestore.rules` Revisi 06 tanpa error (`{}`). |
| **Firestore Emulator Runtime** | `firebase emulators:exec` | **TIDAK DAPAT DIJALANKAN DI CONTAINER** | Binary `java` (JDK/JRE) tidak tersedia pada lingkungan container sandbox (`java: not found`). Pengujian keamanan Firestore digantikan oleh verifikasi invarian statis (`tests/firestoreRules.test.ts` — 5/5 lulus) dan memerlukan uji emulator pada mesin dengan JDK terpasang. |

---

## 2. Rincian Pengujian Otomatis (`tests/*.test.ts`)

### A. Pencemaran Air & Evaluasi Baku Mutu (`tests/waterQuality.test.ts` — 9/9 LULUS)
1. Semua parameter memenuhi standar terverifikasi → menghasilkan `MEMENUHI` (`Safe`).
2. Salah satu parameter melampaui baku mutu (`tss = 315` > `300`) → `TIDAK MEMENUHI` (`Exceeded`).
3. Nilai kosong (`null`, `undefined`, `""`, `NaN`, `Infinity`) → `parseStrictNumber` mengembalikan `null` (tidak pernah dikonversi menjadi `0`) dan evaluasi menghasilkan `DATA TIDAK LENGKAP`.
4. Satuan pengukuran tidak cocok (`unitMap: { tss: 'g/L' }` terhadap standar `mg/L`) → `DATA TIDAK LENGKAP`.
5. Standar berstatus `Perlu verifikasi` / `MENUNGGU VERIFIKASI` (`STD-WW-PERTEK-2025-TSS`, `STD-SW-FE`, `STD-SW-MN`) → `BELUM DIEVALUASI` (dilarang mengeluarkan `MEMENUHI`).
6. Standar khusus titik penaatan (`locationCode: 'KPL-02'`) mengalahkan standar umum.
7. Transisi tanggal berlaku (`effectiveFrom` / `effectiveTo`) memilih standar 2025 untuk `2025-12-31` dan standar 2026 untuk `2026-01-01`.
8. Nilai tepat sama dengan ambang batas (`tss = 300`, `ph = 9.0`) diperlakukan inklusif (`MEMENUHI`).
9. Standar dengan `applicable: false` menghasilkan `TIDAK BERLAKU` (`NotApplicable`) dan tidak memicu pelanggaran palsu.

### B. Keamanan Firestore Rules Revisi 06 (`tests/firestoreRules.test.ts` — 5/5 LULUS + Catatan Lingkungan)
- Memverifikasi keberadaan aturan keras pada `/firestore.rules`:
  - `isVerifiedUser()` wajib `request.auth != null && request.auth.token.email_verified == true`.
  - `isApprovedUser()` memakai logika `AND` ketat (`isApproved == true && status == 'Active' && isActive != false && deleted != true` dan menolak `Pending`, `Suspended`, `Disabled`, `Rejected`, `Deleted`).
  - Registrasi mandiri `/users/{uid}` dikunci ke `role == 'Viewer'`, `isApproved == false`, `status == 'Pending'`, dan pembaruan oleh pemilik akun dilarang mengubah kolom `role`, `isApproved`, `status`, `isActive`, `deleted`, `approvedBy`, `approvedAt`.
  - Koleksi `/roles/{email}` dikunci ke `isActiveMember() && isStrictAdmin()`.
  - Koleksi `/audit_logs/{logId}` immutable (`allow update: if false; allow delete: if false;`), mengikat `uid == request.auth.uid`, `user == request.auth.token.email`, `timestamp == request.time`, serta whitelist kolom via `keys().hasOnly(...)`.
  - QR publik `/evidence_verify/{token}` membolehkan `get` tetapi memblokir `list` (`allow list: if false;`), serta `/evidence_reports/{id}` memisahkan penyiap ≠ pemeriksa ≠ penyetuju dengan kunci `snapshotHash`.
- **Keterbatasan Lingkungan Sandbox:** Uji runtime terhadap Firebase Firestore Emulator tidak dapat dieksekusi di container ini karena runtime Java (`java`) tidak tersedia. Jalankan `firebase emulators:exec --only firestore` pada lingkungan CI/lokal dengan JDK 17+ sebelum pelaporan eksternal.

### C. Limbah B3 FIFO & Batas Masa Simpan (`tests/wasteB3.test.ts` — 5/5 LULUS)
1. Batas masa simpan berbeda per jenis limbah (`90 / 180 / 365 hari`) sesuai katalog.
2. Alokasi FIFO mendahulukan batch dengan `dateIn` lebih lama (`WI-OLDER` habis sebelum `WI-NEWER` dikurangi).
3. & 4. Filter `asOfDate` menghitung transaksi keluar dengan `dateOut <= asOfDate` dan mengabaikan transaksi keluar `dateOut > asOfDate` agar saldo historis akurat.
4. & 6. Pengeluaran melebihi stok (`shortfallKg > 0`) ditolak tanpa otorisasi; hanya diizinkan bila `correctionOverride.authorized === true` dengan alasan koreksi `>= 5` karakter.
5. Jenis limbah yang belum terkonfirmasi Rintek atau di luar katalog ditandai `PERLU VERIFIKASI`.

### D. Inventarisasi GRK (`tests/ghg.test.ts` — 5/5 LULUS)
1. & 2. `filterCompatibleGhgFactors()` menyaring faktor sesuai `activityCategory`, `unit` ter-normalisasi, dan `effectiveYear <= reportingYear`.
2. Faktor kosong menghasilkan `emissionsTco2e: null` dan `calculationStatus: 'BELUM TERHITUNG'` (bukan `0`).
3. Satuan aktivitas tidak sesuai faktor menghasilkan `PERLU VERIFIKASI` dan `emissionsTco2e: null`.
4. & 6. Pembaruan nilai/scope pada master `ghg_factors` tidak mengubah total historis karena `summarizeGhgByScope()` membaca snapshot yang terkunci pada dokumen aktivitas.
5. Rekap per Scope menghitung `Scope 1`, `Scope 2`, `Scope 3`, serta menghitung item `BELUM TERHITUNG` dan `PERLU VERIFIKASI` secara terpisah.

### E. Enkripsi Backup AES-256-GCM & Pemulihan (`tests/backupCrypto.test.ts` — 7/7 LULUS)
1. `collectInventorySnapshot()` mencakup seluruh 32 koleksi pada `BACKUP_COLLECTION_KEYS`.
2. Berkas backup tidak dikenal / korup ditolak dengan error eksplisit.
3. Kata sandi < 8 karakter dan kata sandi dekripsi yang salah ditolak oleh Web Crypto AES-256-GCM.
4. Siklus enkripsi → dekripsi + verifikasi SHA-256 mengembalikan data utuh (`checksumValid: true`).
5. Pemulihan penuh berhasil menulis seluruh dokumen (`failedCount: 0`).
6. Kegagalan di tengah proses pemulihan dilaporkan jujur (`isAtomic: false`, `failedCount > 0`, `unprocessedCollections`, `errors`).
7. – 9. Mode `merge` mempertahankan data lama di luar cadangan; mode `replace` mewajibkan `adminConfirmedReplace: true`, menghapus dokumen ekstra pada koleksi inventaris tanpa menyentuh `RESTORE_EXCLUDED_COLLECTIONS` (`users`, `roles`, `audit_logs`, `counters`, dll.), serta menghasilkan ringkasan jumlah dokumen sebelum & sesudah yang akurat.

### F. Validasi Schema, Kalender & Keanggotaan Ketat (`tests/regulatoryAndValidation.test.ts` — 5/5 LULUS)
1. `isValidCalendarDate` menolak tanggal tidak sah seperti `2025-02-29`, `2026-04-31`, `2026-13-01`.
2. `WastewaterSchema` & `GhgActivitySchema` menolak `NaN` dan `Infinity`.
3. `RegulatoryWatchSchema` mendukung 5 status (`DRAFT`, `MENUNGGU VERIFIKASI`, `BERLAKU`, `DIUBAH`, `DICABUT`) serta `issueDate: ''` tanpa memaksa tanggal rekaan.
4. `EnvironmentalStandardSchema` memvalidasi status siklus hidup baku mutu dan kolom `applicable`.
5. `isActiveApproved` menegakkan logika `AND` ketat (`Pending`, `Suspended`, `Active` dengan `isApproved: false`, `isActive: false`, `deleted: true` seluruhnya ditolak).

---

## 3. Dependensi Infrastruktur & Item Menunggu Verifikasi Dokumen PT DKB

1. **Infrastruktur Backend (P0.4 — Cloud Functions & Custom Claims):**
   - Aplikasi ini berjalan sebagai React SPA + Firebase SDK + `server.ts`. Penulisan `/audit_logs` di klien telah diperketat (`AuditWriteResult` eksplisit + aturan append-only di Firestore), tetapi belum ada *Cloud Functions* backend untuk audit log berbasis server trigger (`onDocumentWritten`) maupun sinkronisasi `role` via *Firebase Auth Custom Claims*.
2. **Item Menunggu Verifikasi Dokumen Resmi PT DKB:**
   - **SK Pertek Air Limbah Terbaru (`STD-WW-PERTEK-2025-TSS`)**: Nilai ambang batas TSS resmi (`maxLimit: null`, `MENUNGGU VERIFIKASI`) perlu diisi oleh Environment Superintendent berdasarkan dokumen SK Pertek sah PT DKB.
   - **Air Permukaan Kelas II (`STD-SW-FE`, `STD-SW-MN`)**: Nilai `0,3 mg/L` dan `0,1 mg/L` berstatus `Perlu verifikasi` hingga dikonfirmasi terhadap klasifikasi/persetujuan badan air penerima pada Persetujuan Lingkungan.
   - **Rincian Teknis Penyimpanan TPS LB3 (`wasteCatalog.ts`)**: Durasi simpan `90 / 180 / 365 hari` perlu dicocokkan per kode limbah dengan Rintek TPS LB3 PT DKB.
   - **Regulasi `MENUNGGU VERIFIKASI` (`REGULATORY_WATCH_SEED_15`)**: Nomor dan tanggal resmi regulasi 2025–2026 (antara lain revisi Permen Lab Lingkungan 2026, Permen LH/BPLH terkait GRK & Pengawasan) belum diisi secara otomatis dan menunggu verifikasi dokumen resmi JDIH.
   - **Migrasi Data Produksi**: Jalankan `runSafeDataMigrations()` dari panel Admin pada data produksi setelah meninjau cadangan terenkripsi terlebih dahulu.
