# NextHouse — Neighbourhood Social Platform

A full-stack neighbourhood community platform. Residents connect, share posts, borrow items, buy/sell in the marketplace, organise local activities, form communities, and raise safety alerts — all scoped to their verified neighbourhood.

---

## Tech Stack

### Backend (`com.NextHouse/`)

| Layer | Technology |
|---|---|
| Language | Java 21 |
| Framework | Spring Boot 3.3.5 |
| Security | Spring Security + JWT (httpOnly cookies) |
| Database | PostgreSQL 16 + PostGIS 3 (spatial queries) |
| Connection Pool | PgBouncer (transaction mode — 400 app conns → 25 DB conns) |
| ORM | Hibernate / Spring Data JPA + Hibernate Spatial |
| Migrations | Flyway |
| Cache L1 | Redis 7 (Lettuce client — Spring @Cacheable) |
| Cache L2 | Hibernate JCache + Caffeine (entity-level) |
| Messaging | Apache Kafka |
| Real-time | WebSocket STOMP via RabbitMQ broker relay |
| File Storage | AWS S3 (AWS SDK v2) + CDN |
| Push Notifications | Firebase Admin SDK |
| Email | Spring Mail (AWS SES) |
| Image Processing | Thumbnailator |
| API Docs | SpringDoc OpenAPI / Swagger UI |
| Mapping | MapStruct |
| Metrics | Micrometer + Prometheus |
| Build | Maven |

### Frontend (`nexthouse-frontend-v3/`)

| Layer | Technology |
|---|---|
| Language | TypeScript |
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS v3 |
| State | Redux Toolkit + React Query (TanStack v5) |
| Forms | React Hook Form v7 + Zod |
| HTTP Client | Axios (`withCredentials: true` — httpOnly cookie auth) |
| WebSocket | `@stomp/stompjs` + SockJS |
| Icons | Lucide React |
| Toasts | React Hot Toast |
| Dates | date-fns |

---

## Features

| Feature | Status |
|---|---|
| Register / Login / OTP / 2FA / OAuth2 | ✅ |
| JWT via httpOnly cookies (XSS-safe) | ✅ |
| Stories (image / video / text, 24h expiry, auto-advance timer) | ✅ |
| Story replies → opens DM | ✅ |
| Feed (following / nearby / trending) | ✅ |
| Posts with reactions, comments, hashtags, media | ✅ |
| Post repost / share with optional caption | ✅ |
| Saved posts collections | ✅ |
| Community posts feed | ✅ |
| Seller marketplace (buy / sell / free) | ✅ |
| Seller ratings & reviews | ✅ |
| Borrow requests | ✅ |
| Local activities + join / approval flow | ✅ |
| Activity reminders (1 h before, scheduled job) | ✅ |
| Communities (public / private, roles) | ✅ |
| Safety alerts (emergency fanout via Kafka) | ✅ |
| Direct chat + group chat | ✅ |
| Chat image sending | ✅ |
| Real-time typing indicators + presence | ✅ |
| Notifications (push + in-app, per-type preferences) | ✅ |
| Follow / unfollow / follow requests (private accounts) | ✅ |
| Block / unblock users | ✅ |
| Address & identity verification (DigiLocker) | ✅ |
| Neighbourhood detection (PostGIS) | ✅ |
| Nearby search (users, posts, activities, marketplace) | ✅ |
| Admin panel (users, moderation, reports) | ✅ |
| Global search (multi-entity, autocomplete, history) | ✅ |
| Recommendations (posts, activities, communities, users) | ✅ |

---

## Prerequisites

| Requirement | Version |
|---|---|
| Java | 21+ |
| Maven | 3.9+ |
| Node.js | 18+ |
| Docker + Docker Compose | 24+ |
| PostgreSQL | 16+ with PostGIS (or use Docker) |
| Redis | 7+ (or use Docker) |

---

## Quick Start (Docker Compose)

The easiest way to run the full stack locally:

