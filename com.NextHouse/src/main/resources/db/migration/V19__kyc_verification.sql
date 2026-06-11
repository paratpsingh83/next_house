-- ══════════════════════════════════════════════════════════════════════════════
-- V19__kyc_verification.sql
-- Add KYC columns extracted from Aadhaar XML / DigiLocker
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS kyc_name        VARCHAR(200),
    ADD COLUMN IF NOT EXISTS kyc_dob         VARCHAR(20),
    ADD COLUMN IF NOT EXISTS kyc_gender      VARCHAR(10),
    ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS digilocker_state VARCHAR(100);