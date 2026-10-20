/** Tab của màn Bot tương tác — mỗi tab một đường dẫn (D-36 → D-41) */
export type BotTab = 'log' | 'persona' | 'script' | 'queue';

export const BOT_TAB_PATH: Record<BotTab, string> = {
  log: '/bots',
  persona: '/bots/personas',
  script: '/bots/scripts',
  queue: '/bots/threads',
};

export const BOT_TABS: BotTab[] = ['log', 'persona', 'script', 'queue'];

/** Giọng văn persona (TONES2 của prototype) */
export const PERSONA_TONES = [
  'Thân thiện, hay hỏi',
  'Thực tế, chia sẻ kinh nghiệm',
  'Chuyên gia, trả lời chi tiết',
  'Truyền cảm hứng',
  'Ngắn gọn, kỹ thuật',
  'Tò mò, mới bắt đầu',
] as const;

/** Màu avatar persona khi không có ảnh */
export const PERSONA_COLORS = [
  '#1677FF',
  '#EB2F96',
  '#13C2C2',
  '#722ED1',
  '#FA8C16',
  '#52C41A',
] as const;

export const AGE_RANGES = ['18 – 24', '25 – 34', '35 – 44', '45 – 54', '55+'] as const;
export const GENDERS = ['Nam', 'Nữ', 'Khác'] as const;
export const ACTIVE_HOURS = [
  '8:00 – 22:00',
  '8:00 – 12:00',
  '12:00 – 18:00',
  '18:00 – 23:00',
  'Cả ngày',
] as const;
export const SCRIPT_TYPES = [
  'Hỏi đáp',
  'Thảo luận',
  'Chia sẻ kinh nghiệm',
  'Giới thiệu sự kiện / dự án',
] as const;

/** Form persona trong drawer — `id` null khi tạo mới */
export interface PersonaForm {
  id: string | null;
  name: string;
  title: string;
  province: string;
  tone: string;
  groupIds: string[];
  enabled: boolean;
  color: string;
  avatarUrl: string | null;
  gender: '' | (typeof GENDERS)[number];
  ageRange: string;
  bio: string;
  skills: string;
  postsPerDay: string;
  activeHours: string;
}

export interface ScriptLineForm {
  key: string;
  personaId: string;
  body: string;
}

export interface ScriptForm {
  id: string | null;
  topic: string;
  type: string;
  delayMinutes: string;
  /** Giá trị ô datetime-local (giờ máy); '' = chạy thủ công */
  runAt: string;
  inviteReal: boolean;
  groupIds: string[];
  lines: ScriptLineForm[];
  enabled: boolean;
}

/** Nhóm cộng đồng dùng cho chip chọn + tên hiển thị */
export interface GroupRef {
  id: string;
  name: string;
}

export type BotEmergencyAction = { kind: 'stop' } | { kind: 'hide'; groupIds?: string[] };
