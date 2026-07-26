-- ============================================================
-- Migration 002 — Add report_fields_json to departments
-- BSCH — نظام إدارة الحالات الطبية
-- Adds per-department configurable report field list
-- ============================================================

ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS report_fields_json TEXT NOT NULL DEFAULT '[]';
