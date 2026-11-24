"use strict";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_FEATURE_FLAGS = void 0;
exports.normalizeFeatureFlags = normalizeFeatureFlags;
exports.DEFAULT_FEATURE_FLAGS = {
    serverEvaluation: false,
    serverEvidence: false,
    roleClaims: false,
};
function normalizeFeatureFlags(raw) {
    if (!raw || typeof raw !== 'object') {
        return { ...exports.DEFAULT_FEATURE_FLAGS };
    }
    const obj = raw;
    return {
        serverEvaluation: obj.serverEvaluation === true,
        serverEvidence: obj.serverEvidence === true,
        roleClaims: obj.roleClaims === true,
        updatedAt: obj.updatedAt,
        updatedBy: typeof obj.updatedBy === 'string' ? obj.updatedBy : undefined,
    };
}
//# sourceMappingURL=featureFlags.js.map