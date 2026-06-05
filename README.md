# NextHouse — Neighbourhood Social Platform

A full-stack neighbourhood community app. Residents connect, share posts, borrow items, buy/sell in the marketplace, organise local activities, form communities, and raise safety alerts — all scoped to their verified neighbourhood.

---

## Tech Stack

### Backend (`com.NextHouse/`)

| Layer | Technology |
|---|---|
| Language | Java 21 |
| Framework | Spring Boot 3.3.5 |
| Security | Spring Security + JWT (jjwt 0.12.6) |
| Database | PostgreSQL with PostGIS (spatial queries) |
| ORM | Hibernate / Spring Data JPA + Hibernate Spatial |
| Migrations | Flyway |
| Cache | Redis (Lettuce client) |
| Messaging | Apache Kafka |
| Real-time | WebSocket (STOMP over SockJS) |
| File Storage | AWS S3 (via AWS SDK v2) |
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
| Styling | Tailwind CSS v3 + `@tailwindcss/forms` |
| State | Redux Toolkit + React Query (TanStack v5) |
| Forms | React Hook Form v7 + Zod |
| HTTP Client | Axios |
| WebSocket | `@stomp/stompjs` + SockJS |
| Icons | Lucide React |
| Toasts | React Hot Toast |
| Dates | date-fns |

---

## Prerequisites

| Requirement | Version |
|---|---|
| Java | 21+ |
| Maven | 3.9+ |
| Node.js | 18+ |
| PostgreSQL | 15+ with PostGIS extension |
| Redis | 7+ |
| Apache Kafka | 3+ (optional for local dev — disable Kafka listener if not available) |

---

## Getting Started

### 1. Database setup

```sql
CREATE USER nexthouse WITH PASSWORD 'changeme';
CREATE DATABASE nexthouse_db OWNER nexthouse;
\c nexthouse_db
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 2. Backend

```bash
cd com.NextHouse

# Run with dev profile (disables Firebase, rate-limiting; enables debug logging)
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Backend starts on **http://localhost:8080**

Swagger UI available at **http://localhost:8080/swagger-ui.html**

### 3. Frontend

```bash
cd nexthouse-frontend-v3
npm install
npm run dev
```

Frontend starts on **http://localhost:3000**

### 4. Environment variables

Create `nexthouse-frontend-v3/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=http://localhost:8080
```

---

## Spring Profiles

| Profile | Purpose |
|---|---|
| *(default)* | Production — all env vars required, Firebase active, rate-limiting on |
| `dev` | Local development — Firebase disabled, rate-limiting off, SQL logging on |
| `test` | JUnit tests — Kafka listeners off, Flyway clean enabled |

---

## API Reference

Base path: `/api/v1`  
All endpoints require a Bearer token unless noted otherwise.

---

### Authentication — `/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register new user (optional GPS + FCM token) |
| POST | `/auth/login` | Public | Login with email/phone/username + password |
| POST | `/auth/logout` | Required | Logout current device |
| POST | `/auth/logout-all` | Required | Logout all devices |
| POST | `/auth/refresh-token` | Public | Rotate and refresh access token |
| POST | `/auth/otp/request` | Public | Request OTP (REGISTRATION / LOGIN / PASSWORD_RESET / PHONE_VERIFICATION / TWO_FACTOR_AUTH) |
| POST | `/auth/otp/verify` | Public | Verify OTP; locks after 5 failed attempts |
| POST | `/auth/password/forgot` | Public | Trigger password reset OTP |
| POST | `/auth/password/reset` | Public | Reset password with OTP token |
| POST | `/auth/password/change` | Required | Change password — revokes all sessions |
| POST | `/auth/oauth2` | Public | Social login (Google / Facebook / Apple) |
| POST | `/auth/2fa/enable` | Required | Enable 2FA (requires verified phone) |
| POST | `/auth/2fa/disable` | Required | Disable 2FA |
| POST | `/auth/2fa/verify` | Public | Complete 2FA login |

