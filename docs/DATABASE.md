# توثيق قاعدة البيانات — Database Documentation

## Connection

```
Host:     localhost (or your server IP)
Port:     5432
Database: bsch_db
User:     bsch_user
```

Full DSN: `postgresql://bsch_user:PASSWORD@localhost:5432/bsch_db`

---

## Tables

### `departments` — الأقسام

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | Auto-increment |
| name | TEXT | Arabic department name |
| code | TEXT UNIQUE | Short code (e.g. ICU-HIGH) |
| description | TEXT | Optional description |
| capacity | INTEGER | Max beds |
| department_type | ENUM | See below |
| created_at | TIMESTAMP | Auto |
| updated_at | TIMESTAMP | Auto |

**department_type values:** `intensive_care_high`, `intensive_care_medium`, `picu`, `incubator_a`, `incubator_b`, `incubator_c`

---

### `medical_cases` — الحالات الطبية

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| patient_name | TEXT | Required |
| department_id | INTEGER FK | → departments.id |
| age | TEXT | Free-form (e.g. "3 أشهر") |
| diagnosis | TEXT | |
| symptoms | TEXT | |
| treatment | TEXT | |
| notes | TEXT | Free notes |
| parent_name | TEXT | Guardian |
| parent_phone | TEXT | |
| national_id | TEXT | Egyptian National ID |
| file_number | TEXT | Hospital file number |
| case_type | ENUM | `intensive_care_high` \| `intensive_care_medium` \| `picu` \| `incubator` |
| artificial_respiration | ENUM | `high_frequency` \| `vent` \| `cpap` \| `hfnc` \| `standby` \| `box` \| `no` |
| status | ENUM | `active` \| `recovering` \| `discharged` \| `critical` |
| mobe | TEXT | Mobile/note field |
| ventilation_start_date | TIMESTAMP | When ventilation started |
| ventilation_end_date | TIMESTAMP | When ventilation ended |
| discharge_reason | ENUM | `improved` \| `request` \| `transferred` \| `death` |
| admission_date | TIMESTAMP | Default: NOW() |
| discharge_date | TIMESTAMP | Set on discharge |
| created_at | TIMESTAMP | Auto |
| updated_at | TIMESTAMP | Auto |

---

### `waiting_cases` — قوائم الانتظار

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| patient_name | TEXT | Required |
| age | TEXT | |
| diagnosis | TEXT | |
| parent_phone | TEXT | |
| national_id | TEXT | |
| care_type | ENUM | Same as case_type |
| central_room_required | BOOLEAN | Default false |
| central_room_code | TEXT | Room code if needed |
| artificial_respiration | ENUM | Same as medical_cases |
| section | ENUM | `servo` \| `reception` |
| status | ENUM | `waiting` \| `admitted` \| `cancelled` |
| created_at | TIMESTAMP | Auto |
| updated_at | TIMESTAMP | Auto |

---

### `settings` — الإعدادات

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| key | TEXT UNIQUE | Setting identifier |
| value | TEXT | Setting value (JSON for complex) |
| updated_at | TIMESTAMP | Auto |

**Standard keys:**
- `hospital_name` — Display name of the hospital
- `hospital_logo` — Base64-encoded logo image
- `login_password` — Hashed founder login password
- `named_passwords` — JSON array of `{name, password, canEdit?, allowedPages?}`
- `supervisors` — JSON array of supervisor names
- `shift_morning_start/end`, `shift_evening_start/end`, `shift_night_start/end` — Shift times (HH:mm)

---

### `audit_logs` — سجل العمليات

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| action | TEXT | Arabic action description |
| entity_type | TEXT | `case`, `department`, `auth`, etc. |
| entity_id | INTEGER | ID of affected record |
| entity_name | TEXT | Name of affected record |
| details | TEXT | JSON details string |
| performed_by | TEXT | User who performed action |
| created_at | TIMESTAMP | Auto |

---

### `incident_reports` — بلاغات الحوادث

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| incident_type | TEXT | Type of incident |
| incident_location | TEXT | Location |
| report_date | TIMESTAMP | When it happened |
| report_day | TEXT | Day of week (Arabic) |
| report_time | TEXT | Time string |
| total_injured | INTEGER | Total injured count |
| total_deaths | INTEGER | Total deaths |
| hospitals_transferred_to | TEXT | Transfer destination |
| cases_json | TEXT | JSON array of case details |
| created_at | TIMESTAMP | Auto |
| updated_at | TIMESTAMP | Auto |

---

### `backups` — النسخ الاحتياطية

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| backup_name | TEXT | Backup label |
| backup_data | TEXT | Full JSON export |
| record_count | INTEGER | Number of records |
| created_at | TIMESTAMP | Auto |

---

## Useful Queries

```sql
-- Active cases by department
SELECT d.name, COUNT(*) as active
FROM medical_cases m
JOIN departments d ON d.id = m.department_id
WHERE m.status = 'active'
GROUP BY d.name ORDER BY active DESC;

-- Cases on artificial respiration
SELECT patient_name, artificial_respiration, admission_date
FROM medical_cases
WHERE artificial_respiration != 'no' AND status = 'active';

-- Waiting queue summary
SELECT section, care_type, COUNT(*) as count
FROM waiting_cases WHERE status = 'waiting'
GROUP BY section, care_type;

-- Recent audit log
SELECT action, entity_name, performed_by, created_at
FROM audit_logs ORDER BY created_at DESC LIMIT 20;
```
