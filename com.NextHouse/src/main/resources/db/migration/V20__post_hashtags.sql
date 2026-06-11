-- V20: Normalized post_hashtags table
-- Replaces the comma-string hashtag_string column for tag-based search
-- The hashtag_string column is kept for backward compat with mobile clients

CREATE TABLE IF NOT EXISTS post_hashtags (
    id         BIGSERIAL    PRIMARY KEY,
    post_id    BIGINT       NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    hashtag    VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag  ON post_hashtags (hashtag);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_post_id  ON post_hashtags (post_id);

-- Migrate existing comma-string data into the normalized table
INSERT INTO post_hashtags (post_id, hashtag)
SELECT p.id, LOWER(TRIM(tag.val)) AS hashtag
FROM posts p
CROSS JOIN LATERAL unnest(string_to_array(p.hashtag_string, ',')) AS tag(val)
WHERE p.hashtag_string IS NOT NULL
  AND p.hashtag_string <> ''
  AND p.is_deleted = false
  AND TRIM(tag.val) <> ''
ON CONFLICT DO NOTHING;
