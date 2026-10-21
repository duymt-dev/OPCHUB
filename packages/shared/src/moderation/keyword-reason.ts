import type { Report } from '../api-domains/chat';

export const KEYWORD_REASON: Readonly<Record<string, Report['reason']>> = {
  'chuyển khoản trước': 'scam',
  'vay nóng': 'scam',
  'kiếm tiền nhanh': 'scam',
  'bán tài khoản': 'spam',
  'số cccd': 'personal_info',
  'mật khẩu': 'personal_info',
  'đồ ngu': 'abuse',
};
