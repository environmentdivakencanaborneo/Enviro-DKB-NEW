import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isStrictAdmin } from '../src/services/permissionService';
import {
  classifyReconciliationRows,
  validateReconciliationCommitInput,
} from '../src/utils/roleReconciliation';
import { INDONESIAN_REGULATIONS, INITIAL_STANDARDS_SEED } from '../src/data/regulations';
import {
  formatStandardLimitDisplay,
  resolveEffectiveStandardsMap,
} from '../src/utils/waterQualityEval';
import type { EnvironmentalStandard, UserProfile } from '../src/types';

describe('TAHAP 0 Verification Tests (T-05, K-03, D-02)', () => {
  it('T-05: file prompt internal terhapus dan pola .gitignore lengkap', () => {
    const leakedFile = path.resolve(
      process.cwd(),
      'public/assets/aistudio/Paste_November_15__2026_-_8_46AM_dbd5b0cf'
    );
    const leakedDir = path.resolve(process.cwd(), 'public/assets/aistudio');
    assert.equal(fs.existsSync(leakedFile), false);
    assert.equal(fs.existsSync(leakedDir), false);

    const gitignore = fs.readFileSync(path.resolve(process.cwd(), '.gitignore'), 'utf8');
    assert.ok(gitignore.includes('public/assets/aistudio/'));
    assert.ok(gitignore.includes('assets/.aistudio/'));
    assert.ok(gitignore.includes('*.prompt.md'));
  });

  it('K-03: isStrictAdmin hanya bernilai true untuk Admin aktif & disetujui', () => {
    assert.equal(isStrictAdmin({ role: 'Admin', status: 'Active', isApproved: true }), true);
    assert.equal(
      isStrictAdmin({ role: 'Environment Manager', status: 'Active', isApproved: true }),
      false
    );
    assert.equal(isStrictAdmin({ role: 'Admin', status: 'Pending', isApproved: false }), false);
    assert.equal(isStrictAdmin({ role: 'Admin', status: 'Suspended', isApproved: true }), false);
  });

  it('K-03: classifyReconciliationRows mendeteksi kategori temuan (a), (b), (c) RISIKO TINGGI, dan (d)', () => {
    const users: UserProfile[] = [
      {
        uid: 'u-admin-no-role',
        email: 'risk-admin@dkb.co.id',
        name: 'Budi Admin',
        fullName: 'Budi Admin',
        role: 'Admin',
        status: 'Active',
        isApproved: true,
      },
      {
        uid: 'u-mgr-no-role',
        email: 'risk-mgr@dkb.co.id',
        name: 'Siti Manager',
        fullName: 'Siti Manager',
        role: 'Environment Manager',
        status: 'Active',
        isApproved: true,
      },
      {
        uid: 'u-op-no-role',
        email: 'op@dkb.co.id',
        name: 'Andi Operator',
        fullName: 'Andi Operator',
        role: 'Operator',
        status: 'Active',
        isApproved: true,
      },
      {
        uid: 'u-mismatch',
        email: 'beda@dkb.co.id',
        name: 'Rina Beda',
        fullName: 'Rina Beda',
        role: 'Viewer',
        status: 'Active',
        isApproved: true,
      },
      {
        uid: 'u-ok',
        email: 'ok@dkb.co.id',
        name: 'Dedi Konsisten',
        fullName: 'Dedi Konsisten',
        role: 'Foreman',
        status: 'Active',
        isApproved: true,
      },
    ];

    const roles = [
      { id: 'beda@dkb.co.id', level: 'Operator' },
      { id: 'ok@dkb.co.id', level: 'Foreman' },
      { id: 'yatim@dkb.co.id', level: 'Auditor' },
    ];

    const rows = classifyReconciliationRows(users, roles);
    const byEmail = new Map(rows.map((r) => [r.email, r]));

    assert.equal(byEmail.get('risk-admin@dkb.co.id')?.findingCode, 'C_HIGH_RISK');
    assert.equal(byEmail.get('risk-mgr@dkb.co.id')?.findingCode, 'C_HIGH_RISK');
    assert.equal(byEmail.get('op@dkb.co.id')?.findingCode, 'A_ACTIVE_NO_ROLE');
    assert.equal(byEmail.get('beda@dkb.co.id')?.findingCode, 'B_ROLE_MISMATCH');
    assert.equal(byEmail.get('yatim@dkb.co.id')?.findingCode, 'D_ORPHAN_ROLE');
    assert.equal(byEmail.get('ok@dkb.co.id')?.findingCode, 'CONSISTENT');

    // Prioritas urut: C_HIGH_RISK tampil pertama
    assert.equal(rows[0].findingCode, 'C_HIGH_RISK');
  });

  it('K-03: validateReconciliationCommitInput menolak pilihan kosong dan alasan < 10 karakter', () => {
    assert.equal(
      validateReconciliationCommitInput('', 'Alasan cukup panjang untuk audit').valid,
      false
    );
    assert.equal(validateReconciliationCommitInput('Operator', 'kurang').valid, false);
    const ok = validateReconciliationCommitInput(
      'Operator',
      'Penetapan manual sesuai SK jabatan'
    );
    assert.equal(ok.valid, true);
  });

  it('D-02: INDONESIAN_REGULATIONS bebas angka dummy 0 / 999999 dan formatStandardLimitDisplay menampilkan status verifikasi', () => {
    for (const reg of INDONESIAN_REGULATIONS) {
      for (const param of reg.parameters || []) {
        assert.notEqual(param.numericLimit, 0, `${reg.id}:${param.name} masih memakai 0`);
        assert.notEqual(param.numericLimit, 999999, `${reg.id}:${param.name} masih memakai 999999`);
      }
    }

    const stds = INITIAL_STANDARDS_SEED as EnvironmentalStandard[];
    const wwMap = resolveEffectiveStandardsMap(stds, 'air_limbah', {
      sampleDate: '2026-11-20',
    });
    assert.equal(wwMap.tss.verificationStatus, 'Perlu verifikasi');
    assert.equal(formatStandardLimitDisplay(wwMap.tss), 'Perlu Verifikasi');
    assert.equal(wwMap.debit.verificationStatus, 'Terverifikasi');
    assert.equal(formatStandardLimitDisplay(wwMap.debit), 'Bebas / Pantau');
  });
});
