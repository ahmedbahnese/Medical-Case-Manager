# BSCH — API Documentation

**Base URL:** `http://localhost:8080` (or `http://<server-ip>:8080` from LAN)  
**Auth:** Session cookie (`bsch_session`) — set after `POST /api/auth/founder-login`  
**Content-Type:** `application/json`

---

## Authentication

### `POST /api/auth/founder-login`
Login with the founder password.

**Request:**
```json
{ "password": "bsch2024" }
```
**Response `200`:**
```json
{ "success": true }
```
**Response `401`:**
```json
{ "error": "كلمة المرور غير صحيحة" }
```

---

### `GET /api/auth/me`
Returns current session info.

**Response `200` (logged in):**
```json
{ "authenticated": true, "role": "founder" }
```
**Response `401` (not logged in):**
```json
{ "authenticated": false }
```

---

### `POST /api/auth/logout`
Clears the session cookie.

**Response `200`:**
```json
{ "success": true }
```

---

## Health

### `GET /api/health`
Used by Electron to wait for the server to be ready.

**Response `200`:**
```json
{ "status": "ok", "db": "connected" }
```

---

## Dashboard

### `GET /api/dashboard`
Returns aggregated KPI statistics for the dashboard.

**Response `200`:**
```json
{
  "totalActive": 42,
  "totalDischarged": 128,
  "totalWaiting": 5,
  "byDepartment": [
    { "id": 1, "name": "العناية المركزة عالية الرعاية", "active": 8, "capacity": 10 }
  ],
  "respirationStats": {
    "invasive": 12,
    "non_invasive": 7,
    "oxygen": 15,
    "none": 8
  },
  "recentDischarges": 14
}
```

---

## Medical Cases

### `GET /api/cases`
List all cases with optional filters.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `department` | number | Filter by department ID |
| `status` | string | `active` / `recovering` / `critical` / `discharged` |
| `respiration` | string | `invasive` / `non_invasive` / `oxygen` / `none` |
| `search` | string | Search by patient name or file number |

**Response `200`:**
```json
[
  {
    "id": 1,
    "patientName": "محمد أحمد",
    "nationalId": "30101010101011",
    "fileNumber": "2024-001",
    "age": "3 سنوات",
    "gender": "male",
    "departmentId": 1,
    "departmentName": "العناية المركزة عالية الرعاية",
    "caseType": "emergency",
    "status": "active",
    "diagnosis": "التهاب رئوي حاد",
    "artificialRespiration": "invasive",
    "admissionDate": "2026-07-01T08:00:00.000Z",
    "dischargeDate": null,
    "dischargeReason": null
  }
]
```

---

### `POST /api/cases`
Create a new medical case.

**Request Body:**
```json
{
  "patientName": "محمد أحمد",
  "nationalId": "30101010101011",
  "fileNumber": "2024-001",
  "age": "3 سنوات",
  "gender": "male",
  "departmentId": 1,
  "caseType": "emergency",
  "status": "active",
  "diagnosis": "التهاب رئوي حاد",
  "artificialRespiration": "invasive",
  "admissionDate": "2026-07-01T08:00:00.000Z"
}
```

**Response `201`:**
```json
{ "id": 42, "patientName": "محمد أحمد", ... }
```

---

### `PATCH /api/cases/:id`
Update a case (partial update — send only changed fields).

**Request Body (discharge example):**
```json
{
  "status": "discharged",
  "dischargeDate": "2026-07-10T14:00:00.000Z",
  "dischargeReason": "improved"
}
```

**Response `200`:** Updated case object.

---

### `DELETE /api/cases/:id`
Delete a case permanently.

**Response `200`:**
```json
{ "success": true }
```

---

### `POST /api/cases/bulk-import`
Import multiple cases at once.

**Request Body:**
```json
{
  "cases": [
    { "patientName": "...", "departmentId": 1, ... },
    ...
  ]
}
```

**Response `200`:**
```json
{ "imported": 15, "errors": [] }
```

---

## Waiting Cases

### `GET /api/waiting-cases`
List waiting patients.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | `waiting` / `admitted` / `cancelled` |
| `careType` | string | `servo` / `reception` |

---

