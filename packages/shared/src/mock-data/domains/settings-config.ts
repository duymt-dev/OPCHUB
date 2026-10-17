import type {
  AdminCategory,
  Category,
  GeneralSettings,
  GeneralSettingsPatch,
  LanguagePatch,
  LanguageSettings,
  RolePermissions,
  SecurityPatch,
  SecuritySettings,
  SmtpVerify,
  SsoId,
} from '../../api-domains';
import { SSO_IDS } from '../../api-domains';
import { languages, members } from '../../fixtures';
import { logSetting } from './settings-log';
import { mockDb, nextId, type MockDb } from './store';
import { conflict, notFound, ok, type MockResult } from './util';

/**
 * Admin "Cài đặt" (G6a, D-66 → D-77): cài đặt chung, lĩnh vực (thứ tự, số dùng), phân quyền,
 * SMTP kiểm tra kết nối, SSO + chính sách bảo mật, ngôn ngữ. Mọi thao tác ghi → audit (luật 10).
 */

interface ConfigState {
  general: GeneralSettings;
  security: SecuritySettings;
  languages: LanguageSettings;
}

/** Số người dùng mỗi nhà cung cấp SSO (prototype) */
const SSO_USERS: Record<SsoId, number> = {
  google: 1820,
  facebook: 964,
  linkedin: 512,
  chatgpt: 388,
  gemini: 241,
  deepseek: 97,
};
/** % bản dịch (prototype PCT) */
const LANG_PROGRESS: Record<string, number> = {
  zh: 90,
  'en-SG': 100,
  vi: 100,
  en: 100,
  th: 92,
  id: 88,
  ms: 86,
  fil: 74,
  my: 61,
  km: 58,
  lo: 55,
  'ms-BN': 86,
};

const seedConfig = (): ConfigState => ({
  general: {
    platformName: 'OPC Hub Community',
    domain: 'community.opchub.vn',
    contactEmail: 'hello@opchub.vn',
    timezone: 'ict',
    logoUrl: null,
    openRegistration: true,
    otpVerification: true,
    requireProfile: true,
  },
  security: {
    providers: SSO_IDS.map((id) => ({ id, enabled: true, userCount: SSO_USERS[id] })),
    minPasswordLength: 8,
    sessionDays: 30,
    requireAdmin2fa: true,
    lockoutEnabled: true,
  },
  languages: {
    defaultLocale: 'vi',
    items: languages.map((l) => ({
      code: l.code,
      enabled: true,
      progress: LANG_PROGRESS[l.code] ?? 0,
    })),
  },
});

const states = new WeakMap<MockDb, ConfigState>();
function state(): ConfigState {
  const db = mockDb();
  let s = states.get(db);
  if (!s) {
    s = seedConfig();
    states.set(db, s);
  }
  return s;
}

/** Gộp bản vá: bỏ khoá `undefined` (exactOptionalPropertyTypes) */
const merge = <T extends object>(base: T, patch: { [K in keyof T]?: T[K] | undefined }): T => ({
  ...base,
  ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
});

export const getGeneralSettings = (): GeneralSettings => state().general;

export function updateGeneralSettings(actorId: string, patch: GeneralSettingsPatch) {
  const s = state();
  s.general = merge(s.general, patch);
  logSetting(actorId, 'settings.general', 'general', 'cập nhật cài đặt chung', 'settings');
  return s.general;
}

// ── Lĩnh vực ────────────────────────────────────────────────────────────

function withCounts(c: Category): AdminCategory {
  const db = mockDb();
  return {
    ...c,
    projectCount: db.projects.filter((p) => p.category === c.name).length,
    bizCount: members.filter((m) => m.type === 'biz' && m.field === c.name).length,
  };
}

export const listAdminCategories = (): AdminCategory[] => mockDb().categories.map(withCounts);

interface CategoryInput {
  name: string;
  color: string;
  scope: Category['scope'];
  enabled: boolean;
}

const dupName = (name: string, id?: string) =>
  mockDb().categories.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase());

export function createAdminCategory(actorId: string, i: CategoryInput): MockResult<AdminCategory> {
  if (dupName(i.name)) return conflict('Lĩnh vực đã tồn tại');
  const c: Category = { id: nextId('k'), ...i };
  mockDb().categories.push(c);
  logSetting(actorId, 'category.create', c.id, `thêm lĩnh vực ${c.name}`, 'content');
  return ok(withCounts(c));
}

/** Đổi tên tự cập nhật các dự án đang dùng (prototype) */
export function updateAdminCategory(
  actorId: string,
  id: string,
  i: CategoryInput,
): MockResult<AdminCategory> {
  const db = mockDb();
  const c = db.categories.find((x) => x.id === id);
  if (!c) return notFound('Không tìm thấy lĩnh vực');
  if (dupName(i.name, id)) return conflict('Lĩnh vực đã tồn tại');
  const old = c.name;
  Object.assign(c, i);
  if (old !== c.name)
    db.projects.forEach((p) => {
      if (p.category === old) p.category = c.name;
    });
  logSetting(actorId, 'category.update', id, `cập nhật lĩnh vực ${c.name}`, 'content');
  return ok(withCounts(c));
}