```bash
# 1. Copy and fill env file
cp com.NextHouse/docker/.env.example com.NextHouse/docker/.env
# Edit .env — fill JWT_SECRET, AWS credentials, etc.

# 2. Start all infrastructure + API
cd com.NextHouse/docker
docker-compose up -d

# 3. Start frontend
cd ../../nexthouse-frontend-v3
npm install
npm run dev
```

Services started by Docker Compose:

| Service | Port | Description |
|---|---|---|
| nexthouse-api | 8080 | Spring Boot REST + WebSocket |
| postgres | 5432 | PostgreSQL 16 + PostGIS |
| pgbouncer | 5433 | Connection pooler (app connects via 5432 internally) |
| redis | 6379 | Cache + sessions |
| kafka | 9092 | Event streaming |
| rabbitmq | 15672 | Management UI (STOMP on 61613) |

Swagger UI: **http://localhost:8080/swagger-ui.html**  
Frontend: **http://localhost:3000**

---

## Manual Setup (IDE / no Docker)

### 1. Database

```sql
CREATE USER nexthouse WITH PASSWORD 'changeme';
CREATE DATABASE nexthouse_db OWNER nexthouse;
\c nexthouse_db
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 2. Backend

```bash
cd com.NextHouse

# Dev profile: Firebase disabled, rate-limiting off, SQL logging on
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Backend starts on **http://localhost:8080**

### 3. Frontend

```bash
cd nexthouse-frontend-v3
npm install
npm run dev
```

Create `nexthouse-frontend-v3/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=http://localhost:8080
```

Frontend starts on **http://localhost:3000**

---

## Spring Profiles

| Profile | Purpose |
|---|---|
| *(default)* | Production — all env vars required, Firebase active, rate-limiting on |
| `dev` | Local — Firebase disabled, rate-limiting off, SQL logging on, COOKIE_SECURE=false |
| `test` | JUnit — Kafka listeners off, Flyway clean enabled |

---

## Environment Variables (Backend)

| Variable | Default | Description |
|---|---|---|
| `DB_HOST` | `localhost` | PostgreSQL / PgBouncer host |
| `DB_PORT` | `5432` | Port |
| `DB_NAME` | `nexthouse_db` | Database name |
| `DB_USERNAME` | `nexthouse` | DB user |
| `DB_PASSWORD` | `changeme` | DB password |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | *(empty)* | Redis password |
| `KAFKA_BROKERS` | `localhost:9092` | Kafka bootstrap servers |
| `RABBITMQ_HOST` | — | RabbitMQ host (STOMP relay) |
| `RABBITMQ_STOMP_PORT` | `61613` | STOMP port |
| `RABBITMQ_USER` | `guest` | RabbitMQ user |
| `RABBITMQ_PASS` | `guest` | RabbitMQ password |
| `JWT_SECRET` | dev key | **Must change in production** (min 256-bit base64) |
| `COOKIE_SECURE` | `true` | Set `false` for local HTTP dev |
| `SERVER_PORT` | `8080` | HTTP port |
| `AWS_ACCESS_KEY_ID` | — | AWS credentials for S3 |
| `AWS_SECRET_ACCESS_KEY` | — | AWS credentials for S3 |
| `AWS_REGION` | `ap-southeast-1` | AWS region |
| `S3_BUCKET` | `nexthouse-media` | S3 bucket |
| `CDN_BASE_URL` | `https://cdn.nexthouse.app` | CDN prefix |
| `FIREBASE_CREDENTIALS_FILE` | `classpath:firebase-service-account.json` | Set to `disabled` locally |
| `FIREBASE_PROJECT_ID` | — | Firebase project ID |
| `SES_USERNAME` | — | AWS SES SMTP username |
| `SES_PASSWORD` | — | AWS SES SMTP password |
| `DIGILOCKER_CLIENT_ID` | — | DigiLocker OAuth client ID |
| `DIGILOCKER_CLIENT_SECRET` | — | DigiLocker OAuth secret |

---

## API Reference

Base path: `/api/v1`

