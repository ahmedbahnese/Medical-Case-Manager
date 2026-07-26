# توثيق واجهة البرمجة — API Documentation

**Base URL:** `http://localhost:8080/api`

All protected endpoints require an active session cookie (`bsch_session`).
Obtain a session via `POST /api/auth/founder-login`.

---

## Authentication (المصادقة)

### POST /api/auth/founder-login
Login with the founder or named-user password.

**Request:**
```json
{ "password": "bsch2024" }
```

**Response 200 — Founder:**
```json
{ "isAuthenticated": true, "isFounder": true, "name": "المؤسس" }
```

**Response 200 — Named user:**
```json
{
  "isAuthenticated": true,
  "isFounder": false,
  "name": "اسم المستخدم",
  "pagePermissions": [
    { "href": "/dashboard", "access": "edit" },
    { "href": "/waiting-cases", "access": "view" }
  ]
}
```

**Response 401:**
```json
{ "error": "كلمة المرور غير صحيحة" }
```

---

### GET /api/auth/me
Returns the current session info.

**Response:**
```json
{
  "isAuthenticated": true,
  "isFounder": false,
  "name": "اسم المستخدم",
  "pagePermissions": [{ "href": "/dashboard", "access": "edit" }]
}
```

---

### POST /api/auth/logout
Clears the session cookie.

**Response:** `{ "success": true }`

---

## Departments (الأقسام)

### GET /api/departments
Returns all departments with their active case count.

**Response:**
```json
[{
  "id": 1,
  "name": "العناية المركزة عالية",
  "code": "ICU-HIGH",
  "description": "وحدة العناية المركزة عالية",
  "capacity": 12,
  "departmentType": "intensive_care_high",
  "activeCasesCount": 7,
  "reportFieldsJson": "[]",
  "createdAt": "2024-01-01T00:00:00.000Z"
}]
```

---

### GET /api/departments/:id
Returns a single department with its active cases list.

**Response 404:** `{ "error": "القسم غير موجود" }`

---

### POST /api/departments *(Founder only)*
Create a new department.

**Body:**
```json
{
  "name": "قسم جديد",
  "code": "NEW-1",
  "capacity": 10,
  "departmentType": "intensive_care_high",
  "description": "وصف اختياري"
}
```

**departmentType values:** `intensive_care_high` | `intensive_care_medium` | `picu` | `incubator_a` | `incubator_b` | `incubator_c`

---

### PATCH /api/departments/:id
Update department name, capacity, description, or `reportFieldsJson`.

---

### DELETE /api/departments/:id *(Founder only)*
Delete a department. Fails with 409 if the department has active cases.

---

## Medical Cases (الحالات الطبية)

### GET /api/cases
List and search cases.

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `departmentId` | integer | Filter by department |
| `status` | string | `active` \| `recovering` \| `discharged` \| `critical` |
| `artificialRespiration` | string | Filter by respiration type |
| `patientName` | string | Partial name search |
| `nationalId` | string | Exact match |
| `fileNumber` | string | Exact match |

---

### GET /api/cases/respiration
Returns all active cases currently on artificial respiration (any value except `no`).

**Query:** `?departmentId=1` (optional)

---

### GET /api/cases/:id
Returns a single case by ID.

**Response 404:** `{ "error": "الحالة غير موجودة" }`

---

### POST /api/cases
Create a new medical case.

**Required fields:** `patientName`, `departmentId`

**Full body:**
```json
{
  "patientName": "اسم المريض",
  "departmentId": 1,
  "age": "3 أشهر",
  "diagnosis": "التشخيص",
  "symptoms": "الأعراض",
  "treatment": "العلاج",
  "notes": "ملاحظات",
  "parentName": "اسم ولي الأمر",
  "parentPhone": "01xxxxxxxxx",
  "nationalId": "3xxxxxxxxxx",
  "fileNumber": "12345",
  "caseType": "intensive_care_high",
  "artificialRespiration": "vent",
  "status": "active",
  "admissionDate": "2024-01-01T08:00:00.000Z"
}
```

**caseType values:** `intensive_care_high` | `intensive_care_medium` | `picu` | `incubator`

**artificialRespiration values:** `high_frequency` | `vent` | `cpap` | `hfnc` | `standby` | `box` | `no`

**status values:** `active` | `recovering` | `discharged` | `critical`

---

### PATCH /api/cases/:id
Update a case. All fields are optional.

To discharge a patient, set `status: "discharged"` and optionally `dischargeReason`.

**dischargeReason values:** `improved` | `request` | `transferred` | `death`

---

### DELETE /api/cases/:id
Permanently delete a case record.

---

### POST /api/cases/bulk-import
Parse and import patients from free Arabic text.

**Body:**
```json
{
  "text": "أحمد محمد - 3 أشهر - ضيق تنفسي - جهاز تنفس\nعلي خالد - سنة - التهاب رئوي",
  "departmentId": 1
}
```

