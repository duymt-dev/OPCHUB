/**
 * Trạng thái khởi tạo của prototype (docs/spec/index.html, `state={…}` và hằng số trong script)
 * không nằm trong prototype-seed.json. Chép nguyên dữ liệu, không chép logic.
 */
import type { AccountType } from '../../enums';
import { planAmount, planOf } from '../../membership/plans';

/** Dự án đang hiển thị (state.published) */
export const PUBLISHED_PROJECTS: readonly string[] = ['p1', 'p2', 'p3', 'p4', 'p6', 'p10'];

/** Tài khoản bị khóa sẵn (state.locked) */
export const LOCKED_USERS: readonly string[] = ['m4'];

/** Sự kiện thành viên demo đã đăng ký (state.regs) */
export const MY_EVENT_REGS: readonly string[] = ['e2'];

interface ProjectExtra {
  stage: string;
  country: string;
  followers: number;
  tags: string[];
  ph: string;
}

/** Bổ sung hiển thị cho dự án p1–p6 (EX) */
export const PROJECT_EXTRAS: Record<string, ProjectExtra> = {
  p1: {
    stage: 'Tăng trưởng',
    country: 'Việt Nam',
    followers: 1240,
    tags: ['Kế toán', 'SaaS', 'Hoá đơn điện tử'],
    ph: 'men/22',
  },
  p2: {
    stage: 'Đã ra mắt',
    country: 'Việt Nam',
    followers: 2180,
    tags: ['AI', 'Chatbot', 'CRM'],
    ph: 'women/44',
  },
  p3: {
    stage: 'MVP',
    country: 'Việt Nam',
    followers: 860,
    tags: ['Marketplace', 'Freelance'],
    ph: 'women/65',
  },
  p4: {
    stage: 'Đã ra mắt',
    country: 'Thái Lan',
    followers: 540,
    tags: ['Thiết kế', 'Branding'],
    ph: 'women/33',
  },
  p5: {
    stage: 'Ý tưởng',
    country: 'Malaysia',
    followers: 310,
    tags: ['Pháp lý', 'Template'],
    ph: 'men/46',
  },
  p6: {
    stage: 'MVP',
    country: 'Singapore',
    followers: 720,
    tags: ['Content', 'Social'],
    ph: 'men/52',
  },
};

/** Chủ đề (phòng) ngoài phòng Chung (TOPIC_SEED) */
export const TOPIC_SEED: Record<string, { id: string; name: string; desc: string }[]> = {
  c1: [
    { id: 'qa', name: 'Hỏi đáp thuế & pháp lý', desc: 'Thắc mắc về thuế, hoá đơn, hợp đồng' },
    { id: 'docs', name: 'Chia sẻ mẫu biểu', desc: 'Mẫu hợp đồng, báo giá, checklist' },
    { id: 'events', name: 'Cà phê cuối tuần', desc: 'Hẹn gặp offline tại Hà Nội' },
  ],
  c2: [
    { id: 'qa', name: 'Tìm khách hàng đầu tiên', desc: 'Kinh nghiệm bán hàng, marketing' },
    { id: 'ai', name: 'Ứng dụng AI cho OPC', desc: 'Công cụ, prompt, tự động hoá' },
  ],
  c6: [{ id: 'tour', name: 'Du lịch & dịch vụ', desc: 'Kết nối nhà cung cấp tour, homestay' }],
};

export const GENERAL_ROOM = { id: 'general', name: 'Chung', desc: 'Phòng mặc định của nhóm' };

/** Reaction và ghim (state.msgMeta, state.pins) — khóa `<group>:<room>:<index>` */
export const MESSAGE_REACTIONS: Record<string, Record<string, string[]>> = {
  'c1:general:0': { '👍': ['Trần Quốc Bảo', 'Ngô Thành Đạt'], '🎉': ['Phạm Thu Hà'] },
  'c1:general:1': { '❤️': ['Lê Minh Anh'] },
};
export const PINNED_MESSAGES: readonly string[] = ['c1:general:0'];

