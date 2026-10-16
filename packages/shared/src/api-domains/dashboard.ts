import { z } from 'zod';

/**
 * Dashboard Portal (P-01 → P-06): ảnh chụp "LIVE hoạt động cộng đồng".
 * Bổ sung SRS §13: `GET /dashboard/live` (REST, làm mới định kỳ; realtime đẩy qua socket sau).
 */

export const LIVE_STATUSES = ['chat', 'online', 'event', 'off'] as const;
export type LiveStatus = (typeof LIVE_STATUSES)[number];

export const LIVE_ACTIVITY_KINDS = ['msg', 'join', 'event', 'login'] as const;
export const LIVE_SESSION_STATES = ['done', 'live', 'next'] as const;

const toneSchema = z.object({ bg: z.string(), fg: z.string() });

export const liveMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Tên doanh nghiệp; cá nhân → "Freelancer" */
  org: z.string(),
  title: z.string(),
  countryCode: z.string(),
  avatarUrl: z.string().nullable(),
  status: z.enum(LIVE_STATUSES),
  /** Phòng gần nhất (dùng khi đang chat) */
  roomName: z.string(),
  lastActiveAt: z.string(),
  /** Điểm hoạt động so với người cao nhất, 0–100 */
  scorePct: z.number().int().min(0).max(100),
});
export type LiveMember = z.infer<typeof liveMemberSchema>;

export const liveActivitySchema = z.object({
  id: z.string(),
  memberName: z.string(),
  avatarUrl: z.string().nullable(),
  kind: z.enum(LIVE_ACTIVITY_KINDS),
  /** Cộng đồng / sự kiện; rỗng khi kind = login */
  target: z.string(),
  at: z.string(),
});
export type LiveActivity = z.infer<typeof liveActivitySchema>;

export const liveCountrySchema = z.object({
  code: z.string(),
  name: z.string(),
  flagUrl: z.string(),
  total: z.number().int(),
  provinces: z.array(z.object({ name: z.string(), count: z.number().int() })),
});
export type LiveCountry = z.infer<typeof liveCountrySchema>;

export const liveMessageSchema = z.object({
  id: z.string(),
  memberName: z.string(),
  avatarUrl: z.string().nullable(),
  roomName: z.string(),
  tone: toneSchema,
  body: z.string(),
  at: z.string(),
});
export type LiveMessage = z.infer<typeof liveMessageSchema>;

export const liveSessionSchema = z.object({
  name: z.string(),
  time: z.string(),
  state: z.enum(LIVE_SESSION_STATES),
  progressPct: z.number().min(0).max(100),
  attendees: z.number().int(),
});
export type LiveSession = z.infer<typeof liveSessionSchema>;

export const liveThreadSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  groupNames: z.array(z.string()),
  at: z.string(),
  author: z.object({ name: z.string(), role: z.string(), color: z.string() }),
  body: z.string(),
  reply: z.object({ name: z.string(), body: z.string() }).nullable(),
  replyCount: z.number().int(),
});
export type LiveThread = z.infer<typeof liveThreadSchema>;

export const dashboardLiveSchema = z.object({
  /** Thời điểm chụp số liệu — mốc tính "x giây trước" */
  generatedAt: z.string(),
  communityCount: z.number().int(),
  countryCount: z.number().int(),
  stats: z.object({
    online: z.number().int(),
    totalMembers: z.number().int(),
    joinsLastMinute: z.number().int(),
    messagesToday: z.number().int(),
    messagesLastMinute: z.number().int(),
    eventJoins: z.number().int(),
  }),
  members: z.array(liveMemberSchema),
  activities: z.array(liveActivitySchema),
  countries: z.array(liveCountrySchema),
  messages: z.array(liveMessageSchema),
  sessions: z.array(liveSessionSchema),
  threads: z.array(liveThreadSchema),
});
export type DashboardLive = z.infer<typeof dashboardLiveSchema>;
