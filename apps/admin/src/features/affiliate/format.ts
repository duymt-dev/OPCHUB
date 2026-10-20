const money = new Intl.NumberFormat('vi-VN');
const date = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Asia/Ho_Chi_Minh',
});
export const affiliateMoney = (amount: number) => `${money.format(amount)}đ`;
export const affiliateDate = (value: string | null) => (value ? date.format(new Date(value)) : '—');

const historyDate = new Intl.DateTimeFormat('vi-VN', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  timeZone: 'Asia/Ho_Chi_Minh',
});
export const affiliateHistoryDate = (value: string | null) =>
  value ? historyDate.format(new Date(value)) : '—';
