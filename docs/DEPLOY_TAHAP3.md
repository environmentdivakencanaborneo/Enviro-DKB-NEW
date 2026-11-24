# Panduan Deploy Tahap 3 — Backend Tepercaya (DEM v3.1.0)

Dokumen ini menjelaskan prosedur deploy Cloud Functions for Firebase Gen 2, Firestore Security Rules Revisi 08, Firebase App Check, serta pengaktifan bertahap `app_meta/feature_flags` dan rencana penghentian fallback `/roles/{email}` pada proyek **`dkb-emms`** (PT Diva Kencana Borneo).

---

## 1. Prasyarat Kritis: Verifikasi Lokasi / Region Database Firestore

Lokasi fisik database Firestore `(default)` pada proyek `dkb-emms` **tidak tercatat** di repositori ini. **Jangan menebak region** (`us-central1` vs `asia-southeast2`, dst.) karena ketidakcocokan region antara Firestore trigger dan database atau pemanggilan HTTPS Callable lintas-region akan menyebabkan latency tinggi atau kegagalan trigger/deploy.

Jalankan perintah berikut sebelum deploy pertama:

```bash
gcloud firestore databases describe --database="(default)" --project="dkb-emms" --format="value(locationId)"
```

Contoh output yang mungkin muncul: `asia-southeast2` (Jakarta), `asia-southeast1` (Singapura), atau `us-central1`. Gunakan nilai persis hasil perintah tersebut sebagai `<FIRESTORE_REGION>`:

- Untuk Cloud Functions (deploy & runtime): set variabel `DEM_FUNCTIONS_REGION=<FIRESTORE_REGION>` (mis. pada `functions/.env.dkb-emms` atau environment deploy).
- Untuk aplikasi web (Vite build / `firebase-applet-config.json`): set `VITE_FIREBASE_FUNCTIONS_REGION=<FIRESTORE_REGION>` (atau field `"functionsRegion"` di `firebase-applet-config.json`) sehingga `getFunctions(app, region)` di `src/utils/firebaseAuth.ts` mengarah ke region yang sama.

> **Catatan Billing:** Cloud Functions Gen 2 membutuhkan proyek Firebase pada paket **Blaze (Pay-as-you-go)** serta API Cloud Run, Cloud Build, Artifact Registry, dan Eventarc aktif.

---

## 2. Konfigurasi Firebase App Check (T-08)

Seluruh HTTPS Callable Gen 2 (`reevaluateRange`, `issueDailyEvidence`, `issueMonthlyEvidence`, `reviewEvidence`, `approveEvidence`, `reviseEvidence`, `cancelEvidence`) mengaktifkan `enforceAppCheck: true`.

1. Buka **Google Cloud Console → reCAPTCHA Enterprise → Create Key** untuk domain produksi DEM (`localhost` juga dapat ditambahkan untuk staging/UAT).
2. Buka **Firebase Console → Build → App Check → Apps**, daftarkan Web App DEM dengan provider **reCAPTCHA Enterprise** dan masukkan Site Key.
3. Isi Site Key tersebut ke salah satu:
   - Environment build: `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY=<SITE_KEY>`
   - Atau field `"recaptchaSiteKey": "<SITE_KEY>"` pada `firebase-applet-config.json`.
4. **Penting:** Pastikan App Check sudah aktif dan terverifikasi pada klien **sebelum** menyalakan flag `serverEvidence` atau memanggil `reevaluateRange` di produksi.

---

## 3. Urutan Build & Deploy Aman

Pastikan tidak ada perubahan skema yang memutus data lama:

```bash
# 1. Verifikasi unit test web & build lokal
npx tsx --test tests/*.test.ts
npm run lint
npm run build

# 2. Install dependensi, uji unit test functions, & kompilasi TypeScript backend
npm --prefix functions ci
npm --prefix functions run lint
npm --prefix functions test
npm --prefix functions run build

# 3. (Pada mesin dengan Java JDK 17+ & Firebase CLI) jalankan Emulator Suite
npm run test:rules
npm --prefix functions run test:emulator

# 4. Deploy Rules & Indexes lebih dulu (semua flag default false, perilaku lama tetap jalan)
firebase use dkb-emms
firebase deploy --only firestore:rules,firestore:indexes

# 5. Deploy Cloud Functions Gen 2 setelah DEM_FUNCTIONS_REGION diset sesuai langkah 1
DEM_FUNCTIONS_REGION="<FIRESTORE_REGION>" firebase deploy --only functions

# 6. Build & deploy aplikasi web (dengan VITE_FIREBASE_FUNCTIONS_REGION & VITE_RECAPTCHA_ENTERPRISE_SITE_KEY)
npm run build
```

