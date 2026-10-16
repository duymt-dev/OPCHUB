/** Seed của khối "LIVE hoạt động cộng đồng" (prototype `dash()` + `initDyn()`), số ở trạng thái đầu */

/** Trạng thái ban đầu của 26 thành viên (D_MPAT) */
export const LIVE_STATUS_PATTERN = [
  'chat',
  'online',
  'chat',
  'event',
  'online',
  'chat',
  'off',
  'online',
  'chat',
  'online',
  'chat',
  'event',
  'online',
  'chat',
  'off',
  'online',
  'chat',
  'event',
  'online',
  'chat',
  'off',
  'online',
  'chat',
  'online',
  'event',
  'chat',
] as const;

/** Tổng thành viên theo quốc gia */
export const LIVE_COUNTRY_TOTALS: Record<string, number> = {
  VN: 1824,
  TH: 612,
  ID: 540,
  MY: 388,
  PH: 356,
  SG: 248,
  MM: 96,
  KH: 84,
  LA: 41,
  BN: 29,
};

/** Tỉ trọng tỉnh/thành trong mỗi quốc gia */
export const LIVE_PROVINCE_WEIGHTS: Record<string, [string, number][]> = {
  VN: [
    ['TP. Hồ Chí Minh', 31],
    ['Hà Nội', 27],
    ['Đà Nẵng', 8],
    ['Hải Phòng', 5],
    ['Cần Thơ', 4],
    ['Bình Dương', 4],
    ['Đồng Nai', 3],
    ['Khánh Hòa', 3],
    ['Quảng Ninh', 2],
    ['Thừa Thiên Huế', 2],
    ['Lâm Đồng', 2],
    ['Nghệ An', 2],
    ['Khác', 7],
  ],
  TH: [
    ['Bangkok', 52],
    ['Chiang Mai', 14],
    ['Phuket', 9],
    ['Khon Kaen', 7],
    ['Chonburi', 6],
    ['Nonthaburi', 5],
    ['Khác', 7],
  ],
  ID: [
    ['DKI Jakarta', 38],
    ['Jawa Barat', 17],
    ['Bali', 12],
    ['Jawa Timur', 11],
    ['Banten', 8],
    ['Sumatera Utara', 6],
    ['Khác', 8],
  ],
  MY: [
    ['Kuala Lumpur', 36],
    ['Selangor', 24],
    ['Penang', 14],
    ['Johor', 11],
    ['Sabah', 6],
    ['Khác', 9],
  ],
  PH: [
    ['Metro Manila', 45],
    ['Cebu', 18],
    ['Davao', 12],
    ['Laguna', 8],
    ['Iloilo', 6],
    ['Khác', 11],
  ],
  SG: [
    ['Central Region', 48],
    ['East Region', 18],
    ['West Region', 15],
    ['North-East', 12],
    ['North Region', 7],
  ],
  MM: [
    ['Yangon', 58],
    ['Mandalay', 24],
    ['Naypyidaw', 10],
    ['Khác', 8],
  ],
  KH: [
    ['Phnom Penh', 62],
    ['Siem Reap', 18],
    ['Battambang', 9],
    ['Sihanoukville', 6],
    ['Khác', 5],
  ],
  LA: [
    ['Vientiane', 64],
    ['Luang Prabang', 16],
    ['Savannakhet', 12],
    ['Khác', 8],
  ],
  BN: [
    ['Brunei-Muara', 72],
    ['Belait', 16],
    ['Tutong', 8],
    ['Temburong', 4],
  ],
};

/** Tin nhắn mẫu trong luồng "Tin nhắn mới nhất" (D_TXT) */
export const LIVE_TEXTS = [
  'Có ai dùng thử công cụ AI viết proposal chưa? Chia sẻ mình với.',
  'Tối nay mình livestream chia sẻ cách tìm khách hàng đầu tiên nhé!',
  'Mẫu hợp đồng cộng tác viên mình vừa gửi trong mục file.',
  'Ai ở Hà Nội cuối tuần cà phê networking không?',
  'Cảm ơn mọi người, mình đã tìm được kế toán phù hợp rồi.',
  'Workshop hôm qua rất hay, slide có ở đâu ạ?',
  'Mình đang tìm đối tác thiết kế UI cho dự án mới.',
  'Kinh nghiệm quyết toán thuế cuối năm cho công ty TNHH MTV?',
  'Đã cập nhật landing page, mọi người góp ý giúp mình nhé.',
  'Ai có template báo cáo tài chính đơn giản không?',
  'Chào cả nhà, mình là thành viên mới từ Đà Nẵng!',
  'Nhóm mình có buổi review sản phẩm lúc 16h, mời mọi người tham gia.',
] as const;

export const LIVE_ACTIVITY_PATTERN = ['msg', 'join', 'event', 'login', 'msg', 'join'] as const;

/** Lịch trong ngày */
export const LIVE_SESSIONS = [
  ['Cà phê sáng: Founder chia sẻ', '08:30–09:30', 'done'],
  ['Workshop: Tự động hoá bán hàng bằng AI', '09:00–11:30', 'live'],
  ['AMA: Thuế cho công ty TNHH MTV', '14:00–15:00', 'next'],
  ['Review sản phẩm – OPC Khánh Hòa', '16:00–17:00', 'next'],
  ['OPC Meetup #12 (offline)', '19:30–21:30', 'next'],
] as const;

export const LIVE_ONLINE = 312;
export const LIVE_MESSAGES_TODAY = 1412;
export const LIVE_EVENT_JOINS = 186;
/** Chu kỳ phiên đang diễn ra (giây) — thanh tiến độ */
export const LIVE_SESSION_CYCLE_SEC = 300;
