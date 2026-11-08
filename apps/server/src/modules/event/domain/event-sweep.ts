/**
 * NA-23 / EV-R02 — hàm thuần cho scheduler 15 phút và khối "Sắp diễn ra" (test ở event-sweep.spec).
 * Ngày tính theo lịch Asia/Ho_Chi_Minh (luật 9).
 */
const VN_OFFSET_MS = 7 * 3_600_000;
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

/** Nhắc trước 24 giờ */
export const REMIND_BEFORE_MS = 24 * HOUR_MS;
export const REMIND_1H_MS = HOUR_MS;
/** Thiếu giờ kết thúc → coi như kéo dài 2 giờ (ẩn khỏi "Sắp tới" sau mốc này) */
export const DEFAULT_DURATION_MS = 2 * HOUR_MS;

const vnDayIndex = (d: Date) => Math.floor((d.getTime() + VN_OFFSET_MS) / DAY_MS);

/** 0 = Hôm nay, 1 = Ngày mai, N = "Còn N ngày" */
export const inDaysVn = (startsAt: Date, now: Date): number =>
  vnDayIndex(startsAt) - vnDayIndex(now);

/** Đầu ngày VN hôm nay (UTC) — mốc dưới của khối Sắp diễn ra */
export const vnStartOfDay = (now: Date): Date => new Date(vnDayIndex(now) * DAY_MS - VN_OFFSET_MS);

/** Sự kiện trong cửa sổ nhắc: bắt đầu sau `now` và không quá 24 giờ nữa */
export const inRemindWindow = (startsAt: Date, now: Date): boolean =>
  startsAt.getTime() > now.getTime() && startsAt.getTime() <= now.getTime() + REMIND_BEFORE_MS;

/** Mốc "Đã diễn ra": giờ kết thúc, hoặc bắt đầu + 2 giờ */
export const endedAt = (startsAt: Date, endsAt: Date | null): Date =>
  endsAt ?? new Date(startsAt.getTime() + DEFAULT_DURATION_MS);
