-- Outpatient clinics and daily appointment queue
CREATE TABLE IF NOT EXISTS outpatient_clinics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  specialty TEXT,
  doctor_name TEXT NOT NULL,
  room TEXT,
  phone TEXT,
  daily_capacity INTEGER NOT NULL DEFAULT 30,
  appointment_duration INTEGER NOT NULL DEFAULT 15,
  is_open INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
);
CREATE TABLE IF NOT EXISTS outpatient_appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  patient_name TEXT NOT NULL,
  age TEXT,
  phone TEXT,
  national_id TEXT,
  appointment_date TEXT NOT NULL,
  appointment_time TEXT,
  queue_number INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'system',
  status TEXT NOT NULL DEFAULT 'waiting',
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
);
CREATE INDEX IF NOT EXISTS idx_outpatient_appointments_date_clinic ON outpatient_appointments (appointment_date, clinic_id);
