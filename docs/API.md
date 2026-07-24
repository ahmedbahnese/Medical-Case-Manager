# توثيق واجهة البرمجة — API Documentation

Base URL: `http://localhost:8080/api`

All protected endpoints require an active session cookie (`bsch_session`).
Obtain a session via `POST /api/auth/founder-login`.

---

## Authentication

### POST /api/auth/founder-login
Login with password.

**Request Body:**
```json
{ "password": "bsch2024" }
```

**Response (200):**
```json
{ "isAuthenticated": true, "isFounder": true, "name": "المؤسس" }
```

**Response (401):**
```json
{ "error": "كلمة المرور غير صحيحة" }
```

---

### GET /api/auth/me
Returns current session info.

**Response:**
```json
{
  "isAuthenticated": true,
  "isFounder": false,
  "name": "اسم المستخدم",
  "canEdit": true,
  "allowedPages": ["/dashboard", "/waiting-cases"]
}
```

---

### POST /api/auth/logout
Ends the current session.

**Response:** `{ "success": true }`

---

## Departments (الأقسام)

### GET /api/departments
Returns all departments with active case counts.

**Response:**
```json
[{
  "id": 1, "name": "العناية المركزة عالية", "code": "ICU-HIGH",
  "capacity": 12, "departmentType": "intensive_care_high",
  "activeCasesCount": 7
}]
```

### GET /api/departments/:id
Returns a single department with its active cases.

### POST /api/departments
Create a new department. **(Founder only)**

**Body:** `{ "name", "code", "capacity", "departmentType", "description?" }`

### PATCH /api/departments/:id
Update a department.

### DELETE /api/departments/:id
Delete a department (only if it has no active cases).

---

## Medical Cases (الحالات الطبية)

### GET /api/cases
List cases with optional filters.

**Query params:** `departmentId`, `status`, `artificialRespiration`, `patientName`, `nationalId`, `fileNumber`

**status values:** `active` | `recovering` | `discharged` | `critical`

### GET /api/cases/:id
Get a single case.

### POST /api/cases
Create a new case.

**Required fields:** `patientName`, `departmentId`, `caseType`
**Optional:** `age`, `diagnosis`, `symptoms`, `treatment`, `notes`, `parentName`, `parentPhone`, `nationalId`, `fileNumber`, `artificialRespiration`, `admissionDate`

### PATCH /api/cases/:id
Update a case. To discharge, set `status: "discharged"` and optionally `dischargeReason`.

### DELETE /api/cases/:id
Permanently delete a case record.

### GET /api/cases/respiration
Returns all cases with artificial respiration (not `no`).
**Query:** `?departmentId=1` (optional filter)

---

## Waiting Cases (قوائم الانتظار)

### GET /api/waiting-cases
**Query:** `section` (`servo`|`reception`), `status` (`waiting`|`admitted`|`cancelled`)

### POST /api/waiting-cases
**Required:** `patientName`, `careType`, `section`

### PATCH /api/waiting-cases/:id
### DELETE /api/waiting-cases/:id

---

## Dashboard

### GET /api/dashboard/stats
Returns summary statistics.

**Response:**
```json
{
  "totalActive": 45,
  "totalCapacity": 75,
  "totalWaiting": 8,
  "criticalCases": 3,
  "onRespiration": 12
}
```

### GET /api/dashboard/department-stats
Returns per-department occupancy breakdown.

---

## Settings (الإعدادات)

### GET /api/settings
Returns all settings as key-value pairs.

### POST /api/settings
Upsert a setting.

**Body:** `{ "password": "...", "key": "hospital_name", "value": "My Hospital" }`
(Password is the settings page password for protected keys)

### POST /api/settings/verify-password
**Body:** `{ "password": "..." }` → `{ "valid": true }`

---

## Audit Logs (سجل العمليات)

### GET /api/audit-logs
**Query:** `page` (default 1), `limit` (default 50)

---

## Incident Reports (بلاغات الحوادث)

### GET /api/incident-reports
### POST /api/incident-reports
### PATCH /api/incident-reports/:id
### DELETE /api/incident-reports/:id

---

## Backups (النسخ الاحتياطية)

### POST /api/backups
Creates a new backup of all data.

### GET /api/backups
Lists all available backups.

### GET /api/backups/:id/download
Downloads a backup as JSON.

### DELETE /api/backups/:id
Deletes a backup record.

---

## Health Check

### GET /api/health
**Response:** `{ "status": "ok" }` (always 200, no auth required)
