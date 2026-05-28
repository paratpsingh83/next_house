-- ══════════════════════════════════════════════════════════════════════════════
-- V12__seed_data.sql
-- Initial seed data for development and staging environments.
-- Production: use a separate migration or a dedicated seeding tool.
--
-- Seed data includes:
--   1. Admin + system users
--   2. Sample neighborhoods (Kuala Lumpur area)
--   3. Sample communities
--   4. Sample community memberships
-- ══════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════
-- 1. USERS
-- ════════════════════════════════════════════════════════════════════════

-- System user (sender for system notifications, anonymous posts moderator)
-- password: SYSTEM_ACCOUNT_NO_LOGIN (can never log in — no valid password hash)
INSERT INTO users (
    name, username, phone_number, email, password,
    role, verification_status, account_status,
    trust_score, address_verified, identity_verified,
    banned, two_factor_enabled
) VALUES (
    'NexHouse System', 'nexthouse_system', '+60000000000', 'system@nexthouse.app', NULL,
    'ADMIN', 'VERIFIED', 'ACTIVE',
    100, TRUE, TRUE,
    FALSE, FALSE
) ON CONFLICT (username) DO NOTHING;

-- Admin user (password: Admin@NexHouse2025 — BCrypt hash with strength 12)
INSERT INTO users (
    name, username, phone_number, email, password,
    role, verification_status, account_status,
    trust_score, address_verified, identity_verified,
    banned, two_factor_enabled
) VALUES (
    'NexHouse Admin', 'nexthouse_admin', '+60100000001', 'admin@nexthouse.app',
    '$2a$12$tVqw5G6u.AJpLtbNV8N5bOJVIlRNOmM6PxE2YwEbWc.oXjqFSZ9S2',
    'ADMIN', 'VERIFIED', 'ACTIVE',
    100, TRUE, TRUE,
    FALSE, TRUE
) ON CONFLICT (username) DO NOTHING;

-- Moderator user (password: Mod@NexHouse2025)
INSERT INTO users (
    name, username, phone_number, email, password,
    role, verification_status, account_status,
    trust_score, address_verified, identity_verified,
    banned, two_factor_enabled
) VALUES (
    'NexHouse Moderator', 'nexthouse_mod', '+60100000002', 'mod@nexthouse.app',
    '$2a$12$tVqw5G6u.AJpLtbNV8N5bOJVIlRNOmM6PxE2YwEbWc.oXjqFSZ9S2',
    'MODERATOR', 'VERIFIED', 'ACTIVE',
    80, TRUE, FALSE,
    FALSE, FALSE
) ON CONFLICT (username) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════
-- 2. NEIGHBORHOODS (Kuala Lumpur, Malaysia)
-- ════════════════════════════════════════════════════════════════════════

INSERT INTO neighborhoods (
    name, postal_code, district, region, city, state, country,
    latitude, longitude, radius_meters, verified, population
) VALUES
    ('Taman Desa',        '58100', 'Kuala Lumpur', 'Central',   'Kuala Lumpur', 'WP Kuala Lumpur', 'Malaysia',  3.0940,  101.6719, 3000, TRUE, 45000),
    ('Mont Kiara',        '50480', 'Kuala Lumpur', 'North',     'Kuala Lumpur', 'WP Kuala Lumpur', 'Malaysia',  3.1709,  101.6558, 2500, TRUE, 30000),
    ('Bangsar',           '59000', 'Kuala Lumpur', 'South',     'Kuala Lumpur', 'WP Kuala Lumpur', 'Malaysia',  3.1292,  101.6709, 2500, TRUE, 55000),
    ('KLCC',              '50450', 'Kuala Lumpur', 'City Centre','Kuala Lumpur', 'WP Kuala Lumpur', 'Malaysia',  3.1579,  101.7113, 2000, TRUE, 15000),
    ('Petaling Jaya SS2', '47500', 'Petaling Jaya','Central',   'Petaling Jaya','Selangor',        'Malaysia',  3.1185,  101.6241, 2000, TRUE, 60000),
    ('Damansara Utama',   '47400', 'Petaling Jaya','North',     'Petaling Jaya','Selangor',        'Malaysia',  3.1476,  101.6195, 2500, TRUE, 40000),
    ('Cheras',            '56000', 'Kuala Lumpur', 'Southeast', 'Kuala Lumpur', 'WP Kuala Lumpur', 'Malaysia',  3.0929,  101.7385, 3500, TRUE, 90000),
    ('Sri Hartamas',      '50480', 'Kuala Lumpur', 'North',     'Kuala Lumpur', 'WP Kuala Lumpur', 'Malaysia',  3.1654,  101.6571, 2000, TRUE, 25000)
