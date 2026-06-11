ALTER TABLE posts ADD COLUMN original_post_id BIGINT REFERENCES posts(id) ON DELETE SET NULL;
CREATE INDEX idx_posts_original_post ON posts (original_post_id) WHERE original_post_id IS NOT NULL;
