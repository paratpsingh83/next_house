// src/api/index.ts
// Complete API layer — every endpoint mapped to the backend controllers

import { apiGet, apiPost, apiPut, apiPatch, apiDelete, apiUpload } from '@/lib/apiClient';
import type {
  AuthResponse, TokenResponse,
  LoginRequest, RegisterRequest, OtpRequest, OtpVerifyRequest,
  ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest,
  OAuth2LoginRequest, RefreshTokenRequest,
  UserResponse, UserSummaryDTO, NearbyUserResponse, FollowRequestItem,
  UpdateProfileRequest, UpdateLocationRequest,
  PostResponse, PostCommentResponse,
  CreatePostRequest, UpdatePostRequest, CreateCommentRequest, ReactPostRequest,
  ActivityResponse, ActivityMemberResponse, CreateActivityRequest,
  CommunityResponse, CreateCommunityRequest,
  NeighborhoodSummaryDTO,
  ChatRoomResponse, ChatMessageResponse, SendMessageRequest, CreateChatRoomRequest,
  NotificationResponse,
  MarketplaceItemResponse, CreateMarketplaceItemRequest,
  SafetyAlertResponse, CreateSafetyAlertRequest,
  BorrowRequestResponse, CreateBorrowRequest,
  MediaFileResponse, SearchResultDTO,
  StoryResponse, CreateStoryRequest,
  PageResponse,
} from '@/types';

// ─── AUTH — POST /api/v1/auth/* ──────────────────────────────────────────────
export const authApi = {
  register:       (d: RegisterRequest)       => apiPost<AuthResponse>('/auth/register', d),
  login:          (d: LoginRequest)          => apiPost<AuthResponse>('/auth/login', d),
  logout:         ()                         => apiPost<void>('/auth/logout'),
  logoutAll:      ()                         => apiPost<void>('/auth/logout-all'),
  refreshToken:   (d: RefreshTokenRequest)   => apiPost<TokenResponse>('/auth/refresh-token', d),
  requestOtp:     (d: OtpRequest)            => apiPost<void>('/auth/otp/request', d),
  verifyOtp:      (d: OtpVerifyRequest)      => apiPost<void>('/auth/otp/verify', d),
  forgotPassword: (d: ForgotPasswordRequest) => apiPost<void>('/auth/password/forgot', d),
  resetPassword:  (d: ResetPasswordRequest)  => apiPost<void>('/auth/password/reset', d),
  changePassword: (d: ChangePasswordRequest) => apiPost<void>('/auth/password/change', d),
  oauth2Login:    (d: OAuth2LoginRequest)    => apiPost<AuthResponse>('/auth/oauth2', d),
  enable2FA:      ()                         => apiPost<void>('/auth/2fa/enable'),
  disable2FA:     ()                         => apiPost<void>('/auth/2fa/disable'),
  verify2FA:      (otp: string)              => apiPost<AuthResponse>(`/auth/2fa/verify?otp=${encodeURIComponent(otp)}`),
};