Auth: JWT delivered as `nh_access` httpOnly cookie (set automatically on login). Mobile clients can also use `Authorization: Bearer <token>` header.

### Authentication — `/auth`

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register (optional GPS + FCM token) |
| POST | `/auth/login` | Login — sets `nh_access` + `nh_refresh` cookies |
| POST | `/auth/logout` | Logout — clears cookies |
| POST | `/auth/logout-all` | Logout all devices |
| POST | `/auth/refresh-token` | Rotate tokens — reads `nh_refresh` cookie |
| POST | `/auth/otp/request` | Request OTP |
| POST | `/auth/otp/verify` | Verify OTP |
| POST | `/auth/password/forgot` | Trigger password reset |
| POST | `/auth/password/reset` | Reset password with OTP token |
| POST | `/auth/password/change` | Change password — revokes all sessions |
| POST | `/auth/oauth2` | Social login (Google / Facebook / Apple) |
| POST | `/auth/2fa/enable` | Enable 2FA |
| POST | `/auth/2fa/disable` | Disable 2FA |
| POST | `/auth/2fa/verify` | Complete 2FA login |

### Users — `/users`

| Method | Path | Description |
|---|---|---|
| GET | `/users/me` | My profile |
| PUT | `/users/me` | Update profile |
| PATCH | `/users/me/location` | Update GPS |
| DELETE | `/users/me` | Soft-delete account |
| GET | `/users/{userId}` | Public profile (1 optimised query) |
| GET | `/users/nearby` | Nearby verified neighbours |
| GET | `/users/suggestions` | Friend-of-friends suggestions |
| GET | `/users/search` | Search by name / username |
| POST | `/users/{userId}/follow` | Follow user |
| DELETE | `/users/{userId}/follow` | Unfollow user |
| GET | `/users/{userId}/followers` | Followers list |
| GET | `/users/{userId}/following` | Following list |
| POST | `/users/{userId}/block` | Block user |
| DELETE | `/users/{userId}/block` | Unblock user |
| GET | `/users/me/blocked` | My blocked users list |
| GET | `/users/me/follow-requests` | Incoming follow requests |
| POST | `/users/me/follow-requests/{requestId}/accept` | Accept follow request |
| DELETE | `/users/me/follow-requests/{requestId}` | Reject follow request |

### Posts — `/posts`

| Method | Path | Description |
|---|---|---|
| POST | `/posts` | Create post |
| GET | `/posts/{postId}` | Post detail |
| PUT | `/posts/{postId}` | Update post |
| DELETE | `/posts/{postId}` | Delete post |
| POST | `/posts/{postId}/repost` | Repost to feed (optional caption) |
| POST | `/posts/{postId}/report` | Report post |
| GET | `/posts/feed/following` | Following feed |
| GET | `/posts/feed/nearby` | Nearby feed (GPS radius) |
| GET | `/posts/feed/trending` | Trending feed |
| GET | `/posts/feed/community/{communityId}` | Community feed |
| GET | `/posts/user/{userId}` | User's posts |
| GET | `/posts/hashtag/{hashtag}` | Posts by hashtag (indexed) |
| POST | `/posts/{postId}/react` | React (LIKE / HEART / HELPFUL / CELEBRATE / CURIOUS) |
| DELETE | `/posts/{postId}/react` | Remove reaction |
| POST | `/posts/{postId}/save` | Save post |
| DELETE | `/posts/{postId}/save` | Unsave post |
| GET | `/posts/saved` | Saved posts |
| POST | `/posts/{postId}/share` | Record share |
| GET | `/posts/{postId}/comments` | Comments |
| POST | `/posts/{postId}/comments` | Add comment |
| GET | `/posts/comments/{commentId}/replies` | Replies |
| PUT | `/posts/comments/{commentId}` | Update comment |
| DELETE | `/posts/comments/{commentId}` | Delete comment |
| POST | `/posts/comments/{commentId}/like` | Like comment |

### Stories — `/stories`

