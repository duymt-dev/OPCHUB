/**
 * Mốc nhắc phí tự động (NA-04, D-57): T-30, T-7, T-0, T+3 theo ngày lịch Asia/Ho_Chi_Minh.
 * Mỗi lượt job chọn mốc MUỘN NHẤT đã tới mà chưa gửi — job lỡ ngày vẫn bù, không gửi dồn.
 */
export const FEE_REMINDER_MILESTONES = ['T-30', 'T-7', 'T-0', 'T+3'] as const;
export type FeeReminderMilestone = (typeof FEE_REMINDER_MILESTONES)[number];

/** d = số ngày còn lại tới hạn; mốc tới khi d ≤ ngưỡng */
const THRESHOLD: Record<FeeReminderMilestone, number> = {
  'T-30': 30,
  'T-7': 7,
  'T-0': 0,
  'T+3': -3,
};
/** Quá hạn hơn 10 ngày thì thôi nhắc tự động */
export const REMIND_STOP_DAYS = 10;
/** Cửa sổ ứng viên (ngày) quanh `now` để lọc trên DB */
export const REMIND_LOOKAHEAD_DAYS = 31;

const VN_OFFSET_MS = 7 * 3_600_000;
const DAY_MS = 86_400_000;
const vnDayIndex = (d: Date) => Math.floor((d.getTime() + VN_OFFSET_MS) / DAY_MS);

/** Chênh ngày lịch VN giữa hạn và hôm nay (âm khi đã quá hạn) */
export const daysLeft = (validUntil: Date, now: Date): number =>
  vnDayIndex(validUntil) - vnDayIndex(now);

/** D-113: miễn phí 3 tháng chỉ nhắc T-7 và ngày hết */
export const TRIAL_REMINDER_MILESTONES: readonly FeeReminderMilestone[] = ['T-7', 'T-0'];

export function dueMilestone(
  validUntil: Date,
  now: Date,
  sent: ReadonlySet<string> = new Set(),
  trial = false,
): FeeReminderMilestone | null {
  const d = daysLeft(validUntil, now);
  if (d < -REMIND_STOP_DAYS) return null;
  // Trial đã qua ngày hết: không bù mốc (câu T-0 "hôm nay là ngày cuối" sẽ sai); popup bắt buộc thay nhắc
  if (trial && d < 0) return null;
  const list = trial ? TRIAL_REMINDER_MILESTONES : FEE_REMINDER_MILESTONES;
  for (const m of [...list].reverse()) {
    if (d > THRESHOLD[m]) continue;
    return sent.has(m) ? null : m;
  }
  return null;
}
