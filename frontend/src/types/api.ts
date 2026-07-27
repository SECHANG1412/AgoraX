export type ISODateTimeString = string;

export type Id = number;

export type InquiryStatus = 'pending' | 'in_progress' | 'resolved';

export type HiddenContentType = 'topic' | 'comment';

export type AdminTargetType = 'Topic' | 'Comment' | 'Inquiry' | string;

export type AdminAction =
  | 'UPDATE_INQUIRY_STATUS'
  | 'DELETE_TOPIC'
  | 'DELETE_COMMENT'
  | 'DELETE_INQUIRY'
  | string;

export type TopicBase = {
  title: string;
  category: string;
  vote_options: string[];
  description: string | null;
};

export type TopicCreateRequest = TopicBase & {
  expires_at: ISODateTimeString;
};

export type TopicRead = TopicBase & {
  topic_id: Id;
  created_at: ISODateTimeString;
  expires_at: ISODateTimeString | null;
  user_id: Id;
  author_name: string | null;
  has_voted: boolean;
  user_vote_index: number | null;
  vote_results: number[];
  total_vote: number;
  like_count: number;
  has_liked: boolean;
  is_pinned: boolean;
  comment_count: number;
  is_closed: boolean;
};

export type TopicAdminRead = TopicBase & {
  topic_id: Id;
  created_at: ISODateTimeString;
  expires_at: ISODateTimeString | null;
  user_id: Id;
  is_hidden: boolean;
  hidden_at: ISODateTimeString | null;
  hidden_by: Id | null;
  is_closed: boolean;
};

export type TopicModerationRequest = {
  reason: string;
};

export type TopicPinResponse = boolean;

export type TopicUnpinResponse = boolean;

export type TopicDeleteResponse = boolean;

export type TopicCountResponse = number;

export type UserRead = {
  user_id: Id;
  email: string;
  username: string;
  is_admin: boolean;
  created_at: ISODateTimeString;
};

export type AdminMeResponse = {
  user_id: Id;
  is_admin: boolean;
};

export type AdminDeleteResponse = {
  deleted: boolean;
};

export type UserLoginRequest = {
  email: string;
  password: string;
};

export type UserLogoutResponse = boolean;

export type UserSignupRequest = {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
};

export type UserSignupPayload = Omit<UserSignupRequest, 'confirmPassword'>;

export type UserUpdateRequest = {
  email?: string | null;
  username?: string | null;
  password?: string | null;
};

export type UserStats = {
  topics: number;
  votes: number;
  likes: number;
};

export type UserActivity = {
  topic_id: Id;
  type: string;
  title: string;
  created_at: ISODateTimeString;
};

export type UserHiddenContent = {
  type: HiddenContentType;
  item_id: Id;
  topic_id: Id;
  title: string;
  content: string | null;
  hidden_at: ISODateTimeString | null;
};

export type ReplyBase = {
  comment_id: Id;
  content: string;
  parent_reply_id: Id | null;
};

export type ReplyCreateRequest = ReplyBase;

export type ReplyUpdateRequest = {
  content: string;
};

export type ReplyRead = ReplyBase & {
  reply_id: Id;
  user_id: Id;
  created_at: ISODateTimeString;
  username: string;
  like_count: number;
  has_liked: boolean;
  replies: ReplyRead[];
};

export type CommentBase = {
  topic_id: Id;
  content: string;
};

export type CommentCreateRequest = CommentBase;

export type CommentUpdateRequest = {
  content: string;
};

export type CommentRead = CommentBase & {
  comment_id: Id;
  user_id: Id;
  is_deleted: boolean;
  created_at: ISODateTimeString;
  username: string;
  replies: ReplyRead[];
  like_count: number;
  has_liked: boolean;
};

export type CommentAdminRead = CommentBase & {
  comment_id: Id;
  user_id: Id;
  is_deleted: boolean;
  created_at: ISODateTimeString;
  is_hidden: boolean;
  hidden_at: ISODateTimeString | null;
  hidden_by: Id | null;
};

export type CommentModerationRequest = {
  reason: string;
};

