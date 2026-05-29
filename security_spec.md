# Security Specification & "Dirty Dozen" TDD Payloads

This specification defines the security invariants and testing scenarios for the ENV-COAL PRO Firestore Database.

## Data Invariants

1. **User Identity Isolation**: A user profile at `/users/{userId}` can only be read and written by matching authenticated `request.auth.uid == userId`.
2. **Access Control**: Only logged-in, verified users can read, query, or append entries to system monitoring collections.
3. **Data Shape Protection**: No loose keys or random inputs can be injected to "poison" schemas (Strict Key check + type/size validations in individual entity validation helpers).
4. **Value-Level Restraints**:
   - pH values must range between 0.0 and 14.0.
   - Non-negative constraints apply to weight, height, rainfall, quantity, and cost fields.
   - String fields must be limited in length to protect against cost-attack size exploits.

---

## The "Dirty Dozen" Malicious Payloads

The following payload attempts must be strictly evaluated and rejected by the `firestore.rules`.

### 1. Identity Spoofing (Wastewater)
Attempt to write a wastewater entry with an arbitrary ID under a different user's key or write it anonymously.
```json
{
  "id": "WW-malicious",
  "date": "2026-05-29",
  "location": "Sump Area A",
  "officer": "Attacker",
  "ph": 4.5,
  "tss": 120,
  "debit": 0.400,
  "fe": 2.1,
  "mn": 0.8,
  "status": "Safe"
}
```
*Expected Result*: `PERMISSION_DENIED` (Requires email_verified == true & verified auth session).

### 2. ID Poisoning (Rainfall ID)
Submit an automatic gauge reading using an overly long string containing special path traversal chars as the Document ID.
- Path: `/rainfall/..%2F..%2Fpoison%2F`
- Payload: Valid schema shape.
*Expected Result*: `PERMISSION_DENIED` (Fails `isValidId()` regex guard).

### 3. State Shortcutting (Compliance Event Lifecycle)
Attempting to force-complete a pending event directly to 'Completed' without following correct status values or validation boundaries.
```json
{
  "id": "EV-001",
  "date": "2026-06-15",
  "title": "Quarterly Water Report",
  "type": "Reporting",
  "description": "Exfiltrated data bypassing inspection",
  "status": "Completed"
}
```
*Expected Result*: `PERMISSION_DENIED` (Fails state rules/helpers or validation keys).

### 4. Shadow Field Injection (Nursery Stock Injection)
Injecting a hidden "approvedByAdmin": true or "hacker": true shadow flag to standard nursery database schema.
```json
{
  "id": "NS-99",
  "plantType": "Sengon",
  "quantity": 1500,
  "source": "Local Nursery",
  "ageWeeks": 8,
  "heightCm": 35.5,
  "status": "Healthy",
  "location": "Nursery Site C",
  "dateIn": "2026-05-29",
  "approvedByAdmin": true
}
```
*Expected Result*: `PERMISSION_DENIED` (Fails strict key schema length check).

### 5. Type Poisoning / Value-Range Exploit (Wastewater pH Out-of-bounds)
Writing a wastewater entry with a hazardous invalid pH (e.g., pH = 99.0 or string '"acidic"').
```json
{
  "id": "WW-poison",
  "date": "2026-05-29",
  "location": "Settle Pond 1",
  "officer": "Diva Kencana",
  "ph": "highly-acidic",
  "tss": 50,
  "debit": 0.150,
  "fe": 0.1,
  "mn": 0.1,
  "status": "Safe"
}
```
*Expected Result*: `PERMISSION_DENIED` (Fails type safety ph validation check).

### 6. PII Blanket Read Scraping (Private Users Profile)
An authenticated standard user attempts to download/list all user profiles `/users` to scrape email addresses.
```json
// Query: getDocs(collection(db, 'users'))
```
*Expected Result*: `PERMISSION_DENIED` (Fails blanket secure list rule; must have document id match `request.auth.uid`).

### 7. Resource Size Exhaustion (Denial-of-Wallet Long Text)
Submit an extremely long 1MB random text block inside the Environmental Documents `docNo` or `name` field.
```json
{
  "id": "DOC-99",
  "name": "A".repeat(500000),
  "type": "AMDAL",
  "docNo": "999-99-999",
  "issuedDate": "2026-05-29",
  "expiryDate": "2030-01-01",
  "status": "Active",
  "pic": "Superintendent"
}
```
*Expected Result*: `PERMISSION_DENIED` (Fails string `.size()` size boundaries limits).

### 8. Self-Promoted Role Privilege Escalation (Profile Creation)
A registering user tries to set their own profile role as "System Admin" or "Root Administrator" during document creation.
```json
{
  "name": "Infiltrator",
  "email": "hacker@domain.com",
  "company": "Wildcat Corp",
  "role": "Super Admin"
}
```
*Expected Result*: `PERMISSION_DENIED` (Forbidden self-assigned RBAC fields).

### 9. Retroactive Immutability Bypass (Attempting to change Wastewater Officer/Date)
Standard operator attempts to modify an archived wastewater data entry's original date and ID.
- Original: `"id": "WW-100", "date": "2026-01-01"`
- Malicious Update: `"id": "WW-100", "date": "2026-05-29"`
*Expected Result*: `PERMISSION_DENIED` (Fails the immortal field rule `incoming().id == existing().id && incoming().date == existing().date`).

### 10. Temporal Integrity Theft (Client-forged timestamps)
Setting the alerts `timestamp` manually to a year in the future instead of using the native server timestamp.
```json
{
  "id": "AL-fake",
  "timestamp": "2027-05-29T12:00:00Z",
  "type": "Critical",
  "category": "Wastewater",
  "title": "False Alert",
  "message": "Poison Alert",
  "read": false
}
```
*Expected Result*: `PERMISSION_DENIED` (Fails rules timestamp check `incoming().timestamp == request.time`).

### 11. Complete Unbounded List Pollution (List Query Scraping)
Attempting to fetch the alerts collection without limiting queries or filtering down to ownership criteria.
*Expected Result*: `PERMISSION_DENIED` (Enforces list query rules checking UID/roles or blocking global list queries).

### 12. Reclamation Plan Overcost Injection (Out-of-range integer)
Submit negative size or integer overflow for estimated cost in a restoration target.
```json
{
  "id": "RP-001",
  "areaName": "Reclaimed Block A",
  "sizeHa": -450.0,
  "targetYear": 2028,
  "plantType": "Sengon",
  "method": "Hydroseeding",
  "estimatedCost": -1000000,
  "status": "Draft",
  "pic": "Superintendent"
}
```
*Expected Result*: `PERMISSION_DENIED` (Fails validation boundary checks: sizeHa and estimatedCost must be greater than zero).
