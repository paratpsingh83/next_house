-- ══════════════════════════════════════════════════════════════════════════════
-- V11__performance_indexes.sql
-- Additional composite, partial, and covering indexes for production query
-- patterns that span multiple tables or require specific sort orders.
-- ══════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════
-- FEED QUERY OPTIMISATION
-- ════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_post_feed_following
    ON posts (created_by, created_at DESC)
    WHERE is_deleted = FALSE AND status = 'PUBLISHED';

CREATE INDEX idx_post_feed_community
    ON posts (community_id, created_at DESC)
    WHERE is_deleted = FALSE AND status = 'PUBLISHED'
      AND community_id IS NOT NULL;

CREATE INDEX idx_post_feed_neighborhood
    ON posts (neighborhood_id, created_at DESC)
    WHERE is_deleted = FALSE AND status = 'PUBLISHED'
      AND neighborhood_id IS NOT NULL;

-- ════════════════════════════════════════════════════════════════════════
-- ACTIVITY DISCOVERY
-- ════════════════════════════════════════════════════════════════════════

-- FIX: Removed "AND activity_time > NOW()" from WHERE clause.
-- NOW() is not IMMUTABLE — PostgreSQL rejects it in partial index predicates.
-- The query planner filters by time at runtime using the activity_time column.
-- This index still helps enormously — it covers only non-deleted published activities.
CREATE INDEX idx_activity_upcoming
    ON activities (activity_time ASC)
    WHERE is_deleted = FALSE
      AND status IN ('PUBLISHED', 'FULL');

CREATE INDEX idx_activity_host_status
    ON activities (host_user_id, activity_time DESC)
    WHERE is_deleted = FALSE;

-- ════════════════════════════════════════════════════════════════════════
-- CHAT UNREAD COUNT
-- ════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_chat_msg_unread
    ON chat_messages (room_id, sender_id, created_at)
    WHERE is_deleted = FALSE;

-- ════════════════════════════════════════════════════════════════════════
-- NOTIFICATION BELL
-- ════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_notification_unread_count
    ON notifications (receiver_id, created_at DESC)
    WHERE is_read = FALSE AND is_deleted = FALSE;

-- ════════════════════════════════════════════════════════════════════════
-- FOLLOW GRAPH
-- ════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_follow_follower_active
    ON follows (follower_id, following_id)
    WHERE is_deleted = FALSE;

CREATE INDEX idx_follow_following_active
    ON follows (following_id)
    WHERE is_deleted = FALSE;

-- ════════════════════════════════════════════════════════════════════════
-- BLOCK LIST
-- ════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_blocked_by_user_active
    ON blocked_users (user_id, blocked_user_id)
    WHERE is_deleted = FALSE;

CREATE INDEX idx_blocked_blocker_active
    ON blocked_users (blocked_user_id, user_id)
    WHERE is_deleted = FALSE;

-- ════════════════════════════════════════════════════════════════════════
-- ACTIVITY MEMBERS — capacity check
-- ════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_activity_member_approved
    ON activity_members (activity_id)
    WHERE join_status = 'APPROVED' AND is_deleted = FALSE;

-- ════════════════════════════════════════════════════════════════════════
-- COMMUNITY MEMBER COUNT
-- ════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_community_member_count
    ON community_members (community_id)
    WHERE approved = TRUE AND is_deleted = FALSE;

-- ════════════════════════════════════════════════════════════════════════
-- MARKETPLACE GEO + FILTER
-- ════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_market_category_available
    ON marketplace_items (category, available, created_at DESC)
    WHERE is_deleted = FALSE AND status = 'ACTIVE';

-- ════════════════════════════════════════════════════════════════════════
-- REFRESH TOKEN CLEANUP
-- FIX: Removed "OR expiry_date < NOW()" — NOW() not allowed in partial index
-- ════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_refresh_token_cleanup
    ON refresh_tokens (expiry_date)
    WHERE revoked = TRUE;

-- ════════════════════════════════════════════════════════════════════════
-- OTP CLEANUP
-- FIX: Removed "OR expires_at < NOW()" — NOW() not allowed in partial index
-- ════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_otp_cleanup
    ON otp_verifications (expires_at)
    WHERE verified = TRUE;

-- ════════════════════════════════════════════════════════════════════════
-- FULL-TEXT SEARCH (pg_trgm GIN indexes)
-- ════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_post_content_trgm
    ON posts USING GIN (content gin_trgm_ops)
    WHERE is_deleted = FALSE;

CREATE INDEX idx_activity_title_trgm
    ON activities USING GIN (title gin_trgm_ops)
    WHERE is_deleted = FALSE;

CREATE INDEX idx_market_desc_trgm
    ON marketplace_items USING GIN (description gin_trgm_ops)
    WHERE is_deleted = FALSE;