| Method | Path | Description |
|---|---|---|
| POST | `/stories` | Create story (IMAGE / VIDEO / TEXT) |
| GET | `/stories/feed` | Stories feed (own + following) |
| GET | `/stories/user/{userId}` | Stories by user |
| DELETE | `/stories/{storyId}` | Delete story |
| POST | `/stories/{storyId}/view` | Record view |

### Activities — `/activities`

| Method | Path | Description |
|---|---|---|
| POST | `/activities` | Create activity |
| GET | `/activities/{activityId}` | Activity detail |
| PUT | `/activities/{activityId}` | Update (host only) |
| DELETE | `/activities/{activityId}` | Cancel (host only) |
| GET | `/activities/nearby` | Nearby activities |
| GET | `/activities/community/{communityId}` | Community activities |
| GET | `/activities/my/hosting` | Activities I host |
| GET | `/activities/my/joined` | Activities I joined |
| POST | `/activities/{activityId}/join` | Join |
| DELETE | `/activities/{activityId}/join` | Leave |
| GET | `/activities/{activityId}/members` | Members list |
| POST | `/activities/{activityId}/members/{memberId}/approve` | Approve join request |
| POST | `/activities/{activityId}/members/{memberId}/reject` | Reject join request |

Activity types: `SOCIAL` `SPORTS` `LEARNING` `VOLUNTEERING` `FOOD` `ARTS` `OUTDOOR` `NEIGHBORHOOD_WATCH` `OTHER`

### Communities — `/communities`

| Method | Path | Description |
|---|---|---|
| POST | `/communities` | Create community |
| GET | `/communities/{communityId}` | Community detail |
| PUT | `/communities/{communityId}` | Update (ADMIN+) |
| DELETE | `/communities/{communityId}` | Delete (OWNER) |
| GET | `/communities/nearby` | Nearby communities |
| GET | `/communities/my` | My communities |
| GET | `/communities/search` | Search |
| POST | `/communities/{communityId}/join` | Join |
| DELETE | `/communities/{communityId}/join` | Leave |
| GET | `/communities/{communityId}/members` | Members |
| POST | `/communities/{communityId}/members/{memberId}/approve` | Approve member |
| DELETE | `/communities/{communityId}/members/{memberId}` | Kick member |
| PATCH | `/communities/{communityId}/members/{memberId}/role` | Change role |

Member roles: `OWNER` `ADMIN` `MODERATOR` `MEMBER`

### Chat — `/chat`

| Method | Path | Description |
|---|---|---|
| GET | `/chat/inbox` | Inbox (sorted by last message) |
| GET | `/chat/unread-count` | Total unread count |
| POST | `/chat/direct/{otherUserId}` | Get or create DM room |
| POST | `/chat/group` | Create group chat |
| GET | `/chat/rooms/{roomId}` | Room details + members |
| POST | `/chat/rooms/{roomId}/members/{userId}` | Add member |
| DELETE | `/chat/rooms/{roomId}/members/{userId}` | Remove member |
| PATCH | `/chat/rooms/{roomId}/mute` | Mute / unmute |
| GET | `/chat/rooms/{roomId}/messages` | Chat history |
| DELETE | `/chat/rooms/{roomId}/messages/{messageId}` | Delete message |
| POST | `/chat/rooms/{roomId}/read` | Mark as read |

Message types: `TEXT` `IMAGE`

### Notifications — `/notifications`

| Method | Path | Description |
|---|---|---|
| GET | `/notifications` | Paginated notifications |
| GET | `/notifications/unread-count` | Unread count |
| POST | `/notifications/{id}/read` | Mark single read |
| POST | `/notifications/read-all` | Mark all read |
| DELETE | `/notifications/{id}` | Delete |
| GET | `/notifications/preferences` | Get preferences |
| PUT | `/notifications/preferences` | Update preferences |

### Marketplace — `/marketplace`

