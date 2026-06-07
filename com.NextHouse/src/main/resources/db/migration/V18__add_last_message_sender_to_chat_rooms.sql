ALTER TABLE chat_rooms
    ADD COLUMN IF NOT EXISTS last_message_sender_id BIGINT;