---

### Users — `/users`

| Method | Path | Description |
|---|---|---|
| GET | `/users/me` | Get my profile |
| PUT | `/users/me` | Update my profile |
| PATCH | `/users/me/location` | Update GPS coordinates; auto-reassigns neighbourhood |
| DELETE | `/users/me` | Soft-delete account (retained 30 days) |
| GET | `/users/{userId}` | Get a user's public profile |
| GET | `/users/nearby` | Find nearby verified neighbours within radius |
| GET | `/users/suggestions` | Friend-of-friends suggestions |
| GET | `/users/search` | Search users by name or username |
| POST | `/users/{userId}/follow` | Follow a user |
| DELETE | `/users/{userId}/follow` | Unfollow a user |
| GET | `/users/{userId}/followers` | Get followers list |
| GET | `/users/{userId}/following` | Get following list |
| POST | `/users/{userId}/block` | Block user (auto-unfollows both directions) |
| DELETE | `/users/{userId}/block` | Unblock user |

---

### Posts — `/posts`

| Method | Path | Description |
|---|---|---|
| POST | `/posts` | Create a post |
| GET | `/posts/{postId}` | Get post details |
| PUT | `/posts/{postId}` | Update post |
| DELETE | `/posts/{postId}` | Delete post |
| POST | `/posts/{postId}/report` | Report post |
| GET | `/posts/feed/following` | Feed from followed users |
| GET | `/posts/feed/nearby` | Feed of nearby posts (GPS radius) |
| GET | `/posts/feed/trending` | Trending posts in a neighbourhood |
| GET | `/posts/feed/community/{communityId}` | Posts in a community |
| GET | `/posts/user/{userId}` | All posts by a user |
| GET | `/posts/hashtag/{hashtag}` | Posts by hashtag |
| POST | `/posts/{postId}/react` | Add reaction (LIKE / HEART / HELPFUL / CELEBRATE / CURIOUS) |
| DELETE | `/posts/{postId}/react` | Remove reaction |
| POST | `/posts/{postId}/save` | Save post |
| DELETE | `/posts/{postId}/save` | Unsave post |
| GET | `/posts/saved` | Get saved posts |
| POST | `/posts/{postId}/share` | Record share |
| GET | `/posts/{postId}/comments` | Get comments |
| POST | `/posts/{postId}/comments` | Add comment |
| GET | `/posts/comments/{commentId}/replies` | Get replies |
| PUT | `/posts/comments/{commentId}` | Update comment |
| DELETE | `/posts/comments/{commentId}` | Delete comment |
| POST | `/posts/comments/{commentId}/like` | Like comment |

---

### Activities — `/activities`

| Method | Path | Description |
|---|---|---|
| POST | `/activities` | Create local activity/event |
| GET | `/activities/{activityId}` | Get activity details |
| PUT | `/activities/{activityId}` | Update activity (host only) |
| DELETE | `/activities/{activityId}` | Cancel activity (host only) |
| GET | `/activities/nearby` | Find nearby activities (GPS + optional type filter) |
| GET | `/activities/community/{communityId}` | Upcoming activities in a community |
| GET | `/activities/my/hosting` | Activities I'm hosting |
| GET | `/activities/my/joined` | Activities I've joined |
| POST | `/activities/{activityId}/join` | Join activity |
| DELETE | `/activities/{activityId}/join` | Leave activity |
| GET | `/activities/{activityId}/members` | Get members (filter by join status) |
| POST | `/activities/{activityId}/members/{memberId}/approve` | Approve join request (host) |
| POST | `/activities/{activityId}/members/{memberId}/reject` | Reject join request (host) |

Activity types: `SOCIAL` `SPORTS` `LEARNING` `VOLUNTEERING` `FOOD` `ARTS` `OUTDOOR` `NEIGHBORHOOD_WATCH` `OTHER`

---

