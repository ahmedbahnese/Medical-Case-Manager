from pathlib import Path

root = Path('/home/ubuntu/Medical-Case-Manager')
for path in (root / 'lib/db/src/schema').glob('*.ts'):
    if path.name == 'index.ts':
        continue
    text = path.read_text()
    text = text.replace('from "drizzle-orm/pg-core"', 'from "drizzle-orm/sqlite-core"')
    text = text.replace('pgTable(', 'sqliteTable(')
    text = text.replace('serial(', 'integer(')
    text = text.replace('integer("id").primaryKey()', 'integer("id").primaryKey({ autoIncrement: true })')
    text = text.replace('timestamp(', 'integer(')
    text = text.replace('boolean(', 'integer(')
    text = text.replace('.defaultNow()', '.default(Date.now())')
    text = text.replace('integer("central_room_required")', 'integer("central_room_required", { mode: "boolean" })')
    text = text.replace('integer("report_date")', 'integer("report_date", { mode: "timestamp_ms" })')
    text = text.replace('integer("ventilation_start_date")', 'integer("ventilation_start_date", { mode: "timestamp_ms" })')
    text = text.replace('integer("ventilation_end_date")', 'integer("ventilation_end_date", { mode: "timestamp_ms" })')
    text = text.replace('integer("admission_date")', 'integer("admission_date", { mode: "timestamp_ms" })')
    text = text.replace('integer("discharge_date")', 'integer("discharge_date", { mode: "timestamp_ms" })')
    text = text.replace('integer("created_at")', 'integer("created_at", { mode: "timestamp_ms" })')
    text = text.replace('integer("updated_at")', 'integer("updated_at", { mode: "timestamp_ms" })')
    # timestamp columns without the exact replacements above
    for col in ['created_at', 'updated_at', 'report_date', 'ventilation_start_date', 'ventilation_end_date', 'admission_date', 'discharge_date']:
        text = text.replace(f'integer("{col}")', f'integer("{col}", {{ mode: "timestamp_ms" }})')
    # SQLite integer booleans must use mode boolean; repair duplicate options if any.
    text = text.replace('integer("central_room_required", { mode: "boolean" }, { mode: "boolean" })', 'integer("central_room_required", { mode: "boolean" })')
    path.write_text(text)

p = root / 'lib/db/src/index.ts'
p.write_text('''import Database from "better-sqlite3";\nimport { drizzle } from "drizzle-orm/better-sqlite3";\nimport * as schema from "./schema";\nimport fs from "node:fs";\nimport path from "node:path";\n\nconst dataDir = process.env.BSCH_DATA_DIR ?? path.join(process.cwd(), "data");\nfs.mkdirSync(dataDir, { recursive: true });\nconst databasePath = process.env.BSCH_DATABASE_PATH ?? path.join(dataDir, "bsch.sqlite");\nconst sqlite = new Database(databasePath);\nsqlite.pragma("journal_mode = WAL");\nsqlite.pragma("foreign_keys = ON");\n\nexport const db = drizzle(sqlite, { schema });\nexport { sqlite, databasePath };\nexport * from "./schema";\n''')

p = root / 'lib/db/package.json'
text = p.read_text().replace('"pg": "^8.13.3",', '"better-sqlite3": "^11.10.0",')
text = text.replace('"@types/pg": "^8.20.0",', '"@types/better-sqlite3": "^7.6.13",')
p.write_text(text)

p = root / 'artifacts/api-server/build.mjs'
text = p.read_text().replace('      "better-sqlite3",\n', '')
p.write_text(text)

