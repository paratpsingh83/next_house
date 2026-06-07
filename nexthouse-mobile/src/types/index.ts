// src/types/index.ts — mirrors every backend DTO exactly

// ─── Common ───────────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthResponse {
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  user?: UserResponse;
  twoFactorRequired?: boolean;
  twoFactorToken?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface LoginRequest {
  identifier: string;
  password: string;
  deviceId?: string;
  deviceType?: string;
  deviceToken?: string;
}

export interface RegisterRequest {
  name: string;
  username: string;
  phoneNumber: string;
  email?: string;
  password: string;
  latitude?: number;
  longitude?: number;
  deviceId?: string;
  deviceType?: string;
  deviceToken?: string;
}

export interface OtpRequest {
  phone?: string;
  email?: string;
  purpose: string;
}

export interface OtpVerifyRequest {
  phone?: string;
  email?: string;
  otp: string;
  purpose: string;
}

export interface ForgotPasswordRequest {
  email?: string;
  phone?: string;
}

export interface ResetPasswordRequest {
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
  deviceId?: string;
}

// ─── User ─────────────────────────────────────────────────────────────────────
export interface UserResponse {
  id: number;
  name: string;
  username: string;
  phoneNumber?: string;
  profileImage?: string;
  bio?: string;
  gender?: string;
  dob?: string;
  address?: string;
  verificationStatus: string;
  accountStatus: string;
  trustScore: number;
  addressVerified: boolean;
  identityVerified: boolean;
  online?: boolean;
  lastSeen?: string;
  followerCount?: number;
  followingCount?: number;
  isPrivate?: boolean;
  isFollowing?: boolean;
  isFollowedBy?: boolean;
  isBlocked?: boolean;
  isRequested?: boolean;
  createdAt: string;
}

export interface UserSummaryDTO {
  id: number;
  name: string;
  username: string;
  profileImage?: string;
  trustScore?: number;
  online?: boolean;
  addressVerified?: boolean;
  identityVerified?: boolean;
  isPrivate?: boolean;
  isFollowing?: boolean;
  isRequested?: boolean;
}

export interface FollowRequestItem {
  requestId: number;
  requester: UserSummaryDTO;
  requestedAt?: string;
}

export interface NearbyUserResponse {
  user: UserSummaryDTO;
  distanceMeters: number;
}

export interface UpdateProfileRequest {
  name?: string;
  bio?: string;
  gender?: string;
  dob?: string;
  profileImage?: string;
  isPrivate?: boolean;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}

