# BSCH — Database Documentation

**Engine:** MySQL 8.0+  
**Database:** `bsch_db`  
**Character Set:** `utf8mb4` / `utf8mb4_unicode_ci`  
**ORM:** Drizzle ORM (`drizzle-orm/mysql-core`)  
**Schema files:** `lib/db/src/schema/`

---

## Connection Configuration

Credentials are read from environment variables (set by Electron from `bsch.config.json`):

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `127.0.0.1` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `bsch_user` | MySQL username |
| `DB_PASSWORD` | `bsch_password` | MySQL password |
| `DB_NAME` | `bsch_db` | Database name |

The connection pool is initialized in `lib/db/src/index.ts` using `mysql2/promise`.

---

## Initial Setup SQL

Run once before first launch:

```sql
CREATE DATABASE bsch_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'bsch_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON bsch_db.* TO 'bsch_user'@'localhost';
FLUSH PRIVILEGES;
```

Tables are **created automatically** on first startup via `db-init.ts`.

---

## Tables

### `departments`

Stores ICU/PICU/Incubator department definitions.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `INT AUTO_INCREMENT` | Primary key |
| `name` | `VARCHAR(255)` | Arabic department name |
| `code` | `VARCHAR(50)` | Unique short code (e.g. `ICU-HIGH`) |
| `capacity` | `INT` | Maximum patient capacity |
| `department_type` | `ENUM` | See enum values below |
| `created_at` | `DATETIME` | Auto-set on insert |

**`department_type` ENUM values:**
- `icu_high` — العناية المركزة عالية الرعاية
- `icu_medium` — العناية المركزة متوسطة الرعاية
- `picu` — عناية مركزة أطفال
- `incubators` — حضانات
- `nicu` — وحدة مكثف حديثي الولادة
- `general` — عام

**Seed data (auto-inserted on first run):**
| Name | Code | Capacity | Type |
|------|------|----------|------|
| العناية المركزة عالية الرعاية | ICU-HIGH | 10 | icu_high |
| العناية المركزة متوسطة الرعاية | ICU-MED | 15 | icu_medium |
| عناية مركزة الأطفال | PICU | 12 | picu |
| الحضانات | INC | 20 | incubators |
| وحدة مكثف حديثي الولادة | NICU | 10 | nicu |
| عام | GEN | 50 | general |

---

### `medical_cases`

Core table — one row per admitted patient.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `INT AUTO_INCREMENT` | Primary key |
| `patient_name` | `VARCHAR(255)` | Full name in Arabic |
| `national_id` | `VARCHAR(50)` | National ID or passport |
| `file_number` | `VARCHAR(100)` | Hospital file number |
| `age` | `VARCHAR(50)` | Age (stored as text for flexibility) |
| `gender` | `ENUM('male','female')` | Gender |
| `department_id` | `INT` | FK → `departments.id` |
| `case_type` | `ENUM` | `elective` / `emergency` |
| `status` | `ENUM` | See below |
| `diagnosis` | `TEXT` | Primary diagnosis (Arabic) |
| `artificial_respiration` | `ENUM` | Ventilation type |
| `mobe` | `TEXT` | Medical observation notes |
| `admission_date` | `DATETIME` | Date/time of admission |
| `discharge_date` | `DATETIME` | Date/time of discharge (nullable) |
| `discharge_reason` | `ENUM` | See below (nullable) |
| `ventilation_start_date` | `DATETIME` | Ventilation start (nullable) |
| `ventilation_end_date` | `DATETIME` | Ventilation end (nullable) |
| `created_at` | `DATETIME` | Auto-set on insert |
| `updated_at` | `DATETIME` | Auto-updated on change |

**`status` ENUM values:**
- `active` — نشط
- `recovering` — في طور التعافي
- `critical` — حالة حرجة
- `discharged` — تم الصرف

**`artificial_respiration` ENUM values:**
- `none` — لا يوجد
- `invasive` — جهاز تنفس اصطناعي (invasive)
- `non_invasive` — جهاز تنفس غير جراحي (CPAP/BiPAP)
- `oxygen` — أكسجين فقط

**`discharge_reason` ENUM values:**
- `improved` — تحسّن حالته
- `request` — بناءً على طلب الأسرة
- `transferred` — تحويل لمستشفى آخر
- `death` — وفاة

---

### `waiting_cases`

