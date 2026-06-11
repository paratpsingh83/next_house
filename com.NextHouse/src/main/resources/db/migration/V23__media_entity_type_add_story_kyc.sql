-- Add STORY, KYC_DOCUMENT, KYC_SELFIE to the media_files entity_type allowlist.
-- Stories were added in V15; KYC types added when selfie+ID verification was introduced.
ALTER TABLE media_files DROP CONSTRAINT chk_media_entity_type;

ALTER TABLE media_files
    ADD CONSTRAINT chk_media_entity_type
    CHECK (entity_type IN (
        'POST', 'CHAT', 'ACTIVITY', 'MARKETPLACE',
        'COMMUNITY', 'USER', 'BORROW_REQUEST',
        'STORY', 'KYC_DOCUMENT', 'KYC_SELFIE'
    ));
