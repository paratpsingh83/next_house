-- ══════════════════════════════════════════════════════════════════════════════
-- V16__fix_notification_type_constraint.sql
-- Add FOLLOW_REQUEST and FOLLOW_REQUEST_ACCEPTED to the allowed notification types
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE notifications
    DROP CONSTRAINT IF EXISTS chk_notification_type;

ALTER TABLE notifications
    ADD CONSTRAINT chk_notification_type
        CHECK (notification_type IN (
            'LIKE', 'COMMENT', 'FOLLOW',
            'FOLLOW_REQUEST', 'FOLLOW_REQUEST_ACCEPTED',
            'ACTIVITY_JOIN_REQUEST', 'ACTIVITY_APPROVED', 'ACTIVITY_REJECTED',
            'COMMUNITY_JOIN_REQUEST', 'COMMUNITY_APPROVED',
            'SAFETY_ALERT', 'SYSTEM', 'MESSAGE'
        ));