// ─── USERS — /api/v1/users/* ─────────────────────────────────────────────────
export const usersApi = {
  getMe:          ()                                                               => apiGet<UserResponse>('/users/me'),
  getProfile:     (userId: number)                                                 => apiGet<UserResponse>(`/users/${userId}`),
  updateProfile:  (d: UpdateProfileRequest)                                        => apiPut<UserResponse>('/users/me', d),
  updateLocation: (d: UpdateLocationRequest)                                       => apiPatch<void>('/users/me/location', d),
  deleteAccount:  ()                                                               => apiDelete<void>('/users/me'),
  getNearby:      (lat: number, lon: number, radius = 5000, page = 0, size = 20)  => apiGet<PageResponse<NearbyUserResponse>>('/users/nearby', { latitude: lat, longitude: lon, radiusMeters: radius, page, size }),
  getSuggestions: (page = 0, size = 20)                                            => apiGet<PageResponse<UserSummaryDTO>>('/users/suggestions', { page, size }),
  search:         (query: string, page = 0, size = 20)                            => apiGet<PageResponse<UserSummaryDTO>>('/users/search', { query, page, size }),
  follow:                (userId: number)                  => apiPost<string>(`/users/${userId}/follow`),
  unfollow:              (userId: number)                  => apiDelete<void>(`/users/${userId}/follow`),
  getFollowers:          (userId: number, page = 0, size = 20) => apiGet<PageResponse<UserSummaryDTO>>(`/users/${userId}/followers`, { page, size }),
  getFollowing:          (userId: number, page = 0, size = 20) => apiGet<PageResponse<UserSummaryDTO>>(`/users/${userId}/following`, { page, size }),
  block:                 (userId: number)                  => apiPost<void>(`/users/${userId}/block`),
  unblock:               (userId: number)                  => apiDelete<void>(`/users/${userId}/block`),
  getBlockedUsers:       ()                                => apiGet<UserSummaryDTO[]>('/users/me/blocked'),
  updatePrivacy:         (isPrivate: boolean)              => apiPut<UserResponse>('/users/me', { isPrivate }),
  getFollowRequests:     ()                                => apiGet<FollowRequestItem[]>('/users/follow-requests'),
  acceptFollowRequest:   (requestId: number)               => apiPost<void>(`/users/follow-requests/${requestId}/accept`),
  rejectFollowRequest:   (requestId: number)               => apiDelete<void>(`/users/follow-requests/${requestId}`),
  verifyAddress:         ()                                => apiPost<void>('/users/me/verify-address'),
  verifyIdentity:        ()                                => apiPost<void>('/users/me/verify-identity'),
};

// ─── POSTS — /api/v1/posts/* ─────────────────────────────────────────────────
export const postsApi = {
  create:         (d: CreatePostRequest)                                            => apiPost<PostResponse>('/posts', d),
  get:            (postId: number)                                                  => apiGet<PostResponse>(`/posts/${postId}`),
  update:         (postId: number, d: UpdatePostRequest)                            => apiPut<PostResponse>(`/posts/${postId}`, d),
  delete:         (postId: number)                                                  => apiDelete<void>(`/posts/${postId}`),

  // Feeds
  followingFeed:  (page = 0, size = 20)                                            => apiGet<PageResponse<PostResponse>>('/posts/feed/following', { page, size }),
  nearbyFeed:     (lat: number, lon: number, radius = 5000, page = 0, size = 20)   => apiGet<PageResponse<PostResponse>>('/posts/feed/nearby', { latitude: lat, longitude: lon, radiusMeters: radius, page, size }),
  trendingFeed:   (neighborhoodId: number, page = 0, size = 20)                    => apiGet<PageResponse<PostResponse>>('/posts/feed/trending', { neighborhoodId, page, size }),
  communityFeed:  (communityId: number, page = 0, size = 20)                       => apiGet<PageResponse<PostResponse>>(`/posts/feed/community/${communityId}`, { page, size }),
  userPosts:      (userId: number, page = 0, size = 20)                            => apiGet<PageResponse<PostResponse>>(`/posts/user/${userId}`, { page, size }),
  hashtagFeed:    (hashtag: string, page = 0, size = 20)                           => apiGet<PageResponse<PostResponse>>(`/posts/hashtag/${hashtag}`, { page, size }),

  // Reactions
  react:          (postId: number, d: ReactPostRequest)                             => apiPost<void>(`/posts/${postId}/react`, d),
  removeReact:    (postId: number)                                                  => apiDelete<void>(`/posts/${postId}/react`),

  // Save
  save:           (postId: number)                                                  => apiPost<void>(`/posts/${postId}/save`),
  unsave:         (postId: number)                                                  => apiDelete<void>(`/posts/${postId}/save`),
  savedPosts:     (collection?: string, page = 0, size = 20)                       => apiGet<PageResponse<PostResponse>>('/posts/saved', { collection, page, size }),
  share:          (postId: number)                                                  => apiPost<void>(`/posts/${postId}/share`),
  report:         (postId: number, reason: string, description?: string)            => apiPost<void>(`/posts/${postId}/report`, { reason, description }),

  // Comments
  getComments:    (postId: number, page = 0, size = 20)                            => apiGet<PageResponse<PostCommentResponse>>(`/posts/${postId}/comments`, { page, size }),
  addComment:     (postId: number, d: CreateCommentRequest)                         => apiPost<PostCommentResponse>(`/posts/${postId}/comments`, d),
  getReplies:     (commentId: number, page = 0, size = 20)                         => apiGet<PageResponse<PostCommentResponse>>(`/posts/comments/${commentId}/replies`, { page, size }),
  updateComment:  (commentId: number, d: CreateCommentRequest)                      => apiPut<PostCommentResponse>(`/posts/comments/${commentId}`, d),
  deleteComment:  (commentId: number)                                               => apiDelete<void>(`/posts/comments/${commentId}`),
  likeComment:    (commentId: number)                                               => apiPost<void>(`/posts/comments/${commentId}/like`),
};

