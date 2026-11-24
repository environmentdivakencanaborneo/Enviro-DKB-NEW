import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const rulesContent = fs.readFileSync(rulesPath, 'utf-8');

function extractBlock(marker: string, nextMarker?: string): string {
  const start = rulesContent.indexOf(marker);
  assert.ok(start >= 0, `Marker "${marker}" tidak ditemukan di firestore.rules`);
  if (!nextMarker) return rulesContent.slice(start);
  const end = rulesContent.indexOf(nextMarker, start + marker.length);
  return end >= 0 ? rulesContent.slice(start, end) : rulesContent.slice(start);
}

describe('Keamanan Firestore Rules Revisi 08 — Invarian Statis & Aturan Akses', () => {
  it('1 & 2. Pengguna tanpa login dan email belum terverifikasi ditolak oleh isVerifiedUser() & isActiveMember()', () => {
    const verifiedFn = extractBlock('function isVerifiedUser()', 'function isApprovedUser()');
    assert.ok(verifiedFn.includes('request.auth != null'));
    assert.ok(verifiedFn.includes('request.auth.token.email_verified == true'));

    const activeMemberFn = extractBlock('function isActiveMember()', 'function getUserRole()');
    assert.ok(activeMemberFn.includes('isVerifiedUser() && isApprovedUser()'));
  });

  it('3 & 4. Akun Pending/Suspended/Disabled/Deleted ditolak; hanya Active+isApproved==true yang lulus isApprovedUser()', () => {
    const approvedFn = extractBlock('function isApprovedUser()', 'function isActiveMember()');
    assert.ok(approvedFn.includes("userDoc.get('isApproved', false) == true"));
    assert.ok(approvedFn.includes("userDoc.get('status', '') == 'Active'"));
    assert.ok(approvedFn.includes("'Suspended'"));
    assert.ok(approvedFn.includes("'Pending'"));
    assert.ok(approvedFn.includes("'Disabled'"));
    assert.ok(approvedFn.includes("'Rejected'"));
    assert.ok(approvedFn.includes("'Deleted'"));
    assert.ok(approvedFn.includes("userDoc.get('isActive', true) != false"));
    assert.ok(approvedFn.includes("userDoc.get('deleted', false) != true"));
    assert.ok(!approvedFn.includes("isApproved == true || userDoc.get('status'"), 'Tidak boleh memakai OR antara isApproved dan status');
  });

  it('5, 6 & 10 [K-03]. Sumber peran /roles/{email} + feature-flagged Custom Claims, blokir fallback /users.role, & cegah self-escalation', () => {
    const roleFn = extractBlock('function getUserRole()', 'function isBreakGlassAdmin()');
    assert.ok(roleFn.includes('exists(/databases/$(database)/documents/roles/$(email))'));
    assert.ok(roleFn.includes(": 'Viewer'"));
    assert.ok(roleFn.includes('isRoleClaimsEnabled()'));
    assert.ok(roleFn.includes('request.auth.token.role'));
    assert.ok(!roleFn.includes('/users/$(uid)'), 'getUserRole tidak boleh jatuh ke /users/{uid}.role');

    const usersBlock = extractBlock('match /users/{userId}', '// --- COLLECTION: roles');
    assert.ok(usersBlock.includes("request.resource.data.role == 'Viewer'"));
    assert.ok(usersBlock.includes('request.resource.data.isApproved == false'));
    assert.ok(usersBlock.includes("request.resource.data.status == 'Pending'"));
    assert.ok(usersBlock.includes("request.resource.data.get('role', null) == resource.data.get('role', null)"));
    assert.ok(usersBlock.includes('isStrictAdmin() && userId != request.auth.uid'));

    for (const guardedKey of ['role', 'isApproved', 'status', 'isActive', 'deleted', 'approvedBy', 'approvedAt', 'claimsUpdatedAt']) {
      assert.ok(usersBlock.includes(`'${guardedKey}'`), `Field ${guardedKey} harus dikunci dari self-update`);
    }

    const rolesBlock = extractBlock('match /roles/{email}', '// --- COLLECTION: audit_logs');
    assert.ok(rolesBlock.includes('email != request.auth.token.email'));
    assert.ok(rolesBlock.includes('isManager() && request.resource.data.level in managerAssignableRoles()'));
    assert.ok(rolesBlock.includes('resource.data.level in managerAssignableRoles()'));
    assert.ok(rolesBlock.includes('allow delete: if isActiveMember() && isStrictAdmin();'));
  });

  it('7 & 8. Audit log bersifat immutable append-only, memblokir field tambahan dengan keys().hasOnly, dan mengunci source == client', () => {
    const auditFn = extractBlock('function vAuditLog()', 'function vNotification(');
    assert.ok(auditFn.includes('d.keys().hasOnly(['));
    assert.ok(auditFn.includes("d.get('source', 'client') == 'client'"));
    assert.ok(auditFn.includes('d.uid == request.auth.uid'));
    assert.ok(auditFn.includes('d.user == request.auth.token.email'));
    assert.ok(auditFn.includes('d.timestamp == request.time'));

    const auditMatch = extractBlock('match /audit_logs/{logId}', '// --- COLLECTION: app_meta ---');
    assert.ok(auditMatch.includes('allow update: if false;'));
    assert.ok(auditMatch.includes('allow delete: if false;'));
  });

  it('9 [K-02, S-08]. Mesin status Evidence, pengikatan counter & evidence_verify ke evidence_reports', () => {
    const verifyBlock = extractBlock('match /evidence_verify/{token}', '// Environmental Monitoring Collections');
    assert.ok(verifyBlock.includes('allow get: if true;'));
    assert.ok(verifyBlock.includes('allow list: if false;'));
    assert.ok(verifyBlock.includes('allow delete: if false;'));
    assert.ok(verifyBlock.includes('getAfter(/databases/$(database)/documents/evidence_reports/$(request.resource.data.reportId)).data.verifyToken == token'));

    const evidenceBlock = extractBlock('match /evidence_reports/{id}', '// Counters');
    assert.ok(evidenceBlock.includes("vEvidenceReport(id)"));
    assert.ok(evidenceBlock.includes("request.resource.data.status == 'Disiapkan'"));
    assert.ok(evidenceBlock.includes("request.resource.data.revision == 0"));
    assert.ok(evidenceBlock.includes('signatures.reviewed.email != resource.data.signatures.prepared.email'));
    assert.ok(evidenceBlock.includes('signatures.approved.email != resource.data.signatures.prepared.email'));
    assert.ok(evidenceBlock.includes('request.resource.data.snapshotHash == resource.data.snapshotHash'));
    assert.ok(evidenceBlock.includes("resource.data.status != 'Dibatalkan'"));

    const countersBlock = extractBlock('match /counters/{id}', '// User Signatures');
    assert.ok(countersBlock.includes('existsAfter(/databases/$(database)/documents/evidence_reports/$(request.resource.data.lastReportId))'));
  });

  it('11 [T-02, T-03]. Kerahasiaan data finansial/PROPER (Superintendent+/Auditor) & proteksi master data', () => {
    const recBlock = extractBlock('match /reclamation/{docId}', 'match /waste_b3/{docId}');
    assert.ok(recBlock.includes("(docId >= 'RP-' && docId < 'RP.')"));
    assert.ok(recBlock.includes('((isSuperintendent() || isAuditorRole()) &&'));
    assert.ok(recBlock.includes("docId.matches('^RG-.*') && isSuperintendent() && vReclamationGuarantee(docId)"));

    const costsBlock = extractBlock('match /costs/{docId}', 'match /amd_treatment/{docId}');
    assert.ok(costsBlock.includes('allow read: if isActiveMember() && (isSuperintendent() || isAuditorRole());'));
    assert.ok(costsBlock.includes('allow create, update: if isActiveMember() && isSuperintendent() && vCost(docId);'));
    assert.ok(costsBlock.includes('allow delete: if isActiveMember() && isAdmin();'));

    const properBlock = extractBlock('match /proper_rkab/{docId}', '// [T-03] Master Register Pertek & SLO');
    assert.ok(properBlock.includes('allow read: if isActiveMember() && (isSuperintendent() || isAuditorRole());'));

    const matrixBlock = extractBlock('match /compliance_matrix/{matrixId}', '// Regulatory Watch');
    assert.ok(matrixBlock.includes('allow create: if isActiveMember() && isSuperintendent() && vComplianceMatrix(matrixId);'));
    assert.ok(matrixBlock.includes("affectedKeys().hasOnly(['evidenceUrl', 'notes', 'updatedAt', 'updatedBy'])"));

    const standardsBlock = extractBlock('match /standards/{docId}', '// --- DOMAIN DATA COLLECTIONS ---');
    assert.ok(standardsBlock.includes('isActiveMember() && isSuperintendent() && vEnvironmentalStandard(docId)'));

    const regBlock = extractBlock('match /regulatory/{regId}', '// Incidents');
    assert.ok(regBlock.includes('isActiveMember() && isSuperintendent() && vRegulatory(regId)'));

    const ghgFactorsBlock = extractBlock('match /ghg_factors/{docId}', 'match /ghg_activities/{docId}');
    assert.ok(ghgFactorsBlock.includes('allow create, update: if isActiveMember() && isSuperintendent() && vGhgFactor(docId);'));

    const calBlock = extractBlock('match /reporting_calendar/{docId}', 'match /external_supervisions/{docId}');
    assert.ok(calBlock.includes('allow create, update: if isActiveMember() && isSuperintendent() && vReportingCalendar(docId);'));
  });

  it('12 [S-07, S-08]. Integritas d.id == docId dan pembatasan update notifikasi sistem', () => {
    const notifBlock = extractBlock('match /notifications/{notifId}', 'match /alerts/{docId}');
    assert.ok(notifBlock.includes("resource.data.createdBy == 'system'"));
    assert.ok(notifBlock.includes("affectedKeys().hasOnly(['readBy', 'clearedBy'])"));
    assert.ok(notifBlock.includes(".toSet().difference(resource.data.get('readBy', []).toSet()).hasOnly([request.auth.token.email])"));

    for (const validatorName of [
      'vNotification(docId)',
      'vWastewater(docId)',
      'vComplianceMatrix(docId)',
      'vCost(docId)',
      'vProperRkab(docId)',
      'vEvidenceReport(docId)',
      'vGhgFactor(docId)',
    ]) {
      assert.ok(rulesContent.includes(`function ${validatorName}`), `Validator ${validatorName} harus menerima docId`);
    }
    assert.ok(rulesContent.includes('d.id == docId'), 'Validator harus menegakkan d.id == docId');
  });

  it('13 [K-01, D-01]. Regenerasi evidence_verify oleh Strict Admin & proteksi evaluationHistory / cabang Evaluasi Ulang Superintendent+', () => {
    const verifyBlock = extractBlock('match /evidence_verify/{token}', '// Environmental Monitoring Collections');
    assert.ok(verifyBlock.includes('isStrictAdmin()'));
    assert.ok(verifyBlock.includes('exists(/databases/$(database)/documents/evidence_reports/$(request.resource.data.reportId))'));

    for (const colMarker of ['match /wastewater/{docId}', 'match /surfacewater/{docId}', 'match /domestic_wastewater/{docId}']) {
      const colBlock = extractBlock(colMarker, 'allow delete:');
      assert.ok(colBlock.includes("!('evaluationHistory' in request.resource.data)"), `${colMarker} harus melarang create dengan evaluationHistory`);
      assert.ok(colBlock.includes("request.resource.data.diff(resource.data).affectedKeys().hasOnly(["), `${colMarker} harus punya cabang re-evaluasi terbatas`);
      assert.ok(colBlock.includes('request.resource.data.correctionReason.size() >= 20'), `${colMarker} wajib mensyaratkan correctionReason >= 20 karakter`);
      assert.ok(colBlock.includes("!request.resource.data.diff(resource.data).affectedKeys().hasAny(['evaluationHistory'])"), `${colMarker} Operator dilarang mengubah evaluationHistory`);
    }
  });

  it('14 [Tahap 3 Feature Flags]. Helper app_meta/feature_flags tersedia dan app_meta hanya bisa ditulis Strict Admin untuk feature_flags', () => {
    const flagsFn = extractBlock('function getFeatureFlags()', '// Helper: [K-03]');
    assert.ok(flagsFn.includes('app_meta/feature_flags'));
    assert.ok(flagsFn.includes('function isServerEvaluationEnabled()'));
    assert.ok(flagsFn.includes('function isServerEvidenceEnabled()'));
    assert.ok(flagsFn.includes('function isRoleClaimsEnabled()'));

    const appMetaBlock = extractBlock('match /app_meta/{metaId}', '// --- COLLECTION: standards');
    assert.ok(appMetaBlock.includes("isStrictAdmin() || (isSuperintendent() && metaId in ['env_thresholds', 'proper_criteria'])"));
  });

  it('15 [Tahap 3 K-04]. Saat serverEvaluation aktif, klien dilarang menulis field evaluasi server dan diperbolehkan mengirim sampel tanpa status', () => {
    const wwFn = extractBlock('function vWastewater(docId)', 'function vSurfaceWater(docId)');
    assert.ok(wwFn.includes("(isServerEvaluationEnabled() || 'status' in d)"));
    assert.ok(wwFn.includes('serverEvaluatedAt is timestamp'));

    const swFn = extractBlock('function vSurfaceWater(docId)', 'function vRainfall(docId)');
    assert.ok(swFn.includes("(isServerEvaluationEnabled() || 'status' in d)"));
    assert.ok(swFn.includes('serverEvaluatedAt is timestamp'));

    const dwFn = extractBlock('function vDomesticWastewater(docId)', 'function vGhgFactor(docId)');
    assert.ok(dwFn.includes("(isServerEvaluationEnabled() || 'complianceStatus' in d)"));
    assert.ok(dwFn.includes('serverEvaluatedAt is timestamp'));

    for (const colMarker of ['match /wastewater/{docId}', 'match /surfacewater/{docId}', 'match /domestic_wastewater/{docId}']) {
      const colBlock = extractBlock(colMarker, 'allow delete:');
      assert.ok(colBlock.includes('!isServerEvaluationEnabled()'), `${colMarker} harus memeriksa flag serverEvaluation`);
      assert.ok(colBlock.includes("'serverEvaluatedAt'"), `${colMarker} harus mengunci serverEvaluatedAt dari klien`);
      assert.ok(colBlock.includes("'evaluationStatus'"), `${colMarker} harus mengunci evaluationStatus dari klien`);
    }
  });

  it('16 [Tahap 3 K-02]. Saat serverEvidence aktif, penulisan klien ke evidence_reports, counters, dan evidence_verify dikunci', () => {
    const evidenceBlock = extractBlock('match /evidence_reports/{id}', '// Counters');
    assert.ok(evidenceBlock.includes('allow create: if !isServerEvidenceEnabled()'));
    assert.ok(evidenceBlock.includes('allow update: if !isServerEvidenceEnabled()'));
    assert.ok(evidenceBlock.includes('allow delete: if !isServerEvidenceEnabled()'));

    const countersBlock = extractBlock('match /counters/{id}', '// User Signatures');
    assert.ok(countersBlock.includes('allow create: if !isServerEvidenceEnabled()'));
    assert.ok(countersBlock.includes('allow update: if !isServerEvidenceEnabled()'));

    const verifyBlock = extractBlock('match /evidence_verify/{token}', '// Environmental Monitoring Collections');
    assert.ok(verifyBlock.includes('allow create: if !isServerEvidenceEnabled()'));
    assert.ok(verifyBlock.includes('allow update: if !isServerEvidenceEnabled()'));
  });
});
