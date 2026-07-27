/**
 * Database initialization: creates all tables and seeds required data.
 * Runs once at server startup — PostgreSQL compatible.
 */
import { sql, count } from "drizzle-orm";
import { db, settingsTable, departmentsTable } from "@workspace/db";
import { logger } from "./logger";

// Helper: ADD COLUMN only when the column doesn't already exist.
// PostgreSQL supports ADD COLUMN IF NOT EXISTS since 9.6.
async function addColumnSafe(table: string, column: string, definition: string): Promise<void> {
  await db.execute(
    sql.raw(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`)
  );
}

export async function initDatabase(): Promise<void> {
  try {
    // ── Create tables ─────────────────────────────────────────────────────────

    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS departments (
        id                 SERIAL PRIMARY KEY,
        name               TEXT NOT NULL,
        code               TEXT NOT NULL,
        description        TEXT,
        capacity           INTEGER NOT NULL DEFAULT 10,
        department_type    TEXT NOT NULL,
        report_fields_json TEXT NOT NULL DEFAULT '[]',
        created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT departments_code_unique UNIQUE (code)
      )
    `));

    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS medical_cases (
        id                     SERIAL PRIMARY KEY,
        patient_name           TEXT NOT NULL,
        department_id          INTEGER NOT NULL,
        age                    TEXT,
        diagnosis              TEXT,
        symptoms               TEXT,
        treatment              TEXT,
        notes                  TEXT,
        parent_name            TEXT,
        parent_phone           TEXT,
        national_id            TEXT,
        file_number            TEXT,
        case_type              TEXT NOT NULL DEFAULT 'intensive_care_high',
        artificial_respiration TEXT NOT NULL DEFAULT 'no',
        status                 TEXT NOT NULL DEFAULT 'active',
        mobe                   TEXT,
        ventilation_start_date TIMESTAMPTZ,
        ventilation_end_date   TIMESTAMPTZ,
        discharge_reason       TEXT,
        transfer_destination   TEXT,
        admission_date         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        discharge_date         TIMESTAMPTZ,
        created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `));

    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS waiting_cases (
        id                     SERIAL PRIMARY KEY,
        patient_name           TEXT NOT NULL,
        age                    TEXT,
        diagnosis              TEXT,
        parent_phone           TEXT,
        national_id            TEXT,
        medical_report         TEXT,
        medical_report_name    TEXT,
        medical_report_data    TEXT,
        care_type              TEXT NOT NULL,
        central_room_required  BOOLEAN NOT NULL DEFAULT FALSE,
        central_room_code      TEXT,
        artificial_respiration TEXT NOT NULL DEFAULT 'no',
        section                TEXT NOT NULL DEFAULT 'reception',
        status                 TEXT NOT NULL DEFAULT 'waiting',
        created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `));

    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS settings (
        id         SERIAL PRIMARY KEY,
        key        TEXT NOT NULL,
        value      TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT settings_key_unique UNIQUE (key)
      )
    `));

    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id           SERIAL PRIMARY KEY,
        action       TEXT NOT NULL,
        entity_type  TEXT NOT NULL,
        entity_id    INTEGER,
        entity_name  TEXT,
        details      TEXT,
        performed_by TEXT DEFAULT 'المستخدم',
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `));

    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS incident_reports (
        id                       SERIAL PRIMARY KEY,
        incident_type            TEXT NOT NULL,
        incident_location        TEXT NOT NULL,
        report_date              TIMESTAMPTZ NOT NULL,
        report_day               TEXT,
        report_time              TEXT,
        total_injured            INTEGER NOT NULL DEFAULT 0,
        total_deaths             INTEGER NOT NULL DEFAULT 0,
        hospitals_transferred_to TEXT,
        cases_json               TEXT NOT NULL DEFAULT '[]',
        created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `));

    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS backups (
        id           SERIAL PRIMARY KEY,
        backup_name  TEXT NOT NULL,
        backup_data  TEXT NOT NULL,
        record_count INTEGER NOT NULL DEFAULT 0,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `));

    // ── Schema migrations: add columns introduced in later versions ────────────
    // PostgreSQL supports ADD COLUMN IF NOT EXISTS — no try/catch needed
    await addColumnSafe("medical_cases", "transfer_destination", "TEXT");
    await addColumnSafe("departments",   "report_fields_json",  "TEXT NOT NULL DEFAULT '[]'");
    await addColumnSafe("waiting_cases", "medical_report",      "TEXT");
    await addColumnSafe("waiting_cases", "medical_report_name", "TEXT");
    await addColumnSafe("waiting_cases", "medical_report_data", "TEXT");

    // ── Convert legacy PostgreSQL ENUM columns to TEXT ────────────────────────
    // Early versions of the schema used pgEnum types. TEXT is now used instead
    // so that custom values (like 'internal') can be stored freely.
    // These ALTERs are idempotent — silently ignored if the column is already TEXT.
    const enumToTextMigrations: Array<[string, string]> = [
      ["departments",   "department_type"],
      ["medical_cases", "case_type"],
      ["medical_cases", "artificial_respiration"],
      ["medical_cases", "status"],
      ["medical_cases", "discharge_reason"],
      ["waiting_cases", "care_type"],
      ["waiting_cases", "artificial_respiration"],
      ["waiting_cases", "section"],
      ["waiting_cases", "status"],
    ];
    for (const [table, column] of enumToTextMigrations) {
      try {
        await db.execute(
          sql.raw(`ALTER TABLE ${table} ALTER COLUMN ${column} TYPE TEXT USING ${column}::TEXT`)
        );
      } catch {
        // Already TEXT or column doesn't exist — safe to continue
      }
    }

    // ── Seed departments if table is empty ────────────────────────────────────
    const [{ value: deptCount }] = await db
      .select({ value: count() })
      .from(departmentsTable);

    if (Number(deptCount) === 0) {
      await db.insert(departmentsTable).values([
        { name: "العناية المركزة عالية",   code: "ICU-HIGH", description: "وحدة العناية المركزة عالية",   capacity: 12, departmentType: "intensive_care_high"   },
        { name: "العناية المركزة متوسطة",  code: "ICU-MED",  description: "وحدة العناية المركزة متوسطة",  capacity: 10, departmentType: "intensive_care_medium" },
        { name: "العناية المركزة للأطفال", code: "PICU",     description: "وحدة العناية المركزة للأطفال", capacity:  8, departmentType: "picu"                  },
        { name: "الحاضنات أ",              code: "INC-A",    description: "وحدة الحاضنات أ",              capacity: 15, departmentType: "incubator_a"           },
        { name: "الحاضنات ب",              code: "INC-B",    description: "وحدة الحاضنات ب",              capacity: 15, departmentType: "incubator_b"           },
        { name: "الحاضنات ج",              code: "INC-C",    description: "وحدة الحاضنات ج",              capacity: 15, departmentType: "incubator_c"           },
      ]).onConflictDoUpdate({
        target: departmentsTable.code,
        set: { capacity: sql`EXCLUDED.capacity` },
      });
      logger.info("Seeded 6 departments");
    }

    // Always ensure the internal department exists (safe to re-run)
    await db.insert(departmentsTable).values([
      { name: "الداخلي", code: "INTERNAL", description: "القسم الداخلي", capacity: 24, departmentType: "internal" },
    ]).onConflictDoUpdate({
      target: departmentsTable.code,
      set: { capacity: sql`EXCLUDED.capacity` },
    });

    // ── Seed default settings ─────────────────────────────────────────────────
    await db.insert(settingsTable).values([
      { key: "hospital_name",       value: "مجمع بن صالح الصحي" },
      { key: "hospital_logo",       value: null },
      { key: "login_password",      value: "bsch2024" },
      { key: "shift_morning_start", value: "07:00" },
      { key: "shift_morning_end",   value: "14:00" },
      { key: "shift_evening_start", value: "14:00" },
      { key: "shift_evening_end",   value: "21:00" },
      { key: "shift_night_start",   value: "21:00" },
      { key: "shift_night_end",     value: "07:00" },
    ]).onConflictDoUpdate({
      target: settingsTable.key,
      set: { value: sql`EXCLUDED.value` },
    });

    logger.info("Database initialization complete");
  } catch (err) {
    logger.error({ err }, "Database initialization failed");
    throw err;
  }
}