// ─── ACTIVITIES — /api/v1/activities/* ───────────────────────────────────────
export const activitiesApi = {
  create:         (d: CreateActivityRequest)                                        => apiPost<ActivityResponse>('/activities', d),
  get:            (id: number)                                                      => apiGet<ActivityResponse>(`/activities/${id}`),
  update:         (id: number, d: Partial<CreateActivityRequest>)                   => apiPut<ActivityResponse>(`/activities/${id}`, d),
  delete:         (id: number)                                                      => apiDelete<void>(`/activities/${id}`),
  nearby:         (lat: number, lon: number, radius = 10000, type?: string, page = 0, size = 20) => apiGet<PageResponse<ActivityResponse>>('/activities/nearby', { latitude: lat, longitude: lon, radiusMeters: radius, activityType: type, page, size }),
  byCommunity:    (communityId: number, page = 0, size = 20)                        => apiGet<PageResponse<ActivityResponse>>(`/activities/community/${communityId}`, { page, size }),
  myHosting:      (page = 0, size = 20)                                             => apiGet<PageResponse<ActivityResponse>>('/activities/my/hosting', { page, size }),
  myJoined:       (page = 0, size = 20)                                             => apiGet<PageResponse<ActivityResponse>>('/activities/my/joined', { page, size }),
  join:           (id: number, note?: string)                                        => apiPost<void>(`/activities/${id}/join`, { note }),
  leave:          (id: number)                                                       => apiDelete<void>(`/activities/${id}/join`),
  getMembers:     (id: number, joinStatus = 'APPROVED', page = 0, size = 20)        => apiGet<PageResponse<ActivityMemberResponse>>(`/activities/${id}/members`, { joinStatus, page, size }),
  approve:        (activityId: number, memberId: number)                             => apiPost<void>(`/activities/${activityId}/members/${memberId}/approve`),
  reject:         (activityId: number, memberId: number)                             => apiPost<void>(`/activities/${activityId}/members/${memberId}/reject`),
};