/** Báo cáo vi phạm (state.reports); `time` là giờ hôm nay hoặc 'Hôm qua' */
export const REPORT_SEED = [
  {
    id: 'r1',
    who: 'Ngô Thành Đạt',
    room: 'OPC Đà Nẵng',
    time: '10:42',
    text: 'Inbox mình để nhận khoá học kiếm 100 triệu/tháng, chuyển khoản trước giữ chỗ nhé.',
    hit: 'chuyển khoản trước',
    cat: 'scam',
    src: 'auto',
    by: 0,
  },
  {
    id: 'r2',
    who: 'Tài khoản ẩn danh',
    room: 'OPC TP. Hồ Chí Minh',
    time: '09:58',
    text: 'Bán tài khoản ChatGPT Plus giá rẻ, liên hệ Zalo 09xx để mua.',
    hit: 'Bán tài khoản',
    cat: 'spam',
    src: 'report',
    by: 3,
  },
  {
    id: 'r3',
    who: 'Trần Quốc Bảo',
    room: 'OPC Hải Phòng',
    time: 'Hôm qua',
    text: 'Mã số thuế và số CCCD của mình là 0012xxxxxxx, ai check giúp với.',
    hit: 'số CCCD',
    cat: 'personal_info',
    src: 'auto',
    by: 0,
  },
  {
    id: 'r4',
    who: 'Vũ Đức Long',
    room: 'OPC Hà Nội',
    time: 'Hôm qua',
    text: 'Ý kiến kiểu này thì đúng là đồ ngu, khỏi bàn.',
    hit: 'đồ ngu',
    cat: 'abuse',
    src: 'report',
    by: 2,
  },
] as const;

/** Thông báo (state.notifs) — `ago` tính bằng ms trước thời điểm mock */
export const NOTIFICATION_SEED = [
  {
    id: 's1',
    type: 'mention',
    title: 'Lê Minh Anh nhắc đến bạn trong #Hỏi đáp',
    body: '“@An mẫu hợp đồng này dùng được cho freelancer không?” · OPC Hà Nội',
    ago: 6e5,
    read: false,
    link: '/chat/c1/qa',
  },
  {
    id: 's2',
    type: 'event',
    title: 'Sắp diễn ra: OPC Meetup #12',
    body: 'Bắt đầu 19:30, thứ Năm 22/10 tại MediaSoft Hub, Hà Nội.',
    ago: 36e5,
    read: false,
    link: '/events/e1',
  },
  {
    id: 's3',
    type: 'group',
    title: 'Yêu cầu tham gia OPC TP. Hồ Chí Minh đã được duyệt',
    body: 'Bạn có thể vào các phòng chat của nhóm ngay bây giờ.',
    ago: 864e5,
    read: true,
    link: '/chat/c2',
  },
  {
    id: 's4',
    type: 'verify',
    title: 'Tài khoản doanh nghiệp đã được xác minh',
    body: 'MediaSoft đã hiển thị trong Danh bạ doanh nghiệp.',
    ago: 2592e5,
    read: true,
    link: '/profile',
  },
] as const;

/** Luồng bot đã chạy (simThreads) — `ago` ms */
export const BOT_THREAD_SEED = [
  { id: 'th1', sid: 'sc1', st: 'done', ago: 36e5 * 3 },
  { id: 'th2', sid: 'sc2', st: 'done', ago: 36e5 * 20 },
  { id: 'th3', sid: 'sc3', st: 'scheduled', ago: 6e5 },
] as const;

/** Cấu hình SMTP mặc định (D trong smtpVals) — không có key */
export const SMTP_DEFAULTS = {
  host: 'smtp-relay.brevo.com',
  port: 587,
  encryption: 'tls',
  username: '',
  fromName: 'OPC Hub',
  fromEmail: 'no-reply@opchub.community',
  replyTo: 'support@opchub.community',
  dailyLimit: 300,
  enabled: true,
} as const;

/** Tài khoản nhận phí — alt ảnh QR của prototype */
export const FEE_BANK = {
  bankName: 'Vietcombank',
  accountNo: '1203132809',
  accountName: 'Công ty cổ phần Tập đoàn Media Soft',
  bankFullName: 'Vietcombank – Ngân hàng TMCP Ngoại thương Việt Nam',
} as const;

/** D-68: phí năm theo gói (giá ở `membership/plans.ts`) */
export const feeAmountOf = (t: AccountType): number => planAmount(planOf(t) ?? 'personal');
