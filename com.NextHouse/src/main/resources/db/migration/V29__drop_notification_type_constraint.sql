-- Remove the exhaustive CHECK constraint on notification_type.
-- The app layer controls what types are written; the DB constraint was
-- out of date and blocked BORROW_RESPONSE, ACTIVITY_REMINDER, and others.
ALTER TABLE notifications
    DROP CONSTRAINT IF EXISTS chk_notification_type;