// ─── COMMUNITIES — /api/v1/communities/* ─────────────────────────────────────
export const communitiesApi = {
  create:         (d: CreateCommunityRequest)                                        => apiPost<CommunityResponse>('/communities', d),
  get:            (id: number)                                                       => apiGet<CommunityResponse>(`/communities/${id}`),
  update:         (id: number, d: Partial<CreateCommunityRequest>)                   => apiPut<CommunityResponse>(`/communities/${id}`, d),
  delete:         (id: number)                                                       => apiDelete<void>(`/communities/${id}`),
  nearby:         (lat: number, lon: number, radius = 10000, page = 0, size = 20)   => apiGet<PageResponse<CommunityResponse>>('/communities/nearby', { latitude: lat, longitude: lon, radiusMeters: radius, page, size }),
  mine:           (page = 0, size = 20)                                              => apiGet<PageResponse<CommunityResponse>>('/communities/my', { page, size }),
  search:         (query: string, page = 0, size = 20)                              => apiGet<PageResponse<CommunityResponse>>('/communities/search', { query, page, size }),
  join:           (id: number)                                                       => apiPost<void>(`/communities/${id}/join`),
  leave:          (id: number)                                                       => apiDelete<void>(`/communities/${id}/join`),
  getMembers:     (id: number, role?: string, page = 0, size = 20)                  => apiGet<PageResponse<UserSummaryDTO>>(`/communities/${id}/members`, { role, page, size }),
  approveMember:  (communityId: number, memberId: number)                            => apiPost<void>(`/communities/${communityId}/members/${memberId}/approve`),
  kickMember:     (communityId: number, memberId: number)                            => apiDelete<void>(`/communities/${communityId}/members/${memberId}`),
  updateRole:     (communityId: number, memberId: number, role: string)              => apiPatch<void>(`/communities/${communityId}/members/${memberId}/role?role=${role}`),
};

// ─── NEIGHBORHOODS — /api/v1/neighborhoods/* ─────────────────────────────────
export const neighborhoodsApi = {
  detect:         (lat: number, lon: number)                                         => apiGet<NeighborhoodSummaryDTO>('/neighborhoods/detect', { latitude: lat, longitude: lon }),
  get:            (id: number)                                                       => apiGet<NeighborhoodSummaryDTO>(`/neighborhoods/${id}`),
  nearby:         (lat: number, lon: number, limit = 5)                             => apiGet<PageResponse<NeighborhoodSummaryDTO>>('/neighborhoods/nearby', { latitude: lat, longitude: lon, limit }),
  assignMine:     (neighborhoodId: number)                                           => apiPost<void>(`/neighborhoods/me/assign/${neighborhoodId}`),
};

// ─── CHAT — /api/v1/chat/* ───────────────────────────────────────────────────
export const chatApi = {
  inbox:          (page = 0, size = 20)                                             => apiGet<PageResponse<ChatRoomResponse>>('/chat/inbox', { page, size }),
  totalUnread:    ()                                                                 => apiGet<number>('/chat/unread-count'),
  directRoom:     (otherUserId: number)                                              => apiPost<ChatRoomResponse>(`/chat/direct/${otherUserId}`),
  createGroup:    (d: CreateChatRoomRequest)                                         => apiPost<ChatRoomResponse>('/chat/group', d),
  getRoomDetails: (roomId: number)                                                   => apiGet<ChatRoomResponse>(`/chat/rooms/${roomId}`),
  addMember:      (roomId: number, userId: number)                                   => apiPost<void>(`/chat/rooms/${roomId}/members/${userId}`),
  removeMember:   (roomId: number, userId: number)                                   => apiDelete<void>(`/chat/rooms/${roomId}/members/${userId}`),
  muteRoom:       (roomId: number, muted: boolean)                                   => apiPatch<void>(`/chat/rooms/${roomId}/mute?muted=${muted}`),
  getHistory:     (roomId: number, page = 0, size = 30)                             => apiGet<PageResponse<ChatMessageResponse>>(`/chat/rooms/${roomId}/messages`, { page, size }),
  sendMessage:    (roomId: number, d: SendMessageRequest)                            => apiPost<ChatMessageResponse>(`/chat/rooms/${roomId}/messages`, d),
  deleteMessage:  (roomId: number, messageId: number)                                => apiDelete<void>(`/chat/rooms/${roomId}/messages/${messageId}`),
  unsendMessage:  (roomId: number, messageId: number)                                => apiPost<ChatMessageResponse>(`/chat/rooms/${roomId}/messages/${messageId}/unsend`),
  markRead:       (roomId: number)                                                   => apiPost<void>(`/chat/rooms/${roomId}/read`),
  roomUnread:     (roomId: number)                                                   => apiGet<number>(`/chat/rooms/${roomId}/unread-count`),
};

