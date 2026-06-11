CREATE TABLE seller_reviews (
    id           BIGSERIAL PRIMARY KEY,
    item_id      BIGINT      NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
    seller_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewer_id  BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating       SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment      TEXT,
    is_deleted   BOOLEAN     NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_review_item_reviewer UNIQUE (item_id, reviewer_id)
);

CREATE INDEX idx_seller_reviews_seller   ON seller_reviews (seller_id)  WHERE is_deleted = false;
CREATE INDEX idx_seller_reviews_item     ON seller_reviews (item_id)    WHERE is_deleted = false;
CREATE INDEX idx_seller_reviews_reviewer ON seller_reviews (reviewer_id) WHERE is_deleted = false;