ON CONFLICT DO NOTHING;

-- Update location geography from lat/lon (trigger handles this but being explicit for seed)
UPDATE neighborhoods SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE location IS NULL AND latitude IS NOT NULL;

-- Create user presence records for seed users
INSERT INTO user_presence (user_id, online, last_seen)
SELECT id, FALSE, NOW()
FROM users
WHERE username IN ('nexthouse_system', 'nexthouse_admin', 'nexthouse_mod')
ON CONFLICT (user_id) DO NOTHING;

-- Assign admin to Taman Desa neighborhood
INSERT INTO user_neighborhoods (user_id, neighborhood_id, primary_neighborhood, verified, verification_method, verified_at)
SELECT
    (SELECT id FROM users WHERE username = 'nexthouse_admin'),
    (SELECT id FROM neighborhoods WHERE name = 'Taman Desa'),
    TRUE, TRUE, 'ADMIN_OVERRIDE', NOW()
ON CONFLICT (user_id, neighborhood_id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════
-- 3. SAMPLE COMMUNITIES
-- ════════════════════════════════════════════════════════════════════════

INSERT INTO communities (
    name, description, community_type,
    private_community, verified,
    neighborhood_id,
    created_by,
    latitude, longitude, city, state, country
)
SELECT
    c.name, c.description, c.community_type,
    c.private_community, c.verified,
    (SELECT id FROM neighborhoods WHERE name = c.neighborhood_name),
    (SELECT id FROM users WHERE username = 'nexthouse_admin'),
    n.latitude, n.longitude, n.city, n.state, n.country
FROM (VALUES
    ('Taman Desa Residents',    'Official community for Taman Desa residents. Share news, safety alerts, and neighbourhood updates.', 'GENERAL',    FALSE, TRUE, 'Taman Desa'),
    ('Mont Kiara Expats',       'Community for international residents and expats living in Mont Kiara and Sri Hartamas.',             'SOCIAL',     FALSE, TRUE, 'Mont Kiara'),
    ('Bangsar Parents Circle',  'A supportive space for parents in Bangsar — school runs, playdates, parenting tips.',                'GENERAL',    FALSE, TRUE, 'Bangsar'),
    ('KL Urban Gardeners',      'Community gardening, composting, vertical gardens, and sustainable living in KL.',                  'EDUCATION',  FALSE, TRUE, 'KLCC'),
    ('PJ Sports & Fitness',     'Running groups, futsal, gym buddies and outdoor sports in Petaling Jaya.',                          'SPORTS',     FALSE, TRUE, 'Petaling Jaya SS2'),
    ('Damansara Marketplace',   'Buy, sell and give away items within Damansara neighbourhoods.',                                    'MARKETPLACE',FALSE, TRUE, 'Damansara Utama'),
    ('Cheras Neighbourhood Watch', 'Safety-first community for Cheras residents. Report suspicious activity, share alerts.',        'SAFETY',     FALSE, TRUE, 'Cheras'),
    ('KL Foodies',              'Food recommendations, restaurant reviews, and food events across Kuala Lumpur.',                    'CULTURE',    FALSE, TRUE, 'KLCC')
) AS c(name, description, community_type, private_community, verified, neighborhood_name)
JOIN neighborhoods n ON n.name = c.neighborhood_name
ON CONFLICT DO NOTHING;

-- Make admin the OWNER of all seed communities
INSERT INTO community_members (community_id, user_id, role, approved)
SELECT c.id,
       (SELECT id FROM users WHERE username = 'nexthouse_admin'),
       'OWNER', TRUE
FROM communities c
ON CONFLICT (community_id, user_id) DO NOTHING;

-- Update location geography for communities
UPDATE communities SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE location IS NULL AND latitude IS NOT NULL;

-- ════════════════════════════════════════════════════════════════════════
-- 4. VERIFICATION SUMMARY
-- ════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    user_count         INTEGER;
    neighborhood_count INTEGER;
    community_count    INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count         FROM users         WHERE is_deleted = FALSE;
    SELECT COUNT(*) INTO neighborhood_count FROM neighborhoods  WHERE is_deleted = FALSE;
    SELECT COUNT(*) INTO community_count    FROM communities    WHERE is_deleted = FALSE;

    RAISE NOTICE '════════════════════════════════════════';
    RAISE NOTICE 'NexHouse Seed Data Complete';
    RAISE NOTICE '  Users:         %', user_count;
    RAISE NOTICE '  Neighborhoods: %', neighborhood_count;
    RAISE NOTICE '  Communities:   %', community_count;
    RAISE NOTICE '════════════════════════════════════════';
END;
$$;
