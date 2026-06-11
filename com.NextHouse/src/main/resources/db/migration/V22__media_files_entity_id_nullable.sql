-- media_files.entity_id was NOT NULL but MediaServiceImpl allows null uploads
-- (media is uploaded before the entity exists, then linked via attachMediaToEntity).
-- This migration drops the NOT NULL constraint to match the intended design.
ALTER TABLE media_files ALTER COLUMN entity_id DROP NOT NULL;
