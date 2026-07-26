-- ============================================================
-- Migration 003 — Add medical report attachment to waiting_cases
-- BSCH — نظام إدارة الحالات الطبية
-- Adds medical report file storage to the waiting list
-- ============================================================

ALTER TABLE waiting_cases
  ADD COLUMN IF NOT EXISTS medical_report      TEXT,
  ADD COLUMN IF NOT EXISTS medical_report_name TEXT,
  ADD COLUMN IF NOT EXISTS medical_report_data TEXT;
