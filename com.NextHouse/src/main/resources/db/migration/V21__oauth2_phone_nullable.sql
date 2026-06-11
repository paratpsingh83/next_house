-- OAuth2 users have no phone number — make the column nullable
ALTER TABLE users ALTER COLUMN phone_number DROP NOT NULL;