Patients waiting for an ICU/PICU bed.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `INT AUTO_INCREMENT` | Primary key |
| `patient_name` | `VARCHAR(255)` | Patient name |
| `age` | `VARCHAR(50)` | Age |
| `gender` | `ENUM('male','female')` | Gender |
| `care_type` | `ENUM` | `servo` (servo/ventilated) / `reception` (regular) |
| `status` | `ENUM` | `waiting` / `admitted` / `cancelled` |
| `medical_report_data` | `LONGTEXT` | JSON blob — full patient report data |
| `requesting_doctor` | `VARCHAR(255)` | Referring doctor name |
| `requesting_hospital` | `VARCHAR(255)` | Referring hospital |
| `created_at` | `DATETIME` | |
| `updated_at` | `DATETIME` | |

---

### `settings`

Key/value store for system-wide configuration.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `INT AUTO_INCREMENT` | Primary key |
| `key` | `VARCHAR(255)` | Unique setting key |
| `value` | `TEXT` | Setting value (string/JSON) |
| `updated_at` | `DATETIME` | |

**Default settings (auto-seeded):**

| Key | Default Value | Description |
|-----|--------------|-------------|
| `hospital_name` | مستشفى الأطفال التخصصي بالبحيرة | Displayed in reports/header |
| `founder_password` | bsch2024 | Main login password |
| `settings_password` | @Bahnasy | Password to access Settings page |
| `logo` | _(empty)_ | Base64-encoded logo image |
| `morning_shift_start` | 08:00 | Morning shift start time |
| `morning_shift_end` | 14:00 | Morning shift end time |
| `afternoon_shift_start` | 14:00 | Afternoon shift start |
| `afternoon_shift_end` | 20:00 | Afternoon shift end |
| `night_shift_start` | 20:00 | Night shift start |
| `night_shift_end` | 08:00 | Night shift end |

---

### `audit_logs`

Immutable record of every user action.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `INT AUTO_INCREMENT` | Primary key |
| `action` | `VARCHAR(100)` | e.g. `create`, `update`, `delete`, `discharge`, `login` |
| `entity_type` | `VARCHAR(100)` | e.g. `medical_case`, `department` |
| `entity_id` | `INT` | ID of the affected record |
| `details` | `TEXT` | JSON blob — changed fields / context |
| `performed_by` | `VARCHAR(255)` | User identifier (session) |
| `created_at` | `DATETIME` | |

---

### `incident_reports`

Mass-casualty and incident documentation.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `INT AUTO_INCREMENT` | Primary key |
| `incident_type` | `VARCHAR(255)` | Type of incident |
| `incident_date` | `DATETIME` | When it occurred |
| `total_injured` | `INT` | Total injured count |
| `total_deaths` | `INT` | Total fatalities |
| `cases_json` | `LONGTEXT` | JSON array of involved patient records |
| `notes` | `TEXT` | Free-form notes |
| `created_at` | `DATETIME` | |

---

### `backups`

Application-level JSON backups (full database snapshots stored in-DB).

| Column | Type | Notes |
|--------|------|-------|
| `id` | `INT AUTO_INCREMENT` | Primary key |
| `backup_name` | `VARCHAR(255)` | Human-readable backup name |
| `backup_data` | `LONGTEXT` | Full JSON export of all tables |
| `created_at` | `DATETIME` | |

> **Note:** For large deployments, consider exporting backups to `.json` files on disk rather than storing in the database. The Backup page supports download to local disk.

---

## Entity Relationships

```
departments ──┐
              │ department_id (FK)
              ▼
       medical_cases
              │
              │ (waiting_cases → medical_cases on admission)
              ▼
       waiting_cases

settings      (no FK — standalone key/value)
audit_logs    (entity_id references any table — soft FK)
incident_reports (cases_json — denormalized copy of case data)
backups       (full snapshot — no FK)
```

---

## Schema Migration

The app uses **runtime migration** via `db-init.ts` (not Drizzle Kit push in production):

- Tables are created with `CREATE TABLE IF NOT EXISTS` on every startup
- New columns are added with `addColumnSafe()` which catches MySQL error 1060 (duplicate column) silently
- **To add a new column in a future version:**
  1. Add the column to the Drizzle schema file in `lib/db/src/schema/`
  2. Add an `addColumnSafe(...)` call in `db-init.ts`
  3. Rebuild and distribute — the column is added automatically on next launch
