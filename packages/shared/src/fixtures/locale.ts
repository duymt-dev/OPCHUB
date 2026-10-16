import rawI18n from './prototype-i18n.json' with { type: 'json' };
import rawSeed from './prototype-seed.json' with { type: 'json' };
import type { PrototypeSeed } from './types';

const LANGS = (rawSeed as unknown as PrototypeSeed).LANGS;
const DICTS = rawI18n as Record<string, Record<string, string>>;

/** Mã ngôn ngữ của bảng "CHỌN QUỐC GIA & NGÔN NGỮ" (D-06: vi là mặc định) */
export const LOCALES = LANGS.map((l) => l.code);
export const DEFAULT_LOCALE = 'vi';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export function isLocale(v: string | undefined): v is string {
  return v !== undefined && LOCALES.includes(v);
}

/** Tên bản ngữ của ngôn ngữ (nút chọn ngôn ngữ) */
export const localeNative = (code: string) =>
  LANGS.find((l) => l.code === code)?.native ?? 'Tiếng Việt';

/**
 * Chuỗi màn đăng nhập đã dịch trong prototype; khóa nào không có thì giữ tiếng Việt.
 * Trả về theo khóa message `auth.login.*` / `auth.register.*` của app.
 */
export function authOverrides(code: string) {
  const dict = DICTS[LANGS.find((l) => l.code === code)?.dict ?? 'vi'] ?? {};
  const pick = (k: string) => (dict[k] ? { [k]: dict[k] } : {});
  const map = (from: string, to: string) => (dict[from] ? { [to]: dict[from] } : {});
  return {
    languageNative: localeNative(code),
    login: {
      ...map('loginTitle', 'tabLogin'),
      ...map('registerLink', 'tabRegister'),
      ...pick('email'),
      ...pick('password'),
      ...pick('remember'),
      ...pick('forgot'),
      ...map('loginBtn', 'submit'),
      ...pick('orContinue'),
    },
    register: { ...map('registerBtn', 'submitPer'), ...pick('email'), ...pick('password') },
  };
}
