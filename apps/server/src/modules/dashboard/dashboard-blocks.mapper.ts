import type {
  LiveCountry,
  LiveMember,
  LiveMessage,
  LiveSession,
  LiveThread,
} from '@opchub/shared/api-domains';
import type {
  CountryRow,
  MemberRow,
  RecentRow,
  SessionRow,
  ThreadRow,
} from './dashboard-blocks.repository';

/** Tên quốc gia ASEAN của prototype (`D_CTRY`) */
const COUNTRY_NAMES: Record<string, string> = {
  vn: 'Việt Nam',
  th: 'Thái Lan',
  id: 'Indonesia',
  my: 'Malaysia',
  ph: 'Philippines',
  sg: 'Singapore',
  mm: 'Myanmar',
  kh: 'Campuchia',
  la: 'Lào',
  bn: 'Brunei',
};
/** Màu thẻ phòng theo thứ tự prototype (blue, rose, green, amber, violet) */
const TONES = [
  { bg: '#E6F4FF', fg: '#1677FF' },
  { bg: '#FFF2F0', fg: '#FF4D4F' },
  { bg: '#F6FFED', fg: '#52C41A' },
  { bg: '#FFFBE6', fg: '#FAAD14' },
  { bg: '#F9F0FF', fg: '#722ED1' },
];
/** "Đang chat" = có tin trong 15 phút qua và đang online */
const CHATTING_MS = 15 * 60_000;
const DEFAULT_SESSION_MS = 2 * 3_600_000;

const toneOf = (key: string) => {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length] ?? { bg: '#E6F4FF', fg: '#1677FF' };
};

export function toMembers(rows: MemberRow[], online: Set<string>, now: Date): LiveMember[] {
  const max = Math.max(1, ...rows.map((r) => r.msgs));
  return rows.map((r) => {
    const isOn = online.has(r.id);
    const last = r.last_at ?? now;
    const chatting = isOn && r.room_name !== null && now.getTime() - last.getTime() < CHATTING_MS;
    return {
      id: r.id,
      name: r.full_name,
      org: r.account_type === 'business' ? (r.company ?? '') : 'Freelancer',
      title: r.position ?? '',
      countryCode: r.country.toUpperCase(),
      avatarUrl: r.avatar_url,
      status: chatting ? 'chat' : isOn ? 'online' : 'off',
      roomName: r.room_name ?? '',
      lastActiveAt: last.toISOString(),
      scorePct: Math.round((r.msgs / max) * 100),
    };
  });
}

export function toCountries(rows: CountryRow[]): LiveCountry[] {
  const by = new Map<string, LiveCountry>();
  for (const r of rows) {
    const code = r.country.toLowerCase();
    const c = by.get(code) ?? {
      code: code.toUpperCase(),
      name: COUNTRY_NAMES[code] ?? code.toUpperCase(),
      flagUrl: `https://flagcdn.com/w80/${code}.png`,
      total: 0,
      provinces: [],
    };
    c.total += r.n;
    if (r.city) c.provinces.push({ name: r.city, count: r.n });
    by.set(code, c);
  }
  return [...by.values()].sort((a, b) => b.total - a.total);
}

export const toMessages = (rows: RecentRow[]): LiveMessage[] =>
  rows.map((r) => ({
    id: r.id,
    memberName: r.sender,
    avatarUrl: r.avatar_url,
    roomName: r.group_name,
    tone: toneOf(r.group_id),
    body: r.body,
    at: r.created_at.toISOString(),
  }));

export const toThreads = (rows: ThreadRow[]): LiveThread[] =>
  rows.map((r) => ({
    id: r.id,
    groupId: r.group_id,
    groupNames: [r.group_name],
    at: r.created_at.toISOString(),
    author: { name: r.sender, role: r.role, color: r.color },
    body: r.body,
    reply: r.reply_name !== null ? { name: r.reply_name, body: r.reply_body ?? '' } : null,
    replyCount: r.reply_count,
  }));

const hhmm = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(d);

export function toSessions(rows: SessionRow[], now: Date): LiveSession[] {
  return rows.map((r) => {
    const start = r.starts_at.getTime();
    const end = (r.ends_at ?? new Date(start + DEFAULT_SESSION_MS)).getTime();
    const t = now.getTime();
    const state = t >= end ? 'done' : t >= start ? 'live' : 'next';
    const pct = state === 'done' ? 100 : state === 'next' ? 0 : ((t - start) / (end - start)) * 100;
    return {
      name: r.title,
      time: `${hhmm(new Date(start))} – ${hhmm(new Date(end))}`,
      state,
      progressPct: Math.round(pct * 10) / 10,
      attendees: r.registered_count,
    };
  });
}