// ─── NOTIFICATIONS — /api/v1/notifications/* ─────────────────────────────────
export const notificationsApi = {
  getAll:         (unreadOnly = false, page = 0, size = 20)                         => apiGet<PageResponse<NotificationResponse>>('/notifications', { unreadOnly, page, size }),
  unreadCount:    ()                                                                 => apiGet<number>('/notifications/unread-count'),
  markRead:       (id: number)                                                       => apiPost<void>(`/notifications/${id}/read`),
  markAllRead:    ()                                                                 => apiPost<void>('/notifications/read-all'),
  delete:         (id: number)                                                       => apiDelete<void>(`/notifications/${id}`),
};

// ─── MARKETPLACE — /api/v1/marketplace/* ─────────────────────────────────────
export const marketplaceApi = {
  create:         (d: CreateMarketplaceItemRequest)                                  => apiPost<MarketplaceItemResponse>('/marketplace', d),
  get:            (id: number)                                                       => apiGet<MarketplaceItemResponse>(`/marketplace/${id}`),
  update:         (id: number, d: CreateMarketplaceItemRequest)                      => apiPut<MarketplaceItemResponse>(`/marketplace/${id}`, d),
  delete:         (id: number)                                                       => apiDelete<void>(`/marketplace/${id}`),
  markSold:       (id: number)                                                       => apiPatch<void>(`/marketplace/${id}/sold`),
  nearby:         (lat: number, lon: number, radius = 10000, category?: string, minPrice?: number, maxPrice?: number, page = 0, size = 20) =>
    apiGet<PageResponse<MarketplaceItemResponse>>('/marketplace/nearby', { latitude: lat, longitude: lon, radiusMeters: radius, category, minPrice, maxPrice, page, size }),
  mine:           (page = 0, size = 20)                                              => apiGet<PageResponse<MarketplaceItemResponse>>('/marketplace/my', { page, size }),
  search:         (query: string, page = 0, size = 20)                              => apiGet<PageResponse<MarketplaceItemResponse>>('/marketplace/search', { query, page, size }),
};

// ─── SAFETY ALERTS — /api/v1/safety-alerts/* ─────────────────────────────────
export const safetyApi = {
  create:         (d: CreateSafetyAlertRequest)                                      => apiPost<SafetyAlertResponse>('/safety-alerts', d),
  get:            (id: number)                                                       => apiGet<SafetyAlertResponse>(`/safety-alerts/${id}`),
  byNeighborhood: (neighborhoodId: number, page = 0, size = 20)                     => apiGet<PageResponse<SafetyAlertResponse>>(`/safety-alerts/neighborhood/${neighborhoodId}`, { page, size }),
  nearby:         (lat: number, lon: number, radius = 5000, page = 0, size = 20)    => apiGet<PageResponse<SafetyAlertResponse>>('/safety-alerts/nearby', { latitude: lat, longitude: lon, radiusMeters: radius, page, size }),
  resolve:        (id: number)                                                       => apiPost<void>(`/safety-alerts/${id}/resolve`),
  verify:         (id: number)                                                       => apiPost<void>(`/safety-alerts/${id}/verify`),
};

