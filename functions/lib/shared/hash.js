"use strict";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalStringify = canonicalStringify;
/**
 * Deterministically stringify an object by sorting its keys alphabetically.
 * Ensures consistent hash generation across browser client and Node Cloud Functions.
 */
function canonicalStringify(obj) {
    if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return '[' + obj.map(canonicalStringify).join(',') + ']';
    }
    const sortedKeys = Object.keys(obj).sort();
    const entries = [];
    for (const key of sortedKeys) {
        const val = obj[key];
        if (val !== undefined && typeof val !== 'function') {
            entries.push(JSON.stringify(key) + ':' + canonicalStringify(val));
        }
    }
    return '{' + entries.join(',') + '}';
}
//# sourceMappingURL=hash.js.map