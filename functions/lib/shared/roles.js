"use strict";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEGACY_ROLE_MAP = exports.ROLE_RANK = exports.DEFAULT_ROLE = exports.MANAGER_ASSIGNABLE_ROLES = exports.ROLES = void 0;
exports.toRole = toRole;
exports.normalizeRole = normalizeRole;
exports.atLeast = atLeast;
exports.ROLES = [
    'Admin',
    'Environment Manager',
    'Environment Superintendent',
    'Foreman',
    'Operator',
    'Auditor',
    'Viewer',
];
exports.MANAGER_ASSIGNABLE_ROLES = [
    'Viewer',
    'Auditor',
    'Operator',
    'Foreman',
    'Environment Superintendent',
];
exports.DEFAULT_ROLE = 'Viewer';
exports.ROLE_RANK = {
    Viewer: 0,
    Auditor: 1,
    Operator: 2,
    Foreman: 2.5,
    'Environment Superintendent': 3,
    'Environment Manager': 4,
    Admin: 5,
};
exports.LEGACY_ROLE_MAP = {
    User: 'Viewer',
    Pending: 'Viewer',
    ADMIN: 'Admin',
    admin: 'Admin',
    'Super Admin': 'Admin',
    'Env Manager': 'Environment Manager',
    Manager: 'Environment Manager',
    Superintendent: 'Environment Superintendent',
    SUPERINTENDENT: 'Environment Superintendent',
    Supervisor: 'Foreman',
    OPERATOR: 'Operator',
    operator: 'Operator',
};
function toRole(raw) {
    if (typeof raw !== 'string')
        return exports.DEFAULT_ROLE;
    const trimmed = raw.trim();
    const found = exports.ROLES.find((r) => r.toLowerCase() === trimmed.toLowerCase());
    return found ?? exports.DEFAULT_ROLE;
}
function normalizeRole(raw) {
    if (typeof raw !== 'string')
        return exports.DEFAULT_ROLE;
    const trimmed = raw.trim();
    if (trimmed in exports.LEGACY_ROLE_MAP) {
        return exports.LEGACY_ROLE_MAP[trimmed];
    }
    const lower = trimmed.toLowerCase();
    for (const [legacyKey, mappedRole] of Object.entries(exports.LEGACY_ROLE_MAP)) {
        if (legacyKey.toLowerCase() === lower) {
            return mappedRole;
        }
    }
    return toRole(trimmed);
}
function atLeast(role, minimum) {
    return (exports.ROLE_RANK[role] ?? 0) >= (exports.ROLE_RANK[minimum] ?? 0);
}
//# sourceMappingURL=roles.js.map