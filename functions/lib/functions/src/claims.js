"use strict";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncRoleCustomClaims = void 0;
exports.processRoleClaimsSync = processRoleClaimsSync;
const firestore_1 = require("firebase-functions/v2/firestore");
const roles_1 = require("../../shared/roles");
const config_1 = require("./config");
const featureFlags_1 = require("./featureFlags");
const firebaseAdmin_1 = require("./firebaseAdmin");
const defaultClaimsDeps = {
    readFlags: () => (0, featureFlags_1.readFeatureFlags)(firebaseAdmin_1.adminDb),
    getUserByEmail: async (email) => {
        try {
            const user = await firebaseAdmin_1.adminAuth.getUserByEmail(email);
            return {
                uid: user.uid,
                email: user.email,
                customClaims: user.customClaims,
            };
        }
        catch (err) {
            if (err?.code === 'auth/user-not-found') {
                return null;
            }
            throw err;
        }
    },
    setCustomUserClaims: (uid, claims) => firebaseAdmin_1.adminAuth.setCustomUserClaims(uid, claims),
    stampUserClaimsUpdatedAt: async (uid) => {
        const ref = firebaseAdmin_1.adminDb.doc(`users/${uid}`);
        const snap = await ref.get();
        if (snap.exists) {
            await ref.update({ claimsUpdatedAt: firebaseAdmin_1.FieldValue.serverTimestamp() });
        }
    },
};
async function processRoleClaimsSync(emailParam, beforeData, afterData, deps = defaultClaimsDeps) {
    const flags = await deps.readFlags();
    if (!flags.roleClaims) {
        return { status: 'skipped', reason: 'flag_disabled' };
    }
    const email = emailParam.trim();
    if (!email) {
        return { status: 'skipped', reason: 'empty_email' };
    }
    const user = await deps.getUserByEmail(email);
    if (!user) {
        return { status: 'skipped', reason: 'auth_user_not_found' };
    }
    const nextRole = afterData ? (0, roles_1.normalizeRole)(afterData.level) : roles_1.DEFAULT_ROLE;
    const nextRank = roles_1.ROLE_RANK[nextRole] ?? 0;
    const existingClaims = user.customClaims || {};
    const levelChanged = !beforeData || !afterData || beforeData.level !== afterData.level;
    if (!levelChanged &&
        existingClaims.role === nextRole &&
        existingClaims.rank === nextRank) {
        return { status: 'skipped', reason: 'unchanged', role: nextRole, rank: nextRank };
    }
    const mergedClaims = {
        ...existingClaims,
        role: nextRole,
        rank: nextRank,
    };
    await deps.setCustomUserClaims(user.uid, mergedClaims);
    await deps.stampUserClaimsUpdatedAt(user.uid);
    return { status: 'synced', role: nextRole, rank: nextRank };
}
exports.syncRoleCustomClaims = (0, firestore_1.onDocumentWritten)((0, config_1.buildDocumentTriggerOptions)('roles/{email}'), async (event) => {
    const email = event.params.email;
    const beforeData = event.data?.before?.exists
        ? event.data.before.data()
        : undefined;
    const afterData = event.data?.after?.exists
        ? event.data.after.data()
        : undefined;
    await processRoleClaimsSync(email, beforeData, afterData);
});
//# sourceMappingURL=claims.js.map