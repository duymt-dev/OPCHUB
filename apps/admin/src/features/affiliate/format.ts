import { formatCurrency, formatDate } from '@/i18n/format';

export const affiliateMoney = (amount: number, locale = 'vi') =>
  formatCurrency(amount, 'VND', locale);
export const affiliateDate = (value: string | null, locale = 'vi') => formatDate(value, locale);
export const affiliateHistoryDate = (value: string | null, locale = 'vi') =>
  formatDate(value, locale, { day: 'numeric', month: 'numeric', year: 'numeric' });

/** Số tài khoản hiển thị theo nhóm 4 chữ số như prototype v4 ("2468 1357"); dữ liệu gốc không đổi */
export const affiliateBankNo = (no: string) => no.replace(/(\d{4})(?=\d)/g, '$1 ');
