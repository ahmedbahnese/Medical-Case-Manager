# توثيق قاعدة البيانات — Database Documentation

## Connection

```
Host:     localhost (or your server IP)
Port:     5432
Database: bsch_db
User:     bsch_user
```

Connection string: `postgresql://bsch_user:PASSWORD@localhost:5432/bsch_db`

The application reads this from the `DATABASE_URL` environment variable.

---

## Tables

### `departments` — الأقسام

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | Auto-increment |
| name | TEXT | Arabic department name |
| code | TEXT UNIQUE | Short code (e.g. `ICU-HIGH`) |
| description | TEXT | Optional description |
| capacity | INTEGER | Max beds (default 10) |
| department_type | ENUM | See values below |
| report_fields_json | TEXT | JSON array of enabled report field keys (default `[]`) |
| created_at | TIMESTAMP | Auto |
| updated_at | TIMESTAMP | Auto |

**department_type values:** `intensive_care_high` | `intensive_care_medium` | `picu` | `incubator_a` | `incubator_b` | `incubator_c`

**report_fields_json** controls which columns appear in department reports. Possible field keys:
`fileNumber`, `age`, `diagnosis`, `admissionDate`, `stayDays`, `status`, `artificialRespiration`, `mobe`, `parentName`, `parentPhone`, `nationalId`

---

### `medical_cases` — الحالات الطبية

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| patient_name | TEXT | Required |
| department_id | INTEGER FK | → departments.id (RESTRICT delete) |
| age | TEXT | Free-form (e.g. "3 أشهر", "سنتان") |
| diagnosis | TEXT | |
| symptoms | TEXT | |
| treatment | TEXT | |
| notes | TEXT | Free notes |
| parent_name | TEXT | Guardian name |
| parent_phone | TEXT | |
| national_id | TEXT | Egyptian National ID |
| file_number | TEXT | Hospital file number |
| case_type | ENUM | `intensive_care_high` \| `intensive_care_medium` \| `picu` \| `incubator` |
| artificial_respiration | ENUM | `high_frequency` \| `vent` \| `cpap` \| `hfnc` \| `standby` \| `box` \| `no` |
| status | ENUM | `active` \| `recovering` \| `discharged` \| `critical` |
| mobe | TEXT | Mobility/movement notes |
| ventilation_start_date | TIMESTAMP | When artificial ventilation started |
| ventilation_end_date | TIMESTAMP | When artificial ventilation ended |
| discharge_reason | ENUM | `improved` \| `request` \| `transferred` \| `death` |
| admission_date | TIMESTAMP | Default: NOW() |
| discharge_date | TIMESTAMP | Set when status = discharged |
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
| medical_report | TEXT | Report description/text |
| medical_report_name | TEXT | Uploaded file name |
| medical_report_data | TEXT | Base64-encoded file content |
| care_type | ENUM | Same values as medical_cases.case_type |
| central_room_required | BOOLEAN | Default false |
| central_room_code | TEXT | Room code if central room needed |
| artificial_respiration | ENUM | Same values as medical_cases |
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
| value | TEXT | Setting value (JSON for complex types) |
| updated_at | TIMESTAMP | Auto |

**Standard setting keys:**

| Key | Type | Description |
|-----|------|-------------|
| `hospital_name` | string | Hospital display name |
| `hospital_logo` | string/null | Base64-encoded logo image |
| `login_password` | string | Founder login password |
| `named_passwords` | JSON array | Named user accounts with permissions |
| `supervisors` | JSON array | Supervisor names list |
| `shift_morning_start` | `HH:mm` | Morning shift start time |
| `shift_morning_end` | `HH:mm` | Morning shift end time |
| `shift_evening_start` | `HH:mm` | Evening shift start time |
| `shift_evening_end` | `HH:mm` | Evening shift end time |
| `shift_night_start` | `HH:mm` | Night shift start time |
| `shift_night_end` | `HH:mm` | Night shift end time |

---

### `audit_logs` — سجل العمليات

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| action | TEXT | Arabic action description |
| entity_type | TEXT | `case`, `department`, `auth`, `settings`, `backup`, etc. |
| entity_id | INTEGER | ID of affected record |
| entity_name | TEXT | Name of affected record |
| details | TEXT | JSON string with extra context |
| performed_by | TEXT | Who performed the action (default: 'المستخدم') |
| created_at | TIMESTAMP | Auto (pruned after 1 month) |

---

### `incident_reports` — بلاغات الحوادث

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| incident_type | TEXT | Type of mass-casualty incident |
| incident_location | TEXT | Location description |
| report_date | TIMESTAMP | When the incident occurred |
| report_day | TEXT | Day of week (Arabic) |
| report_time | TEXT | Time string |
| total_injured | INTEGER | Total injured count |
| total_deaths | INTEGER | Total deaths |
| hospitals_transferred_to | TEXT | Transfer destination hospital(s) |
| cases_json | TEXT | JSON array of individual case details |
| created_at | TIMESTAMP | Auto |
| updated_at | TIMESTAMP | Auto |

---

### `backups` — النسخ الاحتياطية

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| backup_name | TEXT | Backup label |
| backup_data | TEXT | Full JSON export of all data |
| record_count | INTEGER | Total number of records backed up |
| created_at | TIMESTAMP | Auto |

---

## Migrations

Incremental schema changes are tracked in `migrations/`:

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | Full initial schema + seed data |
| `002_add_report_fields_to_departments.sql` | Adds `report_fields_json` column |
| `003_add_medical_report_to_waiting_cases.sql` | Adds `medical_report*` columns |

To apply migrations to an existing database:
```bash
psql -h localhost -U bsch_user -d bsch_db -f migrations/002_add_report_fields_to_departments.sql
psql -h localhost -U bsch_user -d bsch_db -f migrations/003_add_medical_report_to_waiting_cases.sql
```

The application also applies `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` automatically at startup,
so fresh installs using `SCHEMA.sql` do not need to run migrations separately.

---

## Useful Queries

```sql
-- Active cases by department with occupancy %
SELECT d.name, COUNT(m.id) AS active, d.capacity,
       ROUND(COUNT(m.id) * 100.0 / d.capacity, 1) AS occupancy_pct
FROM departments d
LEFT JOIN medical_cases m ON m.department_id = d.id AND m.status IN ('active','recovering','critical')
GROUP BY d.id, d.name, d.capacity
ORDER BY occupancy_pct DESC;

-- Cases on artificial respiration (active only)
SELECT patient_name, artificial_respiration, admission_date,
       EXTRACT(DAY FROM NOW() - admission_date) AS days_admitted
FROM medical_cases
WHERE artificial_respiration != 'no' AND status != 'discharged'
ORDER BY admission_date;

-- Waiting queue summary
SELECT section, care_type, COUNT(*) AS count
FROM waiting_cases WHERE status = 'waiting'
GROUP BY section, care_type ORDER BY section, count DESC;

-- Recent audit log
SELECT action, entity_name, performed_by, created_at
FROM audit_logs ORDER BY created_at DESC LIMIT 20;

-- Discharge statistics this month
SELECT discharge_reason, COUNT(*) AS count
FROM medical_cases
WHERE status = 'discharged'
  AND discharge_date >= DATE_TRUNC('month', NOW())
GROUP BY discharge_reason;
```