export function setCategoryEnabled(
  actorId: string,
  id: string,
  enabled: boolean,
): MockResult<AdminCategory> {
  const c = mockDb().categories.find((x) => x.id === id);
  if (!c) return notFound('Không tìm thấy lĩnh vực');
  c.enabled = enabled;
  const verb = enabled ? 'hiện' : 'ẩn';
  logSetting(actorId, 'category.toggle', id, `${verb} lĩnh vực ${c.name}`, 'content');
  return ok(withCounts(c));
}

/** Lĩnh vực đang có dự án / doanh nghiệp dùng chỉ được ẩn */
export function deleteAdminCategory(actorId: string, id: string): MockResult<{ id: string }> {
  const db = mockDb();
  const c = db.categories.find((x) => x.id === id);
  if (!c) return notFound('Không tìm thấy lĩnh vực');
  const n = withCounts(c);
  if (n.projectCount + n.bizCount > 0)
    return conflict('Lĩnh vực đang được sử dụng – hãy ẩn thay vì xoá');
  db.categories = db.categories.filter((x) => x.id !== id);
  logSetting(actorId, 'category.delete', id, `xoá lĩnh vực ${c.name}`, 'content');
  return ok({ id });
}

export function reorderCategories(actorId: string, ids: string[]): MockResult<AdminCategory[]> {
  const db = mockDb();
  const byId = new Map(db.categories.map((c) => [c.id, c]));
  if (ids.length !== byId.size || ids.some((id) => !byId.has(id)))
    return conflict('Danh sách lĩnh vực đã thay đổi, tải lại trang');
  db.categories = ids.flatMap((id) => byId.get(id) ?? []);
  logSetting(actorId, 'category.reorder', 'categories', 'sắp xếp lại danh mục lĩnh vực', 'content');
  return ok(listAdminCategories());
}

// ── Phân quyền, SMTP, email ─────────────────────────────────────────────

export function saveRolePermissions(actorId: string, p: RolePermissions) {
  mockDb().rolePermissions = p;
  logSetting(actorId, 'roles.permissions', 'roles', 'cập nhật phân quyền vai trò', 'permission');
  return p;
}

/** Brevo giả: cần login + key (key nhập mới hoặc đã lưu) */
export function verifySmtp(actorId: string, i: SmtpVerify) {
  const hasKey = !!i.key || mockDb().smtp.hasKey;
  logSetting(actorId, 'smtp.verify', 'smtp', `kiểm tra kết nối ${i.host}:${i.port}`, 'settings');
  return hasKey
    ? { ok: true, message: `Xác thực thành công với ${i.host}:${i.port}` }
    : { ok: false, message: 'Không xác thực được – kiểm tra lại SMTP login / key.' };
}

// ── SSO + bảo mật, ngôn ngữ ─────────────────────────────────────────────

export const getSecuritySettings = (): SecuritySettings => state().security;

export function updateSecuritySettings(actorId: string, p: SecurityPatch) {
  const s = state();
  const { provider, ...rest } = p;
  s.security = merge(s.security, rest);
  if (provider) {
    s.security.providers = s.security.providers.map((x) =>
      x.id === provider.id ? { ...x, enabled: provider.enabled } : x,
    );
    const verb = provider.enabled ? 'bật' : 'tắt';
    logSetting(actorId, 'sso.toggle', provider.id, `${verb} đăng nhập bằng ${provider.id}`, 'sso');
  } else {
    logSetting(actorId, 'security.policy', 'security', 'cập nhật chính sách bảo mật', 'settings');
  }
  return s.security;
}

export const getLanguageSettings = (): LanguageSettings => state().languages;

export function updateLanguageSettings(
  actorId: string,
  p: LanguagePatch,
): MockResult<LanguageSettings> {
  const s = state().languages;
  const known = (code: string) => s.items.some((x) => x.code === code);
  if (p.defaultLocale) {
    if (!known(p.defaultLocale)) return notFound('Không có ngôn ngữ này');
    s.defaultLocale = p.defaultLocale;
    s.items = s.items.map((x) => (x.code === p.defaultLocale ? { ...x, enabled: true } : x));
    logSetting(
      actorId,
      'language.default',
      p.defaultLocale,
      `đặt ngôn ngữ mặc định ${p.defaultLocale}`,
      'language',
    );
  }
  if (p.toggle) {
    const { code, enabled } = p.toggle;
    if (!known(code)) return notFound('Không có ngôn ngữ này');
    if (!enabled && code === s.defaultLocale) return conflict('Không thể tắt ngôn ngữ mặc định');
    s.items = s.items.map((x) => (x.code === code ? { ...x, enabled } : x));
    logSetting(
      actorId,
      'language.toggle',
      code,
      `${enabled ? 'bật' : 'tắt'} ngôn ngữ ${code}`,
      'language',
    );
  }
  return ok(s);
}
