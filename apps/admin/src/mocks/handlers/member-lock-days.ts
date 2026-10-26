/** V4-612: khoá có hạn (Admin chọn 1/3/7/14/30 ngày) → mốc ms; không gửi = không thời hạn */
export const addDays = (days: number | undefined): number | null =>
  days ? Date.now() + days * 86_400_000 : null;
