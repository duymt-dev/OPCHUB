import rawSeed from './prototype-seed.json' with { type: 'json' };
import type { PrototypeSeed, Tone, ToneKey } from './types';

const { COMMS: communities, LANGS: languages, TONES: tones } = rawSeed as unknown as PrototypeSeed;

/** Dữ liệu tĩnh cho form đăng ký / chọn ngôn ngữ, lấy từ prototype */

const flag = (code: string) => `https://flagcdn.com/w80/${code}.png`;

export const phoneCountries = [
  ['vn', 'Việt Nam', '+84'],
  ['th', 'Thái Lan', '+66'],
  ['id', 'Indonesia', '+62'],
  ['my', 'Malaysia', '+60'],
  ['ph', 'Philippines', '+63'],
  ['sg', 'Singapore', '+65'],
  ['mm', 'Myanmar', '+95'],
  ['kh', 'Campuchia', '+855'],
  ['la', 'Lào', '+856'],
  ['bn', 'Brunei', '+673'],
].map(([id = '', name = '', dial = '']) => ({ id, name, dial, flagSrc: flag(id) }));

/** Quốc gia đăng ký kinh doanh (cùng thứ tự prototype) */
export const bizCountries = phoneCountries.map((c) => ({ value: c.id, label: c.name }));

/** Giá trị Quy mô; nhãn lấy từ i18n */
export const BIZ_SIZES = ['1', '10', '50', '51'] as const;

const TONE_KEYS: ToneKey[] = ['blue', 'rose', 'green', 'amber', 'violet'];

/** Nhóm cộng đồng kèm màu xoay vòng theo thứ tự, như prototype */
export const registerGroups = communities.map((c, i) => ({
  id: c.id,
  name: c.name,
  tone: tones[TONE_KEYS[i % TONE_KEYS.length] ?? 'blue'] satisfies Tone,
}));

export const languageOptions = languages.map((l) => ({
  code: l.code,
  dict: l.dict,
  country: l.country,
  native: l.native,
  flagSrc: flag(l.flag),
}));
