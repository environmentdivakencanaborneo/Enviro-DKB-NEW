"use strict";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_FEATURE_FLAGS = void 0;
exports.readFeatureFlags = readFeatureFlags;
const featureFlags_1 = require("../../shared/featureFlags");
Object.defineProperty(exports, "DEFAULT_FEATURE_FLAGS", { enumerable: true, get: function () { return featureFlags_1.DEFAULT_FEATURE_FLAGS; } });
async function readFeatureFlags(db) {
    try {
        const snap = await db.doc('app_meta/feature_flags').get();
        if (!snap.exists) {
            return { ...featureFlags_1.DEFAULT_FEATURE_FLAGS };
        }
        return (0, featureFlags_1.normalizeFeatureFlags)(snap.data());
    }
    catch {
        return { ...featureFlags_1.DEFAULT_FEATURE_FLAGS };
    }
}
//# sourceMappingURL=featureFlags.js.map