### Communities — `/communities`

| Method | Path | Description |
|---|---|---|
| POST | `/communities` | Create community (creator becomes OWNER) |
| GET | `/communities/{communityId}` | Get community details |
| PUT | `/communities/{communityId}` | Update settings (ADMIN+) |
| DELETE | `/communities/{communityId}` | Delete community (OWNER) |
| GET | `/communities/nearby` | Nearby communities ordered by distance |
| GET | `/communities/my` | My communities |
| GET | `/communities/search` | Search communities |
| POST | `/communities/{communityId}/join` | Join (auto-approve public, pending for private) |
| DELETE | `/communities/{communityId}/join` | Leave community |
| GET | `/communities/{communityId}/members` | Get members (filter by role) |
| POST | `/communities/{communityId}/members/{memberId}/approve` | Approve pending member (MODERATOR+) |
| DELETE | `/communities/{communityId}/members/{memberId}` | Kick member (MODERATOR+) |
| PATCH | `/communities/{communityId}/members/{memberId}/role` | Update member role (OWNER) |

Member roles: `OWNER` `ADMIN` `MODERATOR` `MEMBER`

---

### Chat — `/chat`

| Method | Path | Description |
|---|---|---|
| GET | `/chat/inbox` | Chat inbox sorted by most recent message |
| GET | `/chat/unread-count` | Total unread count (all rooms) |
| POST | `/chat/direct/{otherUserId}` | Get or create direct chat room |
| POST | `/chat/group` | Create group chat |
| GET | `/chat/rooms/{roomId}` | Room details + member list |
| POST | `/chat/rooms/{roomId}/members/{userId}` | Add member (room ADMIN) |
| DELETE | `/chat/rooms/{roomId}/members/{userId}` | Remove member (room ADMIN) |
| PATCH | `/chat/rooms/{roomId}/mute` | Mute / unmute room |
| GET | `/chat/rooms/{roomId}/messages` | Paginated chat history (newest first) |
| POST | `/chat/rooms/{roomId}/messages` | Send message (REST fallback) |
| DELETE | `/chat/rooms/{roomId}/messages/{messageId}` | Soft-delete message |
| POST | `/chat/rooms/{roomId}/read` | Mark room as read |
| GET | `/chat/rooms/{roomId}/unread-count` | Unread count for one room |

---

### Notifications — `/notifications`

| Method | Path | Description |
|---|---|---|
| GET | `/notifications` | Paginated notifications (optionally unread only) |
| GET | `/notifications/unread-count` | Unread count for bell badge |
| POST | `/notifications/{notificationId}/read` | Mark single notification read |
| POST | `/notifications/read-all` | Mark all read |
| DELETE | `/notifications/{notificationId}` | Delete notification |

---

### Marketplace — `/marketplace`

| Method | Path | Description |
|---|---|---|
| POST | `/marketplace` | Create listing (buy / sell / free) |
| GET | `/marketplace/{itemId}` | Get listing details |
| PUT | `/marketplace/{itemId}` | Update listing (seller only) |
| DELETE | `/marketplace/{itemId}` | Delete listing |
| PATCH | `/marketplace/{itemId}/sold` | Mark as sold (seller only) |
| GET | `/marketplace/nearby` | Browse nearby listings (category + price filters) |
| GET | `/marketplace/my` | My listings |
| GET | `/marketplace/search` | Search by title/description |

---

### Safety Alerts — `/safety-alerts`

| Method | Path | Description |
|---|---|---|
| POST | `/safety-alerts` | Create alert (EMERGENCY flag triggers instant fanout) |
| GET | `/safety-alerts/{alertId}` | Get alert details |
| GET | `/safety-alerts/neighborhood/{neighborhoodId}` | Active alerts in neighbourhood |
| GET | `/safety-alerts/nearby` | Active alerts within GPS radius |
| POST | `/safety-alerts/{alertId}/resolve` | Resolve alert |
| POST | `/safety-alerts/{alertId}/verify` | Verify alert as legitimate |
| POST | `/safety-alerts/{alertId}/report` | Report alert as false/inappropriate |