export interface UpdateLocationRequest {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

// ─── Stories ──────────────────────────────────────────────────────────────────
export type StoryMediaType = 'IMAGE' | 'VIDEO' | 'TEXT';

export interface StoryResponse {
  id: number;
  author: UserSummaryDTO;
  mediaUrl?: string;
  mediaType: StoryMediaType;
  textContent?: string;
  backgroundColor?: string;
  expiresAt: string;
  createdAt: string;
  viewCount: number;
  viewedByMe: boolean;
  isOwn: boolean;
}

export interface CreateStoryRequest {
  mediaUrl?: string;
  mediaType: StoryMediaType;
  textContent?: string;
  backgroundColor?: string;
}

// ─── Post ─────────────────────────────────────────────────────────────────────
export type PostType = 'NEWS' | 'HELP' | 'MARKETPLACE' | 'SAFETY' | 'EVENT' | 'RECOMMENDATION' | 'GENERAL';

export interface PostResponse {
  id: number;
  postType: PostType;
  content?: string;
  status: string;
  visibilityRadius?: number;
  anonymous: boolean;
  edited: boolean;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  hashtagString?: string;
  thumbnailUrl?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  createdBy?: UserSummaryDTO;
  community?: CommunitySummaryDTO;
  neighborhood?: NeighborhoodSummaryDTO;
  media?: MediaFileResponse[];
  reactions?: ReactionSummaryDTO[];
  isLiked?: boolean;
  isSaved?: boolean;
  myReactionType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReactionSummaryDTO {
  reactionType: string;
  count: number;
}

export interface PostCommentResponse {
  id: number;
  comment: string;
  likeCount: number;
  edited: boolean;
  isLiked?: boolean;
  commentedBy: UserSummaryDTO;
  replies?: PostCommentResponse[];
  replyCount?: number;
  parentCommentId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostRequest {
  postType: string;
  content: string;
  communityId?: number;
  neighborhoodId?: number;
  visibilityRadius?: number;
  anonymous?: boolean;
  mediaIds?: number[];
  hashtags?: string[];
  latitude?: number;
  longitude?: number;
  address?: string;
}

export interface UpdatePostRequest {
  content: string;
  hashtags?: string[];
  visibilityRadius?: number;
}

export interface CreateCommentRequest {
  comment: string;
  parentCommentId?: number;
}

export interface ReactPostRequest {
  reactionType: string;
}

// ─── Activity ─────────────────────────────────────────────────────────────────
export type ActivityType = 'SOCIAL' | 'SPORTS' | 'LEARNING' | 'VOLUNTEERING' | 'FOOD' | 'ARTS' | 'OUTDOOR' | 'NEIGHBORHOOD_WATCH' | 'OTHER';

export interface ActivityResponse {
  id: number;
  title: string;
  description?: string;
  activityType: ActivityType;
  status: string;
  activityTime: string;
  endTime?: string;
  maxMembers?: number;
  currentMemberCount: number;
  privateActivity: boolean;
  approvalRequired: boolean;
  coverImage?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  hostUser: UserSummaryDTO;
  community?: CommunitySummaryDTO;
  neighborhood?: NeighborhoodSummaryDTO;
  myJoinStatus: string;
  isHost: boolean;
  createdAt: string;
}

export interface ActivityMemberResponse {
  id: number;
  joinStatus: string;
  role: string;
  joinedAt?: string;
  user: UserSummaryDTO;
}

export interface CreateActivityRequest {
  title: string;
  description?: string;
  activityType: ActivityType;
  activityTime: string;
  endTime?: string;
  maxMembers?: number;
  privateActivity?: boolean;
  approvalRequired?: boolean;
  communityId?: number;
  neighborhoodId?: number;
  latitude: number;
  longitude: number;
  address?: string;
  coverImage?: string;
}

// ─── Community ────────────────────────────────────────────────────────────────
export interface CommunityResponse {
  id: number;
  name: string;
  description?: string;
  communityType?: string;
  coverImage?: string;
  iconImage?: string;
  privateCommunity: boolean;
  verified: boolean;
  memberCount: number;
  createdBy: UserSummaryDTO;
  neighborhood?: NeighborhoodSummaryDTO;
  parentCommunity?: CommunitySummaryDTO;
  myRole?: string;
  isMember: boolean;
  isPending: boolean;
  createdAt: string;
}

export interface CommunitySummaryDTO {
  id: number;
  name: string;
  iconImage?: string;
  communityType?: string;
}

export interface CreateCommunityRequest {
  name: string;
  description?: string;
  communityType: string;
  privateCommunity?: boolean;
  neighborhoodId?: number;
  parentCommunityId?: number;
  coverImage?: string;
  iconImage?: string;
}

// ─── Neighborhood ─────────────────────────────────────────────────────────────
export interface NeighborhoodSummaryDTO {
  id: number;
  name: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export interface ChatRoomResponse {
  id: number;
  roomType: string;
  title?: string;
  avatarUrl?: string;
  lastMessagePreview?: string;
  lastMessageSenderName?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  myRole?: string;
  members?: UserSummaryDTO[];
  memberCount?: number;
  createdAt: string;
}

export interface ChatMessageResponse {
  id: number;
  messageType: string;
  message?: string;
  mediaUrl?: string;
  isDeleted: boolean;
  isUnsent?: boolean;
  editedAt?: string;
  sender: UserSummaryDTO;
  replyToMessageId?: number;
  replyToPreview?: string;
  createdAt: string;
}

export interface SendMessageRequest {
  messageType?: string;
  message?: string;
  replyToMessageId?: number;
  mediaUrl?: string;
  mediaFileId?: number;
}

export interface CreateChatRoomRequest {
  roomType: string;
  title?: string;
  avatarUrl?: string;
  memberIds: number[];
}

// ─── Notification ─────────────────────────────────────────────────────────────
export interface NotificationResponse {
  id: number;
  title: string;
  message?: string;
  notificationType: string;
  referenceType?: string;
  referenceId?: number;
  read: boolean;
  redirectUrl?: string;
  sender?: UserSummaryDTO;
  createdAt: string;
}

// ─── Marketplace ──────────────────────────────────────────────────────────────
export interface MarketplaceItemResponse {
  id: number;
  title: string;
  description?: string;
  category?: string;
  price?: number;
  conditionType?: string;
  negotiable: boolean;
  available: boolean;
  featured: boolean;
  status: string;
  thumbnailUrl?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  seller: UserSummaryDTO;
  community?: CommunitySummaryDTO;
  neighborhood?: NeighborhoodSummaryDTO;
  media?: MediaFileResponse[];
  createdAt: string;
}

export interface CreateMarketplaceItemRequest {
  title: string;
  description?: string;
  category: string;
  price?: number;
  conditionType?: string;
  negotiable?: boolean;
  communityId?: number;
  neighborhoodId?: number;
  latitude: number;
  longitude: number;
  address?: string;
  mediaIds?: number[];
}

// ─── Safety Alert ─────────────────────────────────────────────────────────────
export interface SafetyAlertResponse {
  id: number;
  title: string;
  description?: string;
  alertType?: string;
  severity: string;
  emergency: boolean;
  verified: boolean;
  latitude?: number;
  longitude?: number;
  address?: string;
  resolvedAt?: string;
  reportedBy: UserSummaryDTO;
  resolvedBy?: UserSummaryDTO;
  neighborhood?: NeighborhoodSummaryDTO;
  createdAt: string;
}

export interface CreateSafetyAlertRequest {
  title: string;
  description?: string;
  alertType?: string;
  severity: string;
  emergency?: boolean;
  communityId?: number;
  neighborhoodId?: number;
  latitude?: number;
  longitude?: number;
  address?: string;
}

// ─── Search ───────────────────────────────────────────────────────────────────
export interface SearchResultDTO {
  users?: PageResponse<UserSummaryDTO>;
  posts?: PageResponse<PostResponse>;
  activities?: PageResponse<ActivityResponse>;
  communities?: PageResponse<CommunityResponse>;
  marketplaceItems?: PageResponse<MarketplaceItemResponse>;
}

// ─── Media ────────────────────────────────────────────────────────────────────
export interface MediaFileResponse {
  id: number;
  url: string;
  thumbnailUrl?: string;
  type: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  createdAt: string;
}

// ─── Borrow Request ───────────────────────────────────────────────────────────
export interface BorrowRequestResponse {
  id: number;
  title: string;
  description?: string;
  requiredDuration?: string;
  status: string;
  requester: UserSummaryDTO;
  respondedBy?: UserSummaryDTO;
  neighborhood?: NeighborhoodSummaryDTO;
  createdAt: string;
}

export interface CreateBorrowRequest {
  title: string;
  description?: string;
  requiredDuration?: string;
  communityId?: number;
  neighborhoodId?: number;
}

// ─── OAuth2 ───────────────────────────────────────────────────────────────────
export interface OAuth2LoginRequest {
  provider: string;
  idToken: string;
  deviceId?: string;
  deviceType?: string;
  deviceToken?: string;
}

// ─── Report ───────────────────────────────────────────────────────────────────
export interface CreateReportRequest {
  reason: string;
  description?: string;
}
