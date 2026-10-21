/** Shared by normal live counters and atomic persona publication; no duplicate key scheme. */
export const FEED = 'dashboard:feed';
export const MSG_MIN = 'dashboard:msgs:min';
export const JOIN_MIN = 'dashboard:joins:min';
export const dayKey = (day: string) => `dashboard:msgs:day:${day}`;
export const WINDOW_MS = 60_000;
export const DAY_TTL_SEC = 2 * 86_400;
const VN_OFFSET_MS = 7 * 3_600_000;

export const vnDay = (at: Date) => new Date(at.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