Severity levels: `LOW` `MEDIUM` `HIGH` `CRITICAL`

---

### Borrow Requests — `/borrow-requests`

| Method | Path | Description |
|---|---|---|
| POST | `/borrow-requests` | Post a borrow request |
| GET | `/borrow-requests/{requestId}` | Get request details |
| GET | `/borrow-requests/neighborhood/{neighborhoodId}` | Browse requests in neighbourhood (filter by status) |
| GET | `/borrow-requests/my` | My requests |
| POST | `/borrow-requests/{requestId}/respond` | Volunteer to fulfil (sets status → IN_PROGRESS) |
| POST | `/borrow-requests/{requestId}/close` | Close as fulfilled (requester only) |
| DELETE | `/borrow-requests/{requestId}` | Cancel request (requester only) |

Statuses: `OPEN` `IN_PROGRESS` `FULFILLED` `CANCELLED`

---

### Neighbourhoods — `/neighborhoods`

| Method | Path | Description |
|---|---|---|
| GET | `/neighborhoods/detect` | Detect neighbourhood from GPS (PostGIS) |
| GET | `/neighborhoods/{neighborhoodId}` | Get neighbourhood details |
| GET | `/neighborhoods/nearby` | Nearby neighbourhoods ordered by distance |
| POST | `/neighborhoods/me/assign/{neighborhoodId}` | Manually set my primary neighbourhood |
| POST | `/neighborhoods/{neighborhoodId}/verify` | *(ADMIN)* Verify neighbourhood |
| POST | `/neighborhoods` | *(ADMIN)* Create neighbourhood |

---

### Search — `/search`

| Method | Path | Description |
|---|---|---|
| GET | `/search` | Global multi-entity search (users, posts, activities, communities, marketplace) |
| GET | `/search/suggest` | Autocomplete suggestions |
| GET | `/search/trending` | Top 20 trending keywords (last 24 h) — public |
| GET | `/search/history` | My recent search queries |
| DELETE | `/search/history` | Clear search history |
| GET | `/search/users` | Search users only |
| GET | `/search/posts` | Search posts by hashtag or keyword |
| GET | `/search/activities` | Search activities |
| GET | `/search/communities` | Search communities |
| GET | `/search/marketplace` | Search marketplace listings |

---

### Media — `/media`

| Method | Path | Description |
|---|---|---|
| POST | `/media/upload` | Upload image / video / PDF (multipart) |
| GET | `/media/entity/{entityType}/{entityId}` | Get all media for an entity |
| DELETE | `/media/{mediaId}` | Delete media (uploader only) |

Max upload size: **50 MB** per file, **55 MB** per request.

---

### Recommendations — `/recommendations`

| Method | Path | Description |
|---|---|---|
| GET | `/recommendations/posts` | Personalised post recommendations |
| GET | `/recommendations/activities` | Activity recommendations |
| GET | `/recommendations/communities` | Community recommendations |
| GET | `/recommendations/users` | User recommendations |

---

### Admin — `/admin` *(ROLE_ADMIN required)*

| Method | Path | Description |
|---|---|---|
| GET | `/admin/dashboard` | Dashboard stats + moderation queue |
| GET | `/admin/users` | List all users (filter by status / banned) |
| POST | `/admin/users/{userId}/ban` | Ban user |
| POST | `/admin/users/{userId}/unban` | Unban user |
| DELETE | `/admin/users/{userId}` | Force-delete account |
| GET | `/admin/moderation` | Moderation queue (ADMIN or MODERATOR) |
| POST | `/admin/moderation/{queueId}/approve` | Approve queued content |
| POST | `/admin/moderation/{queueId}/block` | Block and remove queued content |
| GET | `/admin/reports` | All user reports (filter by status / entity type) |
| POST | `/admin/reports/{reportId}/review` | Review report (ACTION_TAKEN or DISMISSED) |
| POST | `/admin/neighborhoods/{neighborhoodId}/verify` | Verify neighbourhood |