**Response:**
```json
{
  "parsed": [
    { "patientName": "أحمد محمد", "age": "3 أشهر", "diagnosis": "ضيق تنفسي", "artificialRespiration": "vent" }
  ],
  "imported": 1
}
```

---

## Waiting Cases (قوائم الانتظار)

### GET /api/waiting-cases

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `section` | string | `servo` \| `reception` |
| `status` | string | `waiting` \| `admitted` \| `cancelled` |

---

### POST /api/waiting-cases
Add a patient to the waiting list.

**Required:** `patientName`, `careType`

**Full body:**
```json
{
  "patientName": "اسم المريض",
  "age": "سنة",
  "diagnosis": "التشخيص",
  "parentPhone": "01xxxxxxxxx",
  "nationalId": "3xxxxxxxxxx",
  "careType": "intensive_care_high",
  "centralRoomRequired": false,
  "centralRoomCode": null,
  "artificialRespiration": "no",
  "section": "reception",
  "medicalReportName": "report.pdf",
  "medicalReportData": "<base64-encoded-file>"
}
```

---

### PATCH /api/waiting-cases/:id
Update a waiting case. Use `status: "admitted"` to mark as admitted.

---

### DELETE /api/waiting-cases/:id
Remove a patient from the waiting list.

---

## Dashboard (لوحة المعلومات)

### GET /api/dashboard/stats
Overall statistics for the dashboard.

**Response:**
```json
{
  "totalCases": 45,
  "activeCases": 40,
  "criticalCases": 3,
  "waitingCases": 8,
  "onRespiration": 12,
  "departmentStats": [
    {
      "departmentId": 1,
      "departmentName": "العناية المركزة عالية",
      "capacity": 12,
      "activeCases": 10,
      "criticalCases": 2
    }
  ],
  "respirationBreakdown": [
    { "type": "vent", "count": 5, "label": "جهاز تنفس" }
  ]
}
```

---

## Settings (الإعدادات)

### GET /api/settings
Returns all settings as key-value pairs.

**Response:**
```json
{
  "hospital_name": "مجمع بن صالح الصحي",
  "hospital_logo": null,
  "login_password": "bsch2024",
  "shift_morning_start": "07:00",
  "shift_morning_end": "14:00",
  "shift_evening_start": "14:00",
  "shift_evening_end": "21:00",
  "shift_night_start": "21:00",
  "shift_night_end": "07:00",
  "named_passwords": "[...]",
  "supervisors": "[...]"
}
```

---

### POST /api/settings
Upsert a setting value. Sensitive keys require `SETTINGS_PASSWORD`.

**Body:**
```json
{ "password": "...", "key": "hospital_name", "value": "اسم المستشفى" }
```

---

### POST /api/settings/verify-password
Verify the settings page password.

**Body:** `{ "password": "..." }`

**Response:** `{ "valid": true }`

---

## Audit Logs (سجل العمليات)

### GET /api/audit-logs
Returns paginated audit log. Logs older than 1 month are auto-pruned.

**Query:** `page` (default: 1), `limit` (default: 50, max: 200)

**Response:**
```json
{
  "logs": [
    {
      "id": 1,
      "action": "إضافة حالة",
      "entityType": "case",
      "entityId": 42,
      "entityName": "أحمد محمد",
      "details": null,
      "performedBy": "المؤسس",
      "createdAt": "2024-01-01T08:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 50
}
```

---

## Incident Reports (بلاغات الحوادث)

### GET /api/incident-reports
List all incident reports.

### POST /api/incident-reports
Create an incident report. Automatically adds cases to the waiting list.

**Body:**
```json
{
  "incidentType": "حادث مروري",
  "incidentLocation": "طريق القاهرة",
  "reportDate": "2024-01-01T14:00:00.000Z",
  "reportDay": "الاثنين",
  "reportTime": "14:00",
  "totalInjured": 5,
  "totalDeaths": 1,
  "hospitalsTransferredTo": "مستشفى النيل",
  "casesJson": "[{\"patientName\":\"مريض 1\",\"age\":\"30\"}]"
}
```

### PATCH /api/incident-reports/:id
Update an incident report.

### DELETE /api/incident-reports/:id
Delete an incident report.

---

## Backups (النسخ الاحتياطية)

### POST /api/backups
Creates a full JSON backup of all system data.

**Body:** `{ "backupName": "backup before update" }`

**Response 201:**
```json
{ "id": 1, "backupName": "backup before update", "recordCount": 145, "createdAt": "..." }
```

---

### GET /api/backups
List all available backups (metadata only, no data payload).

---

### GET /api/backups/:id/download
Download a backup as a JSON file.

---

### DELETE /api/backups/:id
Delete a backup record.

---

### POST /api/backups/:id/restore *(Founder only)*
Restore the entire system state from a backup. **Destructive — overwrites all current data.**

---

## Health Check

### GET /api/healthz
Always returns 200. No authentication required.

**Response:** `{ "status": "ok" }`