---

## 4. Rollout Bertahap via `app_meta/feature_flags`

Dokumen `app_meta/feature_flags` di Firestore hanya boleh ditulis oleh **Strict Admin**. Default bila dokumen belum ada adalah semua flag bernilai `false`:

```json
{
  "roleClaims": false,
  "serverEvaluation": false,
  "serverEvidence": false
}
```

### Tahap A — Aktifkan `roleClaims: true` (K-03)
1. Set `{ "roleClaims": true, "serverEvaluation": false, "serverEvidence": false }` pada `app_meta/feature_flags`.
2. Lakukan penulisan sinkronisasi awal untuk ~20 pengguna internal (mis. melalui panel Rekonsiliasi Peran atau script admin satu kali agar `syncRoleCustomClaims` berjalan bagi semua dokumen `/roles/{email}` yang sudah ada).
3. Verifikasi bahwa listener `users/{uid}.claimsUpdatedAt` di `authService.tsx` memicu `getIdToken(true)` secara otomatis dan role aktif tanpa harus logout-login ulang.

### Rencana Penghapusan Fallback `/roles/{email}` pada Firestore Rules
Saat ini di `firestore.rules` (Revisi 08), fungsi `getUserRole()` memakai mode transisi:
- Jika `roleClaims == true` **dan** `request.auth.token.role` terisi → gunakan klaim JWT (`request.auth.token.role`).
- Jika klaim belum ada di token (mis. sesi lama atau user belum tersinkronisasi) → fallback membaca `/roles/{email}`.

**Kriteria sebelum menghapus fallback `/roles/{email}` (Revisi 09 mendatang):**
1. `roleClaims` sudah aktif di produksi minimal **7 hari kalender** (melewati masa refresh token seluruh ~20 pengguna).
2. Audit seluruh ~20 akun Auth via `admin.auth().listUsers()` memastikan 100% akun Active memiliki `customClaims.role` yang sama persis dengan `/roles/{email}.level`.
3. Perhatikan batasan klaim Firebase Auth: saat `roleClaims` menjadi sumber tunggal, perubahan peran di `/roles/{email}` baru terbaca oleh `firestore.rules` setelah ID token di-refresh (`claimsUpdatedAt` → `getIdToken(true)`).
4. Setelah terverifikasi, hapus cabang `exists(.../roles/$(email))` di `getUserRole()` untuk menghemat 1 Firestore document read per evaluasi rule.

### Tahap B — Aktifkan `serverEvaluation: true` (K-04)
1. Set `serverEvaluation: true` pada `app_meta/feature_flags`.
2. Uji input data baru di modul Air Limbah, Air Permukaan, dan Air Limbah Domestik:
   - Pastikan form tersimpan dengan status awal `"Menunggu evaluasi server"` selama beberapa ratus milidetik sebelum trigger mengisi `evaluationStatus`, `status`/`complianceStatus`, `standardBasis`, dan `serverEvaluatedAt`.
3. Uji **Evaluasi Ulang Batch** di Master Baku Mutu (oleh Superintendent+): pastikan panggilan masuk ke `reevaluateRange` callable dan mencatat `audit_logs` dengan `source: "server"`.

### Tahap C — Aktifkan `serverEvidence: true` (K-02)
1. Pastikan App Check site key terpasang di frontend dan seluruh penyiap/pemeriksa/penyetuju sudah menyimpan spesimen TTD ke `signatures/{uid}`.
2. Set `serverEvidence: true` pada `app_meta/feature_flags`.
3. Uji alur Evidence: Terbitkan Harian → Review (Foreman+) → Approve (Environment Manager+) → Terbitkan Bulanan → Revisi → Pembatalan (Admin), dan pastikan QR publik (`/verify/...`) membaca `evidence_verify/{token}` dengan status terbaru.

---

## 5. Prosedur Rollback Instan

Jika ditemukan kendala pasca-aktivasi di produksi, rollback dapat dilakukan **dalam hitungan detik tanpa redeploy kode**:

1. Buka **Firebase Console → Firestore → `app_meta/feature_flags`**.
2. Ubah flag modul terdampak kembali ke `false` (mis. `"serverEvidence": false` atau `"serverEvaluation": false` atau `"roleClaims": false`).
3. Seluruh klien yang sedang terbuka menerima pembaruan secara real-time melalui `onSnapshot` (`featureFlagService.ts`) dan `firestore.rules` langsung kembali ke cabang Revisi 07.
4. Untuk menonaktifkan trigger backend sepenuhnya bila diperlukan, hapus/rollback function spesifik via `firebase functions:delete <namaFunction>`.
