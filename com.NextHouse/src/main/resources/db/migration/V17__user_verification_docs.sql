-- ══════════════════════════════════════════════════════════════════════════════
-- V17__user_verification_docs.sql
-- Add document type and media reference columns for address & identity verification
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS identity_doc_type   VARCHAR(50),
    ADD COLUMN IF NOT EXISTS identity_doc_media_id BIGINT
        CONSTRAINT fk_user_identity_doc REFERENCES media_files(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS address_doc_type    VARCHAR(50),
    ADD COLUMN IF NOT EXISTS address_doc_media_id  BIGINT
        CONSTRAINT fk_user_address_doc REFERENCES media_files(id) ON DELETE SET NULL;

ALTER TABLE users
    ADD CONSTRAINT chk_identity_doc_type
        CHECK (identity_doc_type IS NULL OR identity_doc_type IN (
            'AADHAAR', 'PASSPORT', 'DRIVING_LICENSE', 'NATIONAL_ID', 'VOTER_ID'
        )),
    ADD CONSTRAINT chk_address_doc_type
        CHECK (address_doc_type IS NULL OR address_doc_type IN (
            'UTILITY_BILL', 'RENTAL_AGREEMENT', 'BANK_STATEMENT',
            'GOVERNMENT_LETTER', 'PROPERTY_TAX'
        ));