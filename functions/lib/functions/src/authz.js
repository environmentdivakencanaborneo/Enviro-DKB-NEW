"use strict";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCallerContext = verifyCallerContext;
const https_1 = require("firebase-functions/v2/https");
const roles_1 = require("../../shared/roles");
async function verifyCallerContext(auth, db, minimumRole = 'Viewer') {
    if (!auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Autentikasi pengguna wajib tersedia.');
    }
    const email = typeof auth.token?.email === 'string' ? auth.token.email.trim() : '';
    if (!email) {
        throw new https_1.HttpsError('permission-denied', 'Email akun tidak ditemukan pada token sesi.');
    }
    if (auth.token?.email_verified !== true) {
        throw new https_1.HttpsError('permission-denied', 'Email akun belum terverifikasi.');
    }
    const userSnap = await db.doc(`users/${auth.uid}`).get();
    if (!userSnap.exists) {
        throw new https_1.HttpsError('permission-denied', 'Profil pengguna belum terdaftar.');
    }
    const userData = userSnap.data() || {};
    if (userData.status !== 'Active' ||
        userData.isApproved !== true ||
        userData.isActive === false ||
        userData.deleted === true) {
        throw new https_1.HttpsError('permission-denied', 'Akun Anda belum aktif atau belum disetujui administrator.');
    }
    // Otoritatif: baca peran dari /roles/{email} (K-03)
    let roleSnap = await db.doc(`roles/${email}`).get();
    if (!roleSnap.exists && email.toLowerCase() !== email) {
        roleSnap = await db.doc(`roles/${email.toLowerCase()}`).get();
    }
    const role = roleSnap.exists
        ? (0, roles_1.normalizeRole)(roleSnap.data()?.level)
        : roles_1.DEFAULT_ROLE;
    if (!(0, roles_1.atLeast)(role, minimumRole)) {
        throw new https_1.HttpsError('permission-denied', `Akses ditolak: tindakan ini membutuhkan peran minimal ${minimumRole}.`);
    }
    const displayName = (typeof userData.fullName === 'string' && userData.fullName.trim()) ||
        (typeof userData.name === 'string' && userData.name.trim()) ||
        (typeof auth.token?.name === 'string' && auth.token.name.trim()) ||
        email;
    const position = (typeof userData.position === 'string' && userData.position.trim()) || role;
    return {
        uid: auth.uid,
        email,
        name: displayName,
        position,
        role,
        rank: roles_1.ROLE_RANK[role] ?? 0,
    };
}
//# sourceMappingURL=authz.js.map