---

## WebSocket (STOMP)

Connect to: `ws://localhost:8080/ws` (SockJS fallback: `http://localhost:8080/ws`)

Subscribe/publish topics:

| Direction | Destination | Description |
|---|---|---|
| PUBLISH | `/app/chat/rooms/{roomId}/send` | Send a chat message |
| SUBSCRIBE | `/topic/rooms/{roomId}/messages` | Receive messages in a room |
| PUBLISH | `/app/chat/rooms/{roomId}/typing` | Send typing indicator |
| SUBSCRIBE | `/topic/rooms/{roomId}/typing` | Receive typing indicators |
| PUBLISH | `/app/presence/heartbeat` | Refresh online status |
| PUBLISH | `/app/chat/rooms/{roomId}/read` | Mark room as read |
| SUBSCRIBE | `/user/queue/notifications` | Personal real-time notifications |
| SUBSCRIBE | `/user/queue/presence` | Online/offline presence events |

---

## Frontend Pages

| Route | Description |
|---|---|
| `/login` | Login |
| `/register` | Sign up |
| `/forgot-password` | Password reset |
| `/feed` | Home feed |
| `/posts/[postId]` | Post detail + comments |
| `/communities` | Browse communities |
| `/communities/[id]` | Community detail |
| `/communities/create` | Create community |
| `/activities` | Nearby activities |
| `/activities/[id]` | Activity detail |
| `/activities/create` | Create activity |
| `/marketplace` | Marketplace listings |
| `/marketplace/[id]` | Listing detail |
| `/marketplace/create` | Create listing |
| `/borrow` | Borrow requests feed |
| `/borrow/create` | Post a borrow request |
| `/safety` | Safety alerts map |
| `/safety/create` | Raise safety alert |
| `/chat` | Chat inbox |
| `/chat/[roomId]` | Chat room |
| `/search` | Global search |
| `/notifications` | Notifications |
| `/neighbours` | Nearby neighbours |
| `/neighbourhood` | My neighbourhood |
| `/profile/[userId]` | User profile |
| `/my/listings` | My marketplace listings |
| `/my/activities` | My activities |
| `/settings` | Settings hub |
| `/settings/profile` | Edit profile |
| `/settings/password` | Change password |

---

## Pagination

All list endpoints support standard pagination query params:

| Param | Default | Description |
|---|---|---|
| `page` | `0` | Zero-based page number |
| `size` | `20` | Items per page |

Response envelope:

```json
{
  "content": [...],
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

## Project Structure

```
com.NextHouse/                   # Spring Boot backend
├── src/main/java/com/NextHouse/
│   ├── controller/              # REST controllers
│   ├── service/                 # Service interfaces
│   ├── serviceImpl/             # Business logic
│   ├── entity/                  # JPA entities
│   ├── dto/                     # Request / Response DTOs
│   ├── repository/              # Spring Data repositories
│   ├── config/                  # Security, WebSocket, Redis, Kafka config
│   ├── security/                # JWT filter, UserDetails
│   ├── event/                   # Kafka event objects
│   └── constant/                # Enums and constants
└── src/main/resources/
    ├── application.yml
    └── db/migration/            # Flyway SQL migrations

nexthouse-frontend-v3/           # Next.js frontend
├── src/
│   ├── app/                     # App Router pages
│   │   ├── (auth)/              # Login / Register / Forgot password
│   │   └── (app)/               # Main authenticated app
│   ├── api/                     # Axios API wrappers (one per backend module)
│   ├── components/              # Shared UI components
│   ├── lib/                     # apiClient, WebSocket (ws.ts), utilities
│   └── types/                   # TypeScript interfaces mirroring backend DTOs
```

---

## Frontend — In Depth

### App Router Layout

The Next.js App Router has two route groups:

```
src/app/
├── layout.tsx            → Root layout: loads Inter font, sets SEO metadata, wraps in <Providers>
├── page.tsx              → Root redirect: sends / → /feed
├── (auth)/               → Public routes — no auth required
│   ├── layout.tsx        → Centred card layout for auth pages
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── forgot-password/page.tsx
└── (app)/                → Protected routes — redirects to /login if not authenticated
    ├── layout.tsx        → App shell: sticky header, bottom nav, slide-in side menu
    └── [all app pages]
```

The `(app)/layout.tsx` shell handles:
- Auth guard — reads Redux auth state, redirects if `!user`
- Sticky header: logo, search button, safety alert shortcut, notification bell (with unread badge), hamburger menu
- Bottom navigation: Feed · Neighbours · Communities · Marketplace · Chat
- Slide-in side menu: profile summary + deep links to all sections

---

### Authentication Flow

```
User submits login form
    → POST /api/v1/auth/login
    → tokens.set(accessToken, refreshToken)   ← stored in localStorage
    → Redux auth slice updated
    → redirect to /feed

On every API request
    → Axios request interceptor injects   Authorization: Bearer <accessToken>
    → X-Device-Id header (persisted in localStorage, generated once)
    → X-Device-Type: WEB

On 401 response (non-auth endpoint)
    → Axios response interceptor fires
    → POST /api/v1/auth/refresh-token
    → tokens.set(newAccess, newRefresh)
    → Retry original request with new token
    → All concurrent 401s are queued and drained together

If refresh fails
    → tokens.clear()
    → window.dispatchEvent(new Event('nh:logout'))
    → AuthProvider listens and redirects to /login
```

Token storage keys in `localStorage`:

| Key | Value |
|---|---|
| `nh_access` | JWT access token (expires 15 min by default) |
| `nh_refresh` | Refresh token (expires 30 days) |
| `nh_device` | Persistent device ID (`web-<timestamp>-<random>`) |

---

### API Client (`src/lib/apiClient.ts`)

Axios instance with base URL `NEXT_PUBLIC_API_URL/api/v1`.

Typed helper functions — all unwrap the `{ data: T }` response envelope automatically:

```ts
apiGet<T>(url, params?)    // GET with query params
apiPost<T>(url, body?)     // POST with JSON body
apiPut<T>(url, body?)      // PUT with JSON body
apiPatch<T>(url, body?)    // PATCH with JSON body
apiDelete<T>(url)          // DELETE
apiUpload<T>(url, form)    // POST multipart/form-data (file uploads)
```

Usage example:

```ts
import { apiGet } from '@/lib/apiClient';

const user = await apiGet<UserResponse>('/users/me');
```

---

### API Layer (`src/api/index.ts`)

Each backend module has a named export object. All methods return typed Promises.

| Export | Module | Example |
|---|---|---|
| `authApi` | Authentication | `authApi.login({ identifier, password })` |
| `usersApi` | Users / profiles | `usersApi.getMe()` |
| `postsApi` | Posts + comments | `postsApi.followingFeed(page, size)` |
| `activitiesApi` | Local activities | `activitiesApi.nearby(lat, lon, radius)` |
| `communitiesApi` | Communities | `communitiesApi.join(id)` |
| `chatApi` | Chat rooms + messages | `chatApi.inbox()` |
| `notificationsApi` | Notifications | `notificationsApi.markAllRead()` |
| `marketplaceApi` | Marketplace | `marketplaceApi.nearby(lat, lon)` |
| `safetyApi` | Safety alerts | `safetyApi.create(dto)` |
| `borrowApi` | Borrow requests | `borrowApi.create(dto)` |
| `neighborhoodsApi` | Neighbourhoods | `neighborhoodsApi.detect(lat, lon)` |
| `searchApi` | Global search | `searchApi.global(query)` |
| `mediaApi` | File upload | `mediaApi.upload(file, 'POST')` |
| `recommendationsApi` | Recommendations | `recommendationsApi.posts()` |

---

### WebSocket / Real-time (`src/lib/ws.ts`)

STOMP protocol over SockJS. The client is a singleton — import `wsClient` anywhere.

**Connection:**
```ts
import { wsClient } from '@/lib/ws';

