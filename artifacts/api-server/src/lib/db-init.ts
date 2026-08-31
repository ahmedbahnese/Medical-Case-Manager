import { sql, count } from "drizzle-orm";
import { db, settingsTable, departmentsTable } from "@workspace/db";
import { logger } from "./logger";

export async function initDatabase(): Promise<void> {
  try {
    const ddl = [
      `CREATE TABLE IF NOT EXISTS departments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, code TEXT NOT NULL UNIQUE, description TEXT, capacity INTEGER NOT NULL DEFAULT 10, department_type TEXT NOT NULL, report_fields_json TEXT NOT NULL DEFAULT '[]', created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000), updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000))`,
      `CREATE TABLE IF NOT EXISTS medical_cases (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_name TEXT NOT NULL, department_id INTEGER NOT NULL, age TEXT, diagnosis TEXT, symptoms TEXT, treatment TEXT, notes TEXT, parent_name TEXT, parent_phone TEXT, national_id TEXT, file_number TEXT, case_type TEXT NOT NULL DEFAULT 'intensive_care_high', artificial_respiration TEXT NOT NULL DEFAULT 'no', status TEXT NOT NULL DEFAULT 'active', mobe TEXT, ventilation_start_date INTEGER, ventilation_end_date INTEGER, discharge_reason TEXT, transfer_destination TEXT, admission_date INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000), discharge_date INTEGER, created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000), updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000))`,
      `CREATE TABLE IF NOT EXISTS waiting_cases (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_name TEXT NOT NULL, age TEXT, diagnosis TEXT, parent_phone TEXT, national_id TEXT, medical_report TEXT, medical_report_name TEXT, medical_report_data TEXT, care_type TEXT NOT NULL, central_room_required INTEGER NOT NULL DEFAULT 0, central_room_code TEXT, artificial_respiration TEXT NOT NULL DEFAULT 'no', section TEXT NOT NULL DEFAULT 'reception', status TEXT NOT NULL DEFAULT 'waiting', created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000), updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000))`,
      `CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL UNIQUE, value TEXT, updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000))`,
      `CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id INTEGER, entity_name TEXT, details TEXT, performed_by TEXT DEFAULT 'المستخدم', created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000))`,
      `CREATE TABLE IF NOT EXISTS incident_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, incident_type TEXT NOT NULL, incident_location TEXT NOT NULL, report_date INTEGER NOT NULL, report_day TEXT, report_time TEXT, total_injured INTEGER NOT NULL DEFAULT 0, total_deaths INTEGER NOT NULL DEFAULT 0, hospitals_transferred_to TEXT, cases_json TEXT NOT NULL DEFAULT '[]', created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000), updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000))`,
      `CREATE TABLE IF NOT EXISTS backups (id INTEGER PRIMARY KEY AUTOINCREMENT, backup_name TEXT NOT NULL, backup_data TEXT NOT NULL, record_count INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000))`,
      `CREATE TABLE IF NOT EXISTS ovr_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, ovr_number TEXT NOT NULL UNIQUE, event_date INTEGER NOT NULL, department_id INTEGER, location TEXT NOT NULL, category TEXT NOT NULL, event_type TEXT NOT NULL, description TEXT NOT NULL, reporter_name TEXT NOT NULL, reporter_account TEXT, patient_related INTEGER NOT NULL DEFAULT 0, patient_id INTEGER, patient_name TEXT, hospital_number TEXT, attending_doctor TEXT, nursing_supervisor TEXT, administrative_manager TEXT, impact TEXT NOT NULL DEFAULT 'No Harm', immediate_action TEXT, corrective_action TEXT, action_owner TEXT, attachments_json TEXT NOT NULL DEFAULT '[]', notes TEXT, status TEXT NOT NULL DEFAULT 'New', created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000), updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000))`,
      `CREATE TABLE IF NOT EXISTS quality_investigations (id INTEGER PRIMARY KEY AUTOINCREMENT, ovr_id INTEGER NOT NULL, contributing_causes TEXT, root_cause TEXT, findings TEXT, recommendations TEXT, investigated_by TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000), updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000))`,
      `CREATE TABLE IF NOT EXISTS capa_records (id INTEGER PRIMARY KEY AUTOINCREMENT, capa_number TEXT NOT NULL UNIQUE, ovr_id INTEGER, department_id INTEGER, problem_finding TEXT NOT NULL, root_cause TEXT, corrective_action TEXT NOT NULL, preventive_action TEXT, responsible_person TEXT NOT NULL, due_date INTEGER, priority TEXT NOT NULL DEFAULT 'Medium', status TEXT NOT NULL DEFAULT 'Open', evidence_json TEXT NOT NULL DEFAULT '[]', implementation_date INTEGER, verification TEXT, verification_result TEXT, closure_date INTEGER, closed_by TEXT, created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000), updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000))`,
      `CREATE TABLE IF NOT EXISTS quality_risks (id INTEGER PRIMARY KEY AUTOINCREMENT, risk TEXT NOT NULL, department_id INTEGER, probability INTEGER NOT NULL DEFAULT 1, impact INTEGER NOT NULL DEFAULT 1, risk_level TEXT NOT NULL DEFAULT 'Low', mitigation TEXT, responsible_person TEXT, due_date INTEGER, status TEXT NOT NULL DEFAULT 'Open', created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000), updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000))`,
      `CREATE TABLE IF NOT EXISTS quality_audits (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, department_id INTEGER, audit_date INTEGER NOT NULL, notes TEXT, findings TEXT, non_conformity TEXT, required_actions TEXT, status TEXT NOT NULL DEFAULT 'Open', created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000), updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000))`,
      `CREATE TABLE IF NOT EXISTS quality_indicators (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT, source TEXT NOT NULL DEFAULT 'manual', target TEXT, active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000), updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000))`,
      `CREATE TABLE IF NOT EXISTS quality_notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, recipient TEXT NOT NULL, type TEXT NOT NULL, message TEXT NOT NULL, entity_type TEXT, entity_id INTEGER, read_at INTEGER, created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000))`,
    ];
    for (const statement of ddl) await db.run(sql.raw(statement));

    const [{ value: deptCount }] = await db.select({ value: count() }).from(departmentsTable);
    if (Number(deptCount) === 0) {
      await db.insert(departmentsTable).values([
        { name: "العناية المركزة عالية", code: "ICU-HIGH", description: "وحدة العناية المركزة عالية", capacity: 12, departmentType: "intensive_care_high" },
        { name: "العناية المركزة متوسطة", code: "ICU-MED", description: "وحدة العناية المركزة متوسطة", capacity: 10, departmentType: "intensive_care_medium" },
        { name: "العناية المركزة للأطفال", code: "PICU", description: "وحدة العناية المركزة للأطفال", capacity: 8, departmentType: "picu" },
        { name: "الحاضنات أ", code: "INC-A", description: "وحدة الحاضنات أ", capacity: 15, departmentType: "incubator_a" },
        { name: "الحاضنات ب", code: "INC-B", description: "وحدة الحاضنات ب", capacity: 15, departmentType: "incubator_b" },
        { name: "الحاضنات ج", code: "INC-C", description: "وحدة الحاضنات ج", capacity: 15, departmentType: "incubator_c" },
      ]);
    }
    await db.insert(departmentsTable).values({ name: "الداخلي", code: "INTERNAL", description: "القسم الداخلي", capacity: 24, departmentType: "internal" }).onConflictDoNothing();
    await db.insert(settingsTable).values([
      { key: "hospital_name", value: "مجمع بن صالح الصحي" }, { key: "hospital_logo", value: null },
      { key: "login_password", value: "bsch2024" }, { key: "shift_morning_start", value: "07:00" },
      { key: "shift_morning_end", value: "14:00" }, { key: "shift_evening_start", value: "14:00" },
      { key: "shift_evening_end", value: "21:00" }, { key: "shift_night_start", value: "21:00" },
      { key: "shift_night_end", value: "07:00" },
    ]).onConflictDoNothing();
    logger.info({ database: process.env.BSCH_DATABASE_PATH }, "SQLite database initialized");
  } catch (err) {
    logger.error({ err }, "SQLite database initialization failed");
    throw err;
  }
}
