import type {
  BotScript,
  BotThread,
  Persona,
  PersonaUpsert,
  ScriptUpsert,
} from '@opchub/shared/api-domains';
import { PERSONA_COLORS, PERSONA_TONES, type PersonaForm, type ScriptForm } from './types';

/** Chữ cái đầu của tên cuối (prototype: tên tiếng Việt lấy chữ cuối) */
export const initialOf = (name: string) => (name.trim().split(/\s+/).pop() ?? '?').charAt(0) || '?';

/** "x phút / giờ / ngày trước" (tối thiểu 1 phút như prototype) */
export function agoOf(at: string, now: number): { key: 'minutes' | 'hours' | 'days'; n: number } {
  const s = Math.max(0, (now - Date.parse(at)) / 1000);
  if (s < 3600) return { key: 'minutes', n: Math.max(1, Math.floor(s / 60)) };
  if (s < 86400) return { key: 'hours', n: Math.floor(s / 3600) };
  return { key: 'days', n: Math.floor(s / 86400) };
}

export interface BotStats {
  personas: string;
  scripts: string;
  posted: string;
  pending: string;
}

export function botStats(
  personas: Persona[],
  scripts: BotScript[],
  threads: BotThread[],
): BotStats {
  return {
    personas: `${personas.filter((p) => p.enabled).length} / ${personas.length}`,
    scripts: String(scripts.length),
    posted: String(threads.filter((t) => t.status === 'posted').length),
    pending: String(threads.filter((t) => t.status === 'pending').length),
  };
}

export const splitTags = (skills: string) =>
  skills
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 3);

export const emptyPersona = (count: number): PersonaForm => ({
  id: null,
  name: '',
  title: '',
  province: '',
  tone: PERSONA_TONES[0],
  groupIds: [],
  enabled: true,
  color: PERSONA_COLORS[count % PERSONA_COLORS.length] ?? PERSONA_COLORS[0],
  avatarUrl: null,
  gender: '',
  ageRange: '',
  bio: '',
  skills: '',
  postsPerDay: '2',
  activeHours: '8:00 – 22:00',
});

export const personaToForm = (p: Persona): PersonaForm => ({
  id: p.id,
  name: p.name,
  title: p.title,
  province: p.province,
  tone: p.tone,
  groupIds: [...p.groupIds],
  enabled: p.enabled,
  color: p.color,
  avatarUrl: p.avatarUrl,
  gender: p.gender === 'Nam' || p.gender === 'Nữ' || p.gender === 'Khác' ? p.gender : '',
  ageRange: p.ageRange,
  bio: p.bio,
  skills: p.skills,
  postsPerDay: String(p.postsPerDay),
  activeHours: p.activeHours,
});

export const personaBody = (f: PersonaForm): PersonaUpsert => ({
  name: f.name.trim(),
  title: f.title.trim(),
  province: f.province,
  tone: f.tone,
  groupIds: f.groupIds,
  enabled: f.enabled,
  color: f.color,
  avatarUrl: f.avatarUrl,
  gender: f.gender,
  ageRange: f.ageRange,
  bio: f.bio.trim(),
  skills: f.skills.trim(),
  postsPerDay: Math.min(20, Math.max(1, Number(f.postsPerDay) || 2)),
  activeHours: f.activeHours,
});

export type PersonaField = 'name' | 'groupIds';
export type PersonaErrors = Partial<Record<PersonaField, 'needName' | 'needGroup'>>;

/** Lỗi kiểm tra trước khi lưu persona — MỌI ô (BUG-022), thứ tự như prototype. Rỗng = hợp lệ */
export function personaError(f: PersonaForm): PersonaErrors {
  const e: PersonaErrors = {};
  if (!f.name.trim()) e.name = 'needName';
  if (!f.groupIds.length) e.groupIds = 'needGroup';
  return e;
}

/** path lỗi server (persona) → ô form */
export const PERSONA_FIELD_MAP = { name: 'name', groupIds: 'groupIds' } as const;

let lineSeq = 0;
export const lineKey = () => `l${++lineSeq}`;

export const emptyScript = (personaIds: string[]): ScriptForm => ({
  id: null,
  topic: '',
  type: 'Hỏi đáp',
  delayMinutes: '5',
  runAt: '',
  inviteReal: true,
  groupIds: [],
  enabled: true,
  lines: [
    { key: lineKey(), personaId: personaIds[0] ?? '', body: '' },
    { key: lineKey(), personaId: personaIds[1] ?? personaIds[0] ?? '', body: '' },
  ],
});

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO → giá trị datetime-local theo giờ máy */
export function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const scriptToForm = (s: BotScript): ScriptForm => ({
  id: s.id,
  topic: s.topic,
  type: s.type,
  delayMinutes: String(s.delayMinutes),
  runAt: toLocalInput(s.runAt),
  inviteReal: s.inviteReal,
  groupIds: [...s.groupIds],
  enabled: s.enabled,
  lines: s.lines.map((l) => ({ key: lineKey(), personaId: l.personaId, body: l.body })),
});

export type ScriptField = 'topic' | 'groupIds' | 'lines';
export type ScriptErrors = Partial<Record<ScriptField, 'needTopic' | 'needGroup' | 'needLine'>>;

/** Kiểm MỌI ô kịch bản (BUG-022), thứ tự như prototype. Rỗng = hợp lệ */
export function scriptError(f: ScriptForm): ScriptErrors {
  const e: ScriptErrors = {};
  if (!f.topic.trim()) e.topic = 'needTopic';
  if (!f.groupIds.length) e.groupIds = 'needGroup';
  if (!f.lines.some((l) => l.body.trim())) e.lines = 'needLine';
  return e;
}

/** path lỗi server (kịch bản) → ô form */
export const SCRIPT_FIELD_MAP = { topic: 'topic', groupIds: 'groupIds', lines: 'lines' } as const;

export const scriptBody = (f: ScriptForm): ScriptUpsert => ({
  topic: f.topic.trim(),
  type: f.type,
  delayMinutes: Math.min(120, Math.max(1, Number(f.delayMinutes) || 5)),
  runAt: f.runAt ? new Date(f.runAt).toISOString() : null,
  inviteReal: f.inviteReal,
  groupIds: f.groupIds,
  enabled: f.enabled,
  lines: f.lines
    .filter((l) => l.body.trim())
    .map((l) => ({ personaId: l.personaId, body: l.body.trim() })),
});

/** Đổi chỗ phần tử i với i+dir; ngoài biên thì giữ nguyên */
export function moveItem<T>(list: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  const a = next[i];
  const b = next[j];
  if (a === undefined || b === undefined) return list;
  next[i] = b;
  next[j] = a;
  return next;
}

export const toggleId = (ids: string[], id: string) =>
  ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];

/** Chuỗi chủ đề "a, b, c" → mảng (bỏ trống) */
export const parseTopics = (text: string) =>
  text
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