| Method | Path | Description |
|---|---|---|
| POST | `/marketplace` | Create listing |
| GET | `/marketplace/{itemId}` | Listing detail |
| PUT | `/marketplace/{itemId}` | Update (seller only) |
| DELETE | `/marketplace/{itemId}` | Delete |
| PATCH | `/marketplace/{itemId}/sold` | Mark sold |
| GET | `/marketplace/nearby` | Browse nearby |
| GET | `/marketplace/my` | My listings |
| GET | `/marketplace/search` | Search |
| POST | `/marketplace/items/{itemId}/reviews` | Leave seller review |
| GET | `/marketplace/sellers/{sellerId}/reviews` | Seller reviews |
| GET | `/marketplace/sellers/{sellerId}/rating` | Rating summary |
| DELETE | `/marketplace/reviews/{reviewId}` | Delete review |

### Safety Alerts — `/safety-alerts`

| Method | Path | Description |
|---|---|---|
| POST | `/safety-alerts` | Create alert |
| GET | `/safety-alerts/{alertId}` | Alert detail |
| GET | `/safety-alerts/neighborhood/{neighborhoodId}` | Active alerts in area |
| GET | `/safety-alerts/nearby` | Active alerts by GPS |
| POST | `/safety-alerts/{alertId}/resolve` | Resolve alert |
| POST | `/safety-alerts/{alertId}/verify` | Verify alert |
| POST | `/safety-alerts/{alertId}/report` | Report false alert |

Severity: `LOW` `MEDIUM` `HIGH` `CRITICAL`

### Borrow Requests — `/borrow-requests`

| Method | Path | Description |
|---|---|---|
| POST | `/borrow-requests` | Post a request |
| GET | `/borrow-requests/{requestId}` | Request detail |
| GET | `/borrow-requests/neighborhood/{neighborhoodId}` | Browse by area |
| GET | `/borrow-requests/my` | My requests |
| POST | `/borrow-requests/{requestId}/respond` | Volunteer to fulfil |
| POST | `/borrow-requests/{requestId}/close` | Close as fulfilled |
| DELETE | `/borrow-requests/{requestId}` | Cancel |

### Search — `/search`

| Method | Path | Description |
|---|---|---|
| GET | `/search` | Global multi-entity search |
| GET | `/search/suggest` | Autocomplete |
| GET | `/search/trending` | Top 20 trending keywords |
| GET | `/search/history` | My search history |
| DELETE | `/search/history` | Clear history |
| GET | `/search/users` | Users only |
| GET | `/search/posts` | Posts only |
| GET | `/search/activities` | Activities only |
| GET | `/search/communities` | Communities only |
| GET | `/search/marketplace` | Marketplace only |

### Media — `/media`

| Method | Path | Description |
|---|---|---|
| POST | `/media/upload` | Upload image / video / PDF |
| GET | `/media/entity/{entityType}/{entityId}` | Media for entity |
| DELETE | `/media/{mediaId}` | Delete (uploader only) |

Max upload: **50 MB** per file.

### Admin — `/admin` *(ROLE_ADMIN)*

| Method | Path | Description |
|---|---|---|
| GET | `/admin/dashboard` | Stats + moderation queue |
| GET | `/admin/users` | All users |
| POST | `/admin/users/{userId}/ban` | Ban user |
| POST | `/admin/users/{userId}/unban` | Unban user |
| DELETE | `/admin/users/{userId}` | Force-delete |
| GET | `/admin/moderation` | Moderation queue |
| POST | `/admin/moderation/{queueId}/approve` | Approve content |
| POST | `/admin/moderation/{queueId}/block` | Block content |
| GET | `/admin/reports` | User reports |
| POST | `/admin/reports/{reportId}/review` | Review report |

---

## WebSocket (STOMP)

Connect to: `ws://localhost:8080/ws`  
Broker relay: RabbitMQ (supports multi-pod horizontal scaling)