// ─── SEARCH — /api/v1/search/* ───────────────────────────────────────────────
export const searchApi = {
  global:         (query: string, page = 0, size = 10)                              => apiGet<SearchResultDTO>('/search', { query, page, size }),
  suggest:        (q: string)                                                        => apiGet<string[]>('/search/suggest', { q }),
  trending:       ()                                                                 => apiGet<string[]>('/search/trending'),
  history:        (page = 0, size = 20)                                             => apiGet<PageResponse<string>>('/search/history', { page, size }),
  clearHistory:   ()                                                                 => apiDelete<void>('/search/history'),
  users:          (query: string, page = 0, size = 20)                              => apiGet<PageResponse<UserSummaryDTO>>('/search/users', { query, page, size }),
  posts:          (query: string, page = 0, size = 20)                              => apiGet<PageResponse<PostResponse>>('/search/posts', { query, page, size }),
  activities:     (query: string, page = 0, size = 20)                              => apiGet<PageResponse<ActivityResponse>>('/search/activities', { query, page, size }),
  communities:    (query: string, page = 0, size = 20)                              => apiGet<PageResponse<CommunityResponse>>('/search/communities', { query, page, size }),
  marketplace:    (query: string, page = 0, size = 20)                              => apiGet<PageResponse<MarketplaceItemResponse>>('/search/marketplace', { query, page, size }),
};

// ─── MEDIA — /api/v1/media/* ─────────────────────────────────────────────────
export const mediaApi = {
  upload: (file: File, entityType: string, entityId?: number) => {
    const form = new FormData();
    form.append('file', file);
    form.append('entityType', entityType);
    if (entityId) form.append('entityId', String(entityId));
    return apiUpload<MediaFileResponse>('/media/upload', form);
  },
  getForEntity: (entityType: string, entityId: number) => apiGet<MediaFileResponse[]>(`/media/entity/${entityType}/${entityId}`),
  delete:       (mediaId: number) => apiDelete<void>(`/media/${mediaId}`),
};

// ─── BORROW REQUESTS — /api/v1/borrow-requests/* ─────────────────────────────
export const borrowApi = {
  create:         (d: CreateBorrowRequest)                                           => apiPost<BorrowRequestResponse>('/borrow-requests', d),
  get:            (id: number)                                                       => apiGet<BorrowRequestResponse>(`/borrow-requests/${id}`),
  byNeighborhood: (neighborhoodId: number, status?: string, page = 0, size = 20)    => apiGet<PageResponse<BorrowRequestResponse>>(`/borrow-requests/neighborhood/${neighborhoodId}`, { status, page, size }),
  mine:           (page = 0, size = 20)                                              => apiGet<PageResponse<BorrowRequestResponse>>('/borrow-requests/my', { page, size }),
  respond:        (id: number)                                                       => apiPost<BorrowRequestResponse>(`/borrow-requests/${id}/respond`),
  close:          (id: number)                                                       => apiPost<void>(`/borrow-requests/${id}/close`),
  delete:         (id: number)                                                       => apiDelete<void>(`/borrow-requests/${id}`),
};

// ─── STORIES — /api/v1/stories/* ─────────────────────────────────────────────
export const storiesApi = {
  create:     (d: CreateStoryRequest)  => apiPost<StoryResponse>('/stories', d),
  getMyStories: ()                     => apiGet<StoryResponse[]>('/stories/me'),
  getFeed:    ()                       => apiGet<StoryResponse[]>('/stories/feed'),
  getUser:    (userId: number)         => apiGet<StoryResponse[]>(`/stories/user/${userId}`),
  markViewed: (storyId: number)        => apiPost<void>(`/stories/${storyId}/view`),
  delete:     (storyId: number)        => apiDelete<void>(`/stories/${storyId}`),
};

// ─── RECOMMENDATIONS — /api/v1/recommendations/* ─────────────────────────────
export const recommendationsApi = {
  posts:          (page = 0, size = 20) => apiGet<PageResponse<PostResponse>>('/recommendations/posts', { page, size }),
  activities:     (page = 0, size = 20) => apiGet<PageResponse<ActivityResponse>>('/recommendations/activities', { page, size }),
  communities:    (page = 0, size = 20) => apiGet<PageResponse<CommunityResponse>>('/recommendations/communities', { page, size }),
  users:          (page = 0, size = 20) => apiGet<PageResponse<UserSummaryDTO>>('/recommendations/users', { page, size }),
};