export type TopicLikeToggleResponse = boolean;

export type CommentLikeToggleResponse = boolean;

export type ReplyLikeToggleResponse = boolean;

export type VoteCreateRequest = {
  topic_id: Id;
  vote_index: number;
};

export type VoteRead = VoteCreateRequest & {
  vote_id: Id;
  user_id: Id;
  created_at: ISODateTimeString;
};

export type VoteStatsValue = {
  count: number;
  percent: number;
};

export type VoteStatsResponse = Record<string, Record<string, VoteStatsValue>>;

export type VoteChartPoint = {
  timestamp: ISODateTimeString;
  label: string;
} & Record<`count_${number}` | `percent_${number}`, number>;

export type InquiryCreateRequest = {
  title: string;
  content: string;
};

export type InquiryRead = {
  inquiry_id: Id;
  user_id: Id | null;
  name: string;
  email: string;
  title: string;
  content: string;
  status: InquiryStatus;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
};

export type MyInquiryRead = InquiryRead & {
  latest_reason: string | null;
};

export type InquiryStatusUpdateRequest = {
  status: InquiryStatus;
  reason: string;
};

export type InquiryDeleteRequest = {
  reason?: string | null;
};

export type AdminActionLogRead = {
  log_id: Id;
  admin_user_id: Id;
  action: AdminAction;
  target_type: AdminTargetType;
  target_id: Id;
  before_value: Record<string, unknown>;
  after_value: Record<string, unknown>;
  reason: string;
  created_at: ISODateTimeString;
};

export type NotificationType =
  | 'topic_comment'
  | 'comment_reply'
  | 'reply_reply'
  | 'topic_like'
  | 'comment_like'
  | 'reply_like'
  | 'inquiry_status'
  | 'content_moderation'
  | 'topic_closed_author'
  | 'topic_closed_voter'
  | 'topic_closed_pinned'
  | string;

export type NotificationRead = {
  notification_id: Id;
  user_id: Id;
  type: NotificationType;
  actor_user_id: Id | null;
  target_type: string;
  target_id: Id;
  topic_id: Id | null;
  message: string;
  link: string;
  is_read: boolean;
  created_at: ISODateTimeString;
};

export type NotificationUnreadCount = {
  count: number;
};

export type NotificationReadAllResponse = {
  updated_count: number;
};

export type TopicListParams = {
  sort?: string;
  status?: 'active' | 'closed' | 'all' | 'voted';
  limit?: number;
  offset?: number;
  category?: string;
  search?: string;
};

export type AdminDateRangeParams = {
  start_at?: ISODateTimeString;
  end_at?: ISODateTimeString;
};

export type AdminInquiryListParams = AdminDateRangeParams & {
  status?: InquiryStatus;
};

export type AdminContentListParams = AdminDateRangeParams;

export type AdminActionLogListParams = AdminDateRangeParams & {
  limit?: number;
  action?: AdminAction;
  target_type?: AdminTargetType;
  admin_user_id?: string;
};

export type ReportTargetType = 'topic' | 'comment' | 'reply';

export type ReportReason =
  | 'abuse'
  | 'hate'
  | 'sexual'
  | 'spam'
  | 'privacy'
  | 'misinformation'
  | 'other';

export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export type ReportCreateRequest = {
  target_type: ReportTargetType;
  target_id: Id;
  reason: ReportReason;
  detail: string | null;
};

export type ReportRead = ReportCreateRequest & {
  report_id: Id;
  reporter_user_id: Id;
  status: ReportStatus;
  handled_by: Id | null;
  handled_at: ISODateTimeString | null;
  resolution: string | null;
  created_at: ISODateTimeString;
};

export type ReportTargetSnapshot = {
  author_id: Id;
  author_name: string | null;
  title: string;
  content: string | null;
  topic_id: Id;
  comment_id?: Id;
  created_at: ISODateTimeString;
};

export type ReportAdminRead = ReportRead & {
  target_snapshot: ReportTargetSnapshot;
  reporter_name: string;
  report_count: number;
};

export type ReportResolutionRequest = {
  resolution: string;
};