p = root / 'artifacts/api-server/src/routes/audit-logs.ts'
text = p.read_text().replace("sql`NOW() - INTERVAL '1 month'`", 'sql`(strftime(\'%s\', \'now\') * 1000) - (30 * 24 * 60 * 60 * 1000)`')
p.write_text(text)
p = root / 'lib/db/drizzle.config.ts'
p.write_text('''import { defineConfig } from "drizzle-kit";\n\nexport default defineConfig({\n  schema: "./src/schema/index.ts",\n  out: "../../migrations",\n  dialect: "sqlite",\n  dbCredentials: {\n    url: process.env.BSCH_DATABASE_PATH ?? "../../data/bsch.sqlite",\n  },\n});\n''')
p = root / 'artifacts/api-server/src/lib/db-init.ts'
p.write_text('''import { sql, count } from "drizzle-orm";\nimport { db, settingsTable, departmentsTable } from "@workspace/db";\nimport { logger } from "./logger";\n\nexport async function initDatabase(): Promise<void> {\n  try {\n    const ddl = [\n      `CREATE TABLE IF NOT EXISTS departments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, code TEXT NOT NULL UNIQUE, description TEXT, capacity INTEGER NOT NULL DEFAULT 10, department_type TEXT NOT NULL, report_fields_json TEXT NOT NULL DEFAULT '[]', created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000), updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000))`,\n      `CREATE TABLE IF NOT EXISTS medical_cases (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_name TEXT NOT NULL, department_id INTEGER NOT NULL, age TEXT, diagnosis TEXT, symptoms TEXT, treatment TEXT, notes TEXT, parent_name TEXT, parent_phone TEXT, national_id TEXT, file_number TEXT, case_type TEXT NOT NULL DEFAULT 'intensive_care_high', artificial_respiration TEXT NOT NULL DEFAULT 'no', status TEXT NOT NULL DEFAULT 'active', mobe TEXT, ventilation_start_date INTEGER, ventilation_end_date INTEGER, discharge_reason TEXT, transfer_destination TEXT, admission_date INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000), discharge_date INTEGER, created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000), updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000))`,\n      `CREATE TABLE IF NOT EXISTS waiting_cases (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_name TEXT NOT NULL, age TEXT, diagnosis TEXT, parent_phone TEXT, national_id TEXT, medical_report TEXT, medical_report_name TEXT, medical_report_data TEXT, care_type TEXT NOT NULL, central_room_required INTEGER NOT NULL DEFAULT 0, central_room_code TEXT, artificial_respiration TEXT NOT NULL DEFAULT 'no', section TEXT NOT NULL DEFAULT 'reception', status TEXT NOT NULL DEFAULT 'waiting', created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000), updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000))`,\n      `CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL UNIQUE, value TEXT, updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000))`,\n      `CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id INTEGER, entity_name TEXT, details TEXT, performed_by TEXT DEFAULT 'المستخدم', created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000))`,\n      `CREATE TABLE IF NOT EXISTS incident_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, incident_type TEXT NOT NULL, incident_location TEXT NOT NULL, report_date INTEGER NOT NULL, report_day TEXT, report_time TEXT, total_injured INTEGER NOT NULL DEFAULT 0, total_deaths INTEGER NOT NULL DEFAULT 0, hospitals_transferred_to TEXT, cases_json TEXT NOT NULL DEFAULT '[]', created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000), updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000))`,\n      `CREATE TABLE IF NOT EXISTS backups (id INTEGER PRIMARY KEY AUTOINCREMENT, backup_name TEXT NOT NULL, backup_data TEXT NOT NULL, record_count INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000))`,\n    ];\n    for (const statement of ddl) await db.run(sql.raw(statement));\n\n    const [{ value: deptCount }] = await db.select({ value: count() }).from(departmentsTable);\n    if (Number(deptCount) === 0) {\n      await db.insert(departmentsTable).values([\n        { name: "العناية المركزة عالية", code: "ICU-HIGH", description: "وحدة العناية المركزة عالية", capacity: 12, departmentType: "intensive_care_high" },\n        { name: "العناية المركزة متوسطة", code: "ICU-MED", description: "وحدة العناية المركزة متوسطة", capacity: 10, departmentType: "intensive_care_medium" },\n        { name: "العناية المركزة للأطفال", code: "PICU", description: "وحدة العناية المركزة للأطفال", capacity: 8, departmentType: "picu" },\n        { name: "الحاضنات أ", code: "INC-A", description: "وحدة الحاضنات أ", capacity: 15, departmentType: "incubator_a" },\n        { name: "الحاضنات ب", code: "INC-B", description: "وحدة الحاضنات ب", capacity: 15, departmentType: "incubator_b" },\n        { name: "الحاضنات ج", code: "INC-C", description: "وحدة الحاضنات ج", capacity: 15, departmentType: "incubator_c" },\n      ]);\n    }\n    await db.insert(departmentsTable).values({ name: "الداخلي", code: "INTERNAL", description: "القسم الداخلي", capacity: 24, departmentType: "internal" }).onConflictDoNothing();\n    await db.insert(settingsTable).values([\n      { key: "hospital_name", value: "مجمع بن صالح الصحي" }, { key: "hospital_logo", value: null },\n      { key: "login_password", value: "bsch2024" }, { key: "shift_morning_start", value: "07:00" },\n      { key: "shift_morning_end", value: "14:00" }, { key: "shift_evening_start", value: "14:00" },\n      { key: "shift_evening_end", value: "21:00" }, { key: "shift_night_start", value: "21:00" },\n      { key: "shift_night_end", value: "07:00" },\n    ]).onConflictDoNothing();\n    logger.info({ database: process.env.BSCH_DATABASE_PATH }, "SQLite database initialized");\n  } catch (err) {\n    logger.error({ err }, "SQLite database initialization failed");\n    throw err;\n  }\n}\n''')
p = root / 'electron/main.js'
text = p.read_text()
start = text.index('// ─── MySQL config')
end = text.index('// ─── Start API Server', start)
replacement = '''// ─── Local SQLite database ─────────────────────────────────────────────────────\nfunction loadDbConfig() {\n  const dataDir = app.getPath('userData');\n  fs.mkdirSync(dataDir, { recursive: true });\n  return { BSCH_DATA_DIR: dataDir, BSCH_DATABASE_PATH: path.join(dataDir, 'bsch.sqlite') };\n}\n\n'''
text = text[:start] + replacement + text[end:]
p.write_text(text)
p = root / 'electron/package.json'
text = p.read_text().replace('"files": [\n      "main.js",', '"files": [\n      "main.js",')
text = text.replace('"api-server/dist"\n      },', '"api-server/dist"\n      },')
p.write_text(text)
print('converted')
