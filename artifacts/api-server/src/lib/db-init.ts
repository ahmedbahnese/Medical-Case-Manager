/**
 * Database initialization: creates all tables and seeds required data.
 * Runs once at server startup — MySQL 8+ compatible.
 * No PostgreSQL-specific syntax (no DO $$, no SERIAL, no ON CONFLICT).
 */
import { sql, count } from "drizzle-orm";
import { db, settingsTable, departmentsTable } from "@workspace/db";
import { logger } from "./logger";

// Helper: ALTER TABLE ADD COLUMN only when the column doesn't already exist.
// MySQL (unlike PostgreSQL) has no IF NOT EXISTS clause for ALTER TABLE.
async function addColumnSafe(table: string, column: string, definition: string): Promise<void> {
  try {
    await db.execute(sql.raw(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`));
  } catch (e: any) {
    // Error 1060 = "Duplicate column name" — column already exists, safe to ignore.
    if (e?.errno !== 1060 && !String(e?.message ?? "").includes("Duplicate column name")) {
      throw e;
    }
  }
}

export async function initDatabase(): Promise<void> {
  try {
    // ── Create tables ─────────────────────────────────────────────────────────
    // MySQL uses inline ENUMs — no separate type declarations needed.

    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS \`departments\` (
        \`id\`                 INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`name\`               TEXT NOT NULL,
        \`code\`               VARCHAR(64) NOT NULL,
        \`description\`        TEXT,
        \`capacity\`           INT NOT NULL DEFAULT 10,
        \`department_type\`    ENUM('intensive_care_high','intensive_care_medium','picu','incubator_a','incubator_b','incubator_c') NOT NULL,
        \`report_fields_json\` TEXT NOT NULL DEFAULT '[]',
        \`created_at\`         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\`         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`departments_code_unique\` (\`code\`(64))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `));

    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS \`medical_cases\` (
        \`id\`                     INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`patient_name\`           TEXT NOT NULL,
        \`department_id\`          INT NOT NULL,
        \`age\`                    TEXT,
        \`diagnosis\`              TEXT,
        \`symptoms\`               TEXT,
        \`treatment\`              TEXT,
        \`notes\`                  TEXT,
        \`parent_name\`            TEXT,
        \`parent_phone\`           TEXT,
        \`national_id\`            TEXT,
        \`file_number\`            TEXT,
        \`case_type\`              ENUM('intensive_care_high','intensive_care_medium','picu','incubator') NOT NULL DEFAULT 'intensive_care_high',
        \`artificial_respiration\` ENUM('high_frequency','vent','cpap','hfnc','standby','box','no') NOT NULL DEFAULT 'no',
        \`status\`                 ENUM('active','recovering','discharged','critical') NOT NULL DEFAULT 'active',
        \`mobe\`                   TEXT,
        \`ventilation_start_date\` TIMESTAMP NULL DEFAULT NULL,
        \`ventilation_end_date\`   TIMESTAMP NULL DEFAULT NULL,
        \`discharge_reason\`       ENUM('improved','request','transferred','death') DEFAULT NULL,
        \`admission_date\`         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`discharge_date\`         TIMESTAMP NULL DEFAULT NULL,
        \`created_at\`             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\`             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `));

    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS \`waiting_cases\` (
        \`id\`                     INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`patient_name\`           TEXT NOT NULL,
        \`age\`                    TEXT,
        \`diagnosis\`              TEXT,
        \`parent_phone\`           TEXT,
        \`national_id\`            TEXT,
        \`medical_report\`         TEXT,
        \`medical_report_name\`    TEXT,
        \`medical_report_data\`    LONGTEXT,
        \`care_type\`              ENUM('intensive_care_high','intensive_care_medium','picu','incubator') NOT NULL,
        \`central_room_required\`  TINYINT(1) NOT NULL DEFAULT 0,
        \`central_room_code\`      TEXT,
        \`artificial_respiration\` ENUM('high_frequency','vent','cpap','hfnc','standby','box','no') NOT NULL DEFAULT 'no',
        \`section\`                ENUM('servo','reception') NOT NULL DEFAULT 'reception',
        \`status\`                 ENUM('waiting','admitted','cancelled') NOT NULL DEFAULT 'waiting',
        \`created_at\`             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\`             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `));

    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS \`settings\` (
        \`id\`         INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`key\`        VARCHAR(255) NOT NULL,
        \`value\`      TEXT,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`settings_key_unique\` (\`key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `));

    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS \`audit_logs\` (
        \`id\`           INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`action\`       TEXT NOT NULL,
        \`entity_type\`  TEXT NOT NULL,
        \`entity_id\`    INT DEFAULT NULL,
        \`entity_name\`  TEXT,
        \`details\`      TEXT,
        \`performed_by\` TEXT DEFAULT 'المستخدم',
        \`created_at\`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `));

    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS \`incident_reports\` (
        \`id\`                        INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`incident_type\`             TEXT NOT NULL,
        \`incident_location\`         TEXT NOT NULL,
        \`report_date\`               TIMESTAMP NOT NULL,
        \`report_day\`                TEXT,
        \`report_time\`               TEXT,
        \`total_injured\`             INT NOT NULL DEFAULT 0,
        \`total_deaths\`              INT NOT NULL DEFAULT 0,
        \`hospitals_transferred_to\`  TEXT,
        \`cases_json\`                TEXT NOT NULL DEFAULT '[]',
        \`created_at\`                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\`                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `));

    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS \`backups\` (
        \`id\`           INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`backup_name\`  TEXT NOT NULL,
        \`backup_data\`  LONGTEXT NOT NULL,
        \`record_count\` INT NOT NULL DEFAULT 0,
        \`created_at\`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `));

    // ── Schema migration: add columns introduced in later versions ─────────────
    await addColumnSafe("departments",   "report_fields_json",  "TEXT NOT NULL DEFAULT '[]'");
    await addColumnSafe("waiting_cases", "medical_report",      "TEXT");
    await addColumnSafe("waiting_cases", "medical_report_name", "TEXT");
    await addColumnSafe("waiting_cases", "medical_report_data", "LONGTEXT");

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
      ]).onDuplicateKeyUpdate({ set: { capacity: sql`capacity` } });
      logger.info("Seeded 6 departments");
    }

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
    ]).onDuplicateKeyUpdate({ set: { value: sql`value` } });

    logger.info("Database initialization complete");
  } catch (err) {
    logger.error({ err }, "Database initialization failed");
    throw err;
  }
}