| Direction | Destination | Description |
|---|---|---|
| PUBLISH | `/app/chat/rooms/{roomId}/send` | Send chat message (TEXT or IMAGE) |
| SUBSCRIBE | `/topic/rooms/{roomId}/messages` | Receive messages |
| PUBLISH | `/app/chat/rooms/{roomId}/typing` | Send typing indicator |
| SUBSCRIBE | `/topic/rooms/{roomId}/typing` | Receive typing indicators |
| PUBLISH | `/app/presence/heartbeat` | Refresh online status |
| PUBLISH | `/app/chat/rooms/{roomId}/read` | Mark room read |
| SUBSCRIBE | `/user/queue/notifications` | Personal notifications |
| SUBSCRIBE | `/user/queue/presence` | Presence events (online/offline) |

---

## Frontend Pages

| Route | Description |
|---|---|
| `/login` | Login |
| `/register` | Sign up |
| `/forgot-password` | Password reset |
| `/feed` | Home feed (following / nearby / trending tabs) + stories row |
| `/posts/[postId]` | Post detail + comments |
| `/profile/[userId]` | Profile — posts / followers / following tabs |
| `/discover` | Discover people, activities, communities |
| `/search` | Global search |
| `/hashtag/[tag]` | Posts by hashtag |
| `/neighbours` | Nearby neighbours map |
| `/neighbourhood` | My neighbourhood info |
| `/communities` | Browse communities |
| `/communities/[id]` | Community detail + feed |
| `/communities/create` | Create community |
| `/activities` | Nearby activities |
| `/activities/[id]` | Activity detail + members |
| `/activities/create` | Create activity |
| `/marketplace` | Marketplace listings |
| `/marketplace/[id]` | Listing detail + seller reviews |
| `/marketplace/[id]/edit` | Edit listing |
| `/marketplace/create` | Create listing |
| `/marketplace/sellers/[sellerId]/reviews` | All seller reviews |
| `/borrow` | Borrow requests |
| `/borrow/create` | Post borrow request |
| `/safety` | Safety alerts |
| `/safety/create` | Raise safety alert |
| `/chat` | Chat inbox |
| `/chat/[roomId]` | Chat room (text + image) |
| `/chat/new-group` | Create group chat |
| `/notifications` | Notifications |
| `/my/saved` | Saved posts |
| `/my/activities` | My activities |
| `/my/listings` | My marketplace listings |
| `/settings` | Settings hub |
| `/settings/profile` | Edit profile |
| `/settings/password` | Change password |
| `/settings/privacy` | Privacy settings |
| `/settings/notifications` | Notification preferences |
| `/settings/blocked` | Blocked users |
| `/settings/verification` | Address & identity verification |
| `/settings/follow-requests` | Incoming follow requests |
| `/admin` | Admin dashboard |
| `/admin/users` | User management |
| `/admin/moderation` | Content moderation |
| `/admin/reports` | Reports queue |

---

## Project Structure

```
com.NextHouse/                      # Spring Boot backend
├── docker/
│   ├── docker-compose.yml          # Full local dev stack
│   ├── pgbouncer/
│   │   ├── pgbouncer.ini           # Connection pool config
│   │   └── userlist.txt            # Dev auth (plain text — Docker only)
│   └── Dockerfile
├── k8s/base/                       # Kubernetes manifests
│   ├── 01-namespace-configmap.yaml
│   ├── 02-secrets-template.yaml
│   ├── 03-api-deployment.yaml
│   ├── 05-hpa-pdb.yaml             # HPA: 2–20 pods, PDB
│   ├── 06-postgres-statefulset.yaml
│   ├── 07-redis-statefulset.yaml
│   ├── 09-kafka-statefulset.yaml
│   ├── 10-rabbitmq-statefulset.yaml
│   ├── 11-pgbouncer-deployment.yaml
│   └── kustomization.yaml
└── src/main/java/com/NextHouse/
    ├── controller/                 # REST controllers
    ├── service/ + serviceImpl/     # Business logic
    ├── entity/                     # JPA entities
    ├── dto/request/ + response/    # DTOs
    ├── repository/                 # Spring Data JPA
    ├── config/                     # Security, WebSocket, Redis, Kafka, L2 cache
    ├── security/                   # JWT filter, cookie util
    ├── scheduler/                  # Scheduled jobs (activity reminders, trending)
    ├── event/                      # Kafka events
    └── mapper/                     # MapStruct mappers

nexthouse-frontend-v3/              # Next.js 14 frontend
└── src/
    ├── app/
    │   ├── (auth)/                 # Login / Register / Forgot password
    │   └── (app)/                  # Authenticated app (all pages above)
    ├── api/index.ts                # Typed API wrappers (one per backend module)
    ├── components/
    │   ├── post/PostCard.tsx       # Feed card (reactions, repost, share)
    │   ├── stories/StoriesRow.tsx  # Story viewer (auto-advance, reply)
    │   ├── chat/                   # ChatInput (image), MessageBubble
    │   └── common/                 # WSProvider, AuthProvider, Providers
    ├── lib/
    │   ├── apiClient.ts            # Axios (withCredentials, token refresh)
    │   └── ws.ts                   # STOMP WebSocket singleton
    └── types/index.ts              # TypeScript interfaces ↔ backend DTOs
```