// Connect with JWT
wsClient.connect(accessToken);

// Disconnect
wsClient.disconnect();

// Check status
wsClient.isConnected();
```

**Subscriptions:**
```ts
// Chat messages in a room
const unsub = wsClient.onRoomMessage(roomId, (msg: ChatMessageResponse) => {
  // handle message
});

// Typing indicator
const unsub = wsClient.onTyping(roomId, ({ userId, typing }) => {});

// Personal notifications
const unsub = wsClient.onNotification((notification) => {});

// User presence
const unsub = wsClient.onPresence(userId, ({ online, lastSeen }) => {});

// Always call unsub() on component unmount
```

**Publishing:**
```ts
wsClient.sendMessage(roomId, { message: 'Hello!', messageType: 'TEXT' });
wsClient.sendTyping(roomId, true);
wsClient.markRead(roomId);
```

Connection config: heartbeat 60 s, auto-reconnect delay 5 s, token injected in CONNECT frame headers.

---

### WebSocket Provider (`src/components/common/WSProvider.tsx`)

Mounted at the root of `(app)/layout.tsx`. Handles:
- Connects WebSocket when user is authenticated
- Subscribes to `onNotification` → dispatches to Redux + shows toast
- Toast types by notification event: `SAFETY_ALERT` → red error toast, `FOLLOW` / `COMMENT` / `LIKE` → success toast, join requests → info toast
- Loads initial unread counts (notifications + chat) on first connect
- Disconnects and cleans up all subscriptions on logout

---

### State Management (Redux Toolkit)

Store is set up in `src/components/common/Providers.tsx`.

Recommended slice structure (add as slices are created):

| Slice | State |
|---|---|
| `auth` | `user`, `accessToken`, `status` |
| `notifications` | `unreadCount`, `items[]` |
| `chat` | `totalUnread`, `rooms[]` |

---

### Forms — React Hook Form + Zod

All forms follow this pattern:

```ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
});
type Form = z.infer<typeof schema>;

const { register, handleSubmit, formState: { errors } } = useForm<Form>({
  resolver: zodResolver(schema),
});
```

For number inputs that can be blank, use `z.preprocess` to avoid `NaN`:
```ts
amount: z.preprocess(
  (v) => (typeof v === 'number' && isNaN(v as number) ? undefined : v),
  z.number().min(0).optional(),
),
```

For button-group selectors (not a native input), register a hidden field:
```tsx
<input type="hidden" {...register('category')} />
{OPTIONS.map(o => (
  <button type="button" onClick={() => setValue('category', o, { shouldValidate: true })}>
    {o}
  </button>
))}
```

---

### Styling System (Tailwind CSS)

Custom design tokens in `tailwind.config.js`:

| Token | Value | Notes |
|---|---|---|
| `primary-500` | `#10b981` | Same as Tailwind `emerald-500` — both work |
| `primary-50 → 900` | emerald scale | Full palette available |
| `font-sans` | Inter | Loaded via Google Fonts in root layout |
| `shadow-sm/md/lg` | Custom | Softer than Tailwind defaults |
| `rounded-2xl` | `1rem` | `rounded-3xl` = `1.5rem` |

Global component classes defined in `src/app/globals.css`:

