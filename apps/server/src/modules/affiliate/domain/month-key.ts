/** D-53: tháng đối soát theo giờ Việt Nam (UTC+7, không DST) — `YYYY-MM` */
const VN_OFFSET_MS = 7 * 3_600_000;

export function monthKey(at: Date): string {
  const d = new Date(at.getTime() + VN_OFFSET_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Ngày VN dưới dạng Date UTC 00:00 — cột `date` của lượt nhấp */
export function vnDay(at: Date): Date {
  const d = new Date(at.getTime() + VN_OFFSET_MS);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Tháng đã kết thúc (giờ VN) — chỉ chi trả tháng < tháng hiện tại */
export const isPastMonth = (key: string, now: Date): boolean => key < monthKey(now);