### `POST /api/waiting-cases`
Add a patient to the waiting list.

**Request Body:**
```json
{
  "patientName": "فاطمة محمد",
  "age": "2 سنوات",
  "gender": "female",
  "careType": "servo",
  "requestingDoctor": "د. أحمد علي",
  "requestingHospital": "مستشفى دسوق",
  "medicalReportData": { "diagnosis": "...", ... }
}
```

---

### `PATCH /api/waiting-cases/:id`
Admit or cancel a waiting case.

**Admit example:**
```json
{
  "status": "admitted",
  "departmentId": 2
}
```

---

## Departments

### `GET /api/departments`
List all departments with current occupancy.

**Response `200`:**
```json
[
  {
    "id": 1,
    "name": "العناية المركزة عالية الرعاية",
    "code": "ICU-HIGH",
    "capacity": 10,
    "departmentType": "icu_high",
    "activeCount": 8,
    "available": 2
  }
]
```

---

### `POST /api/departments`
Create a new department.

**Request Body:**
```json
{
  "name": "وحدة جديدة",
  "code": "NEW-UNIT",
  "capacity": 8,
  "departmentType": "general"
}
```

---

## Settings

### `GET /api/settings`
Returns all settings as a key/value object.

**Response `200`:**
```json
{
  "hospital_name": "مستشفى الأطفال التخصصي بالبحيرة",
  "morning_shift_start": "08:00",
  "morning_shift_end": "14:00",
  "logo": "data:image/png;base64,..."
}
```

---

### `POST /api/settings`
Update a setting value. Requires the settings password.

**Request Body:**
```json
{
  "key": "hospital_name",
  "value": "مستشفى جديد",
  "password": "@Bahnasy"
}
```

**Response `200`:**
```json
{ "success": true }
```

---

### `POST /api/settings/verify-password`
Check if the settings password is correct.

**Request Body:**
```json
{ "password": "@Bahnasy" }
```

**Response `200`:**
```json
{ "valid": true }
```

---

## Incident Reports

### `GET /api/incident-reports`
List all incident reports.

### `POST /api/incident-reports`
Create a new incident report.

**Request Body:**
```json
{
  "incidentType": "حادث مروري جماعي",
  "incidentDate": "2026-07-15T10:00:00.000Z",
  "totalInjured": 12,
  "totalDeaths": 2,
  "notes": "...",
  "casesJson": [{ "name": "...", "age": "..." }]
}
```

### `GET /api/incident-reports/:id`
Get a single report.

### `PATCH /api/incident-reports/:id`
Update a report.

### `DELETE /api/incident-reports/:id`
Delete a report.

---

## Backups

### `GET /api/backups`
List all saved backups.

**Response `200`:**
```json
[
  { "id": 1, "backupName": "نسخة 2026-07-01", "createdAt": "2026-07-01T..." }
]
```

---

### `POST /api/backups`
Create a new backup snapshot of all data.

**Request Body:**
```json
{ "backupName": "نسخة يولية 2026" }
```

---

### `GET /api/backups/:id/download`
Download a backup as a `.json` file (binary response).

---

### `POST /api/backups/:id/restore`
Restore the database from a saved backup. **⚠ Destructive — clears all current data.**

---

### `DELETE /api/backups/:id`
Delete a backup record.

---

## Audit Logs

### `GET /api/audit-logs`
Returns the most recent audit log entries.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | 100 | Max rows to return |
| `entityType` | string | — | Filter by entity type |

**Response `200`:**
```json
[
  {
    "id": 1,
    "action": "create",
    "entityType": "medical_case",
    "entityId": 42,
    "details": "{\"patientName\":\"محمد\"}",
    "performedBy": "founder",
    "createdAt": "2026-07-01T..."
  }
]
```

---

## Error Responses

All endpoints return consistent error shapes:

```json
{ "error": "رسالة الخطأ باللغة العربية" }
```

| HTTP Code | Meaning |
|-----------|---------|
| `400` | Bad request / validation error |
| `401` | Not authenticated |
| `403` | Forbidden (wrong password) |
| `404` | Record not found |
| `409` | Conflict (duplicate entry) |
| `500` | Internal server error |
