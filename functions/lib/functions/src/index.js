"use strict";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditUsersOnWrite = exports.auditRolesOnWrite = exports.auditEvidenceReportsOnWrite = exports.auditStandardsOnWrite = exports.auditReclamationOnWrite = exports.auditWasteB3OnWrite = exports.auditDomesticWastewaterOnWrite = exports.auditSurfaceWaterOnWrite = exports.auditWastewaterOnWrite = exports.syncRoleCustomClaims = exports.cancelEvidence = exports.reviseEvidence = exports.approveEvidence = exports.reviewEvidence = exports.issueMonthlyEvidence = exports.issueDailyEvidence = exports.reevaluateRange = exports.evaluateDomesticWastewaterOnWrite = exports.evaluateSurfaceWaterOnWrite = exports.evaluateWastewaterOnWrite = void 0;
var waterEval_1 = require("./waterEval");
Object.defineProperty(exports, "evaluateWastewaterOnWrite", { enumerable: true, get: function () { return waterEval_1.evaluateWastewaterOnWrite; } });
Object.defineProperty(exports, "evaluateSurfaceWaterOnWrite", { enumerable: true, get: function () { return waterEval_1.evaluateSurfaceWaterOnWrite; } });
Object.defineProperty(exports, "evaluateDomesticWastewaterOnWrite", { enumerable: true, get: function () { return waterEval_1.evaluateDomesticWastewaterOnWrite; } });
Object.defineProperty(exports, "reevaluateRange", { enumerable: true, get: function () { return waterEval_1.reevaluateRange; } });
var evidence_1 = require("./evidence");
Object.defineProperty(exports, "issueDailyEvidence", { enumerable: true, get: function () { return evidence_1.issueDailyEvidence; } });
Object.defineProperty(exports, "issueMonthlyEvidence", { enumerable: true, get: function () { return evidence_1.issueMonthlyEvidence; } });
Object.defineProperty(exports, "reviewEvidence", { enumerable: true, get: function () { return evidence_1.reviewEvidence; } });
Object.defineProperty(exports, "approveEvidence", { enumerable: true, get: function () { return evidence_1.approveEvidence; } });
Object.defineProperty(exports, "reviseEvidence", { enumerable: true, get: function () { return evidence_1.reviseEvidence; } });
Object.defineProperty(exports, "cancelEvidence", { enumerable: true, get: function () { return evidence_1.cancelEvidence; } });
var claims_1 = require("./claims");
Object.defineProperty(exports, "syncRoleCustomClaims", { enumerable: true, get: function () { return claims_1.syncRoleCustomClaims; } });
var audit_1 = require("./audit");
Object.defineProperty(exports, "auditWastewaterOnWrite", { enumerable: true, get: function () { return audit_1.auditWastewaterOnWrite; } });
Object.defineProperty(exports, "auditSurfaceWaterOnWrite", { enumerable: true, get: function () { return audit_1.auditSurfaceWaterOnWrite; } });
Object.defineProperty(exports, "auditDomesticWastewaterOnWrite", { enumerable: true, get: function () { return audit_1.auditDomesticWastewaterOnWrite; } });
Object.defineProperty(exports, "auditWasteB3OnWrite", { enumerable: true, get: function () { return audit_1.auditWasteB3OnWrite; } });
Object.defineProperty(exports, "auditReclamationOnWrite", { enumerable: true, get: function () { return audit_1.auditReclamationOnWrite; } });
Object.defineProperty(exports, "auditStandardsOnWrite", { enumerable: true, get: function () { return audit_1.auditStandardsOnWrite; } });
Object.defineProperty(exports, "auditEvidenceReportsOnWrite", { enumerable: true, get: function () { return audit_1.auditEvidenceReportsOnWrite; } });
Object.defineProperty(exports, "auditRolesOnWrite", { enumerable: true, get: function () { return audit_1.auditRolesOnWrite; } });
Object.defineProperty(exports, "auditUsersOnWrite", { enumerable: true, get: function () { return audit_1.auditUsersOnWrite; } });
//# sourceMappingURL=index.js.map