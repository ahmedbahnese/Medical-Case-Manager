/**
 * Database initialization: creates all tables and seeds required data
 * if the database is empty. Runs once at server startup.
 */
import { sql } from "drizzle-orm";
import { db, settingsTable, departmentsTable } from "@workspace/db";
import { logger } from "./logger";

export async function initDatabase(): Promise<void> {
  try {
    // Create enums first (ignore if already exist)
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE department_type AS ENUM (
          'intensive_care_high','intensive_care_medium','picu',
          'incubator_a','incubator_b','incubator_c'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE case_type AS ENUM (
          'intensive_care_high','intensive_care_medium','picu','incubator'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE artificial_respiration AS ENUM (
          'high_frequency','vent','cpap','hfnc','standby','box','no'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE case_status AS ENUM ('active','recovering','discharged','critical');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE discharge_reason AS ENUM ('improved','request','transferred','death');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE waiting_care_type AS ENUM (
          'intensive_care_high','intensive_care_medium','picu','incubator'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE waiting_respiration AS ENUM (
          'high_frequency','vent','cpap','hfnc','standby','box','no'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE waiting_section AS ENUM ('servo','reception');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE waiting_status AS ENUM ('waiting','admitted','cancelled');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // Create tables
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS departments (
        id          SERIAL PRIMARY KEY,
        name        TEXT NOT NULL,
        code        TEXT NOT NULL UNIQUE,
        description TEXT,
        capacity    INTEGER NOT NULL DEFAULT 10,
        department_type department_type NOT NULL,
        created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS medical_cases (
        id                   SERIAL PRIMARY KEY,
        patient_name         TEXT NOT NULL,
        department_id        INTEGER NOT NULL,
        age                  TEXT,
        diagnosis            TEXT,
        symptoms             TEXT,
        treatment            TEXT,
        notes                TEXT,
        parent_name          TEXT,
        parent_phone         TEXT,
        national_id          TEXT,
        file_number          TEXT,
        case_type            case_type NOT NULL DEFAULT 'intensive_care_high',
        artificial_respiration artificial_respiration NOT NULL DEFAULT 'no',
        status               case_status NOT NULL DEFAULT 'active',
        mobe                 TEXT,
        ventilation_start_date TIMESTAMP,
        ventilation_end_date   TIMESTAMP,
        discharge_reason     discharge_reason,
        admission_date       TIMESTAMP NOT NULL DEFAULT NOW(),
        discharge_date       TIMESTAMP,
        created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS waiting_cases (
        id                    SERIAL PRIMARY KEY,
        patient_name          TEXT NOT NULL,
        age                   TEXT,
        diagnosis             TEXT,
        parent_phone          TEXT,
        national_id           TEXT,
        care_type             waiting_care_type NOT NULL,
        central_room_required BOOLEAN NOT NULL DEFAULT FALSE,
        central_room_code     TEXT,
        artificial_respiration waiting_respiration NOT NULL DEFAULT 'no',
        section               waiting_section NOT NULL DEFAULT 'reception',
        status                waiting_status NOT NULL DEFAULT 'waiting',
        created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS settings (
        id         SERIAL PRIMARY KEY,
        key        TEXT NOT NULL UNIQUE,
        value      TEXT,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id           SERIAL PRIMARY KEY,
        action       TEXT NOT NULL,
        entity_type  TEXT NOT NULL,
        entity_id    INTEGER,
        entity_name  TEXT,
        details      TEXT,
        performed_by TEXT DEFAULT 'المستخدم',
        created_at   TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS incident_reports (
        id                      SERIAL PRIMARY KEY,
        incident_type           TEXT NOT NULL,
        incident_location       TEXT NOT NULL,
        report_date             TIMESTAMP NOT NULL,
        report_day              TEXT,
        report_time             TEXT,
        total_injured           INTEGER NOT NULL DEFAULT 0,
        total_deaths            INTEGER NOT NULL DEFAULT 0,
        hospitals_transferred_to TEXT,
        cases_json              TEXT NOT NULL DEFAULT '[]',
        created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS backups (
        id           SERIAL PRIMARY KEY,
        backup_name  TEXT NOT NULL,
        backup_data  TEXT NOT NULL,
        record_count INTEGER NOT NULL DEFAULT 0,
        created_at   TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Seed departments if table is empty
    const deptCount = await db.execute(sql`SELECT COUNT(*) FROM departments`);
    const count = Number((deptCount.rows[0] as any)?.count ?? 0);

    if (count === 0) {
      await db.execute(sql`
        INSERT INTO departments (name, code, description, capacity, department_type) VALUES
          ('العناية المركزة عالية',    'ICU-HIGH', 'وحدة العناية المركزة عالية',    12, 'intensive_care_high'),
          ('العناية المركزة متوسطة',   'ICU-MED',  'وحدة العناية المركزة متوسطة',   10, 'intensive_care_medium'),
          ('العناية المركزة للأطفال',  'PICU',     'وحدة العناية المركزة للأطفال',   8, 'picu'),
          ('الحاضنات أ',               'INC-A',    'وحدة الحاضنات أ',               15, 'incubator_a'),
          ('الحاضنات ب',               'INC-B',    'وحدة الحاضنات ب',               15, 'incubator_b'),
          ('الحاضنات ج',               'INC-C',    'وحدة الحاضنات ج',               15, 'incubator_c')
        ON CONFLICT (code) DO NOTHING
      `);
      logger.info("Seeded 6 departments");
    }

    // Seed default settings
    await db.execute(sql`
      INSERT INTO settings (key, value) VALUES
        ('hospital_name',       'مجمع بن صالح الصحي'),
        ('hospital_logo',       NULL),
        ('login_password',      'bsch2024'),
        ('shift_morning_start', '07:00'),
        ('shift_morning_end',   '14:00'),
        ('shift_evening_start', '14:00'),
        ('shift_evening_end',   '21:00'),
        ('shift_night_start',   '21:00'),
        ('shift_night_end',     '07:00')
      ON CONFLICT (key) DO NOTHING
    `);

    logger.info("Database initialization complete");
  } catch (err) {
    logger.error({ err }, "Database initialization failed");
    throw err;
  }
}