---

## Authentication Flow

Tokens are stored in **httpOnly cookies** (not localStorage) — immune to XSS attacks.

```
Login → POST /auth/login
      → Server sets nh_access cookie  (httpOnly, Strict, 15 min)
      → Server sets nh_refresh cookie (httpOnly, Strict, 30 days, path=/auth/refresh-token)
      → Browser sends cookies automatically on every request

401 response
      → Axios interceptor fires
      → POST /auth/refresh-token  ← nh_refresh cookie sent automatically
      → New nh_access cookie set by server
      → Original request retried

WebSocket connection
      → STOMP CONNECT frame with Authorization: Bearer <ws-token>
      → ws-token fetched from /auth/refresh-token response on connect
```

---

## Pagination

All list endpoints support:

| Param | Default | Description |
|---|---|---|
| `page` | `0` | Zero-based page number |
| `size` | `20` | Items per page |

Response envelope:
```json
{
  "content": [],
  "page": 0,
  "size": 20,
  "totalElements": 150,
  "totalPages": 8,
  "first": true,
  "last": false,
  "hasNext": true,
  "hasPrevious": false
}
```

---

## Capacity

| Scenario | Concurrent Users | RPS |
|---|---|---|
| Docker Compose (1 pod) | ~200–500 | ~100–500 |
| K8s 2 pods (minimum) | ~2,000–5,000 | ~500–1,000 |
| K8s 20 pods (HPA max) | ~50,000–100,000 | ~10,000–20,000 |

Key optimisations in place:
- **PgBouncer** — 400 app connections → 25 PostgreSQL connections
- **1-query profile** — follower count, online status, follow state fetched in one SQL
- **Hibernate L2 cache** — User / Community / Neighborhood entities cached in-process (Caffeine)
- **Redis L1 cache** — profiles, trending feed, community pages cached with TTL
- **Indexed hashtags** — `post_hashtags` table with index (no full-table LIKE scans)
- **HPA** — scales 2→20 pods on CPU >70% or memory >80%

---

## Production Deployment (Kubernetes)

```bash
# 1. Fill secrets (never committed)
cp k8s/base/02-secrets-template.yaml k8s/base/02-secrets.yaml
# Edit 02-secrets.yaml with base64-encoded values

# 2. Create PgBouncer userlist secret
kubectl create secret generic pgbouncer-userlist \
  --from-literal=userlist.txt='"nexthouse" "<SCRAM-SHA-256-hash>"' \
  -n nexthouse

# 3. Apply manifests
kubectl apply -k k8s/base/

# 4. Verify
kubectl get pods -n nexthouse
kubectl logs -n nexthouse deployment/nexthouse-api
```

Generate SCRAM hash:
```sql
-- Run as superuser in PostgreSQL
SELECT passwd FROM pg_shadow WHERE usename = 'nexthouse';
```