| Class | Description |
|---|---|
| `.btn` | Base button (flex, semibold, transition, disabled states) |
| `.btn-primary` | Emerald filled button |
| `.btn-outline` | Border button |
| `.btn-ghost` | Text-only button |
| `.btn-danger` | Red filled button |
| `.btn-sm` | Small size modifier |
| `.card` | White rounded card with border |
| `.card-hover` | Card + hover shadow/border transition |
| `.input` | Form input (border, focus ring, emerald accent) |
| `.input-error` | Red error state for `.input` |
| `.label` | Form field label |
| `.badge` | Pill badge (inline-flex) |
| `.avatar` | Circular avatar base |
| `.avatar-sm/md/lg/xl` | Avatar sizes (8/10/14/20 = 32/40/56/80 px) |
| `.section-title` | Uppercase section header |
| `.safe-pb` | iOS safe-area bottom padding |
| `.scrollbar-hide` | Hide scrollbar (cross-browser) |
| `.line-clamp-2/3` | Text truncation at 2 or 3 lines |

---

### Environment Variables

**Frontend** (`nexthouse-frontend-v3/.env.local`):

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Backend REST base URL |
| `NEXT_PUBLIC_WS_URL` | `http://localhost:8080` | WebSocket base URL (SockJS endpoint) |

**Backend** (override via env or `application.yml`):

| Variable | Default | Description |
|---|---|---|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `nexthouse_db` | Database name |
| `DB_USERNAME` | `nexthouse` | DB username |
| `DB_PASSWORD` | `changeme` | DB password |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | *(empty)* | Redis password |
| `KAFKA_BROKERS` | `localhost:9092` | Kafka bootstrap servers |
| `JWT_SECRET` | dev key | **Change in production** |
| `SERVER_PORT` | `8080` | Backend HTTP port |
| `AWS_ACCESS_KEY_ID` | — | AWS credentials for S3 |
| `AWS_SECRET_ACCESS_KEY` | — | AWS credentials for S3 |
| `S3_BUCKET` | `nexthouse-media` | S3 bucket for media uploads |
| `CDN_BASE_URL` | `https://cdn.nexthouse.app` | CDN prefix for media URLs |
| `FIREBASE_CREDENTIALS_FILE` | `classpath:firebase-service-account.json` | Set to `disabled` to skip push notifications locally |
| `FIREBASE_PROJECT_ID` | — | Firebase project ID |
| `SES_USERNAME` | — | AWS SES SMTP username |
| `SES_PASSWORD` | — | AWS SES SMTP password |

---

### Frontend Scripts

```bash
# Development server (hot reload)
npm run dev

# Production build
npm run build

# Start production server (after build)
npm start

# Lint
npm run lint
```

---

### Image Handling

`next.config.js` allows `<Image>` optimization from:

| Domain | Protocol |
|---|---|
| `cdn.nexthouse.app` | https |
| `localhost` | http |
| `*` (any) | https |

Always use Next.js `<Image>` component for optimised loading, not `<img>`.

---

### TypeScript Types (`src/types/index.ts`)

All interfaces mirror the backend DTOs exactly. Naming convention:

| Pattern | Example |
|---|---|
| Response DTOs | `UserResponse`, `PostResponse`, `ChatRoomResponse` |
| Request DTOs | `LoginRequest`, `CreatePostRequest`, `SendMessageRequest` |
| Summary DTOs | `UserSummaryDTO`, `CommunitySummaryDTO` |
| Page wrapper | `PageResponse<T>` |
| API envelope | `ApiResponse<T>` |

When the backend adds a new field, update both the Java DTO and the corresponding TypeScript interface here.

---

### Common Pitfalls

| Issue | Fix |
|---|---|
| `NaN` in number inputs | Use `z.preprocess` in Zod schema to convert `NaN → undefined` |
| Button-group field not validating | Add `<input type="hidden" {...register('fieldName')} />` + `setValue(..., { shouldValidate: true })` |
| Image not loading | Add domain to `remotePatterns` in `next.config.js` |
| WebSocket connects before token ready | Use `wsClient.onceConnected(cb)` to defer subscription until connected |
| 401 loop on refresh endpoint | The Axios interceptor skips retry for URLs containing `/auth/` |