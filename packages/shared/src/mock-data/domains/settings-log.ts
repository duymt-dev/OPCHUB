import type { AuditLogRow, AuditTag } from '../../api-domains';
import { recordAudit } from './group-admin';
import { mockDb, nextId, type MockDb } from './store';
import { avatarUrl, iso } from './util';

/**
 * Admin "Cài đặt" (G6a): nhật ký hoạt động (D-75). TK quản trị §21 ở `admin-rbac.ts`.
 * Mốc thời gian seed tính theo `Date.now()` lúc dựng state (MSW chạy trong trình duyệt, nên
 * khớp đồng hồ giả của parity). WeakMap theo MockDb → `resetMockDb()` tự về seed.
 */

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

interface LogState {
  log: AuditLogRow[];
}

/** Ảnh người thao tác trong nhật ký seed (prototype) */
const PHOTO: Record<string, string> = {
  'Quản trị hệ thống': 'men/11',
  'Phạm Thu Trang': 'women/44',
  'Đỗ Hải Yến': 'women/33',
};

const LOG_SEED: [string, string, AuditTag, number][] = [
  ['Quản trị hệ thống', 'bật đăng nhập bằng DeepSeek', 'sso', 2 * HOUR],
  ['Phạm Thu Trang', 'khóa tài khoản Ngô Thành Đạt do vi phạm nội quy', 'member', 5 * HOUR],
  ['Quản trị hệ thống', 'đổi vai trò Đỗ Hải Yến thành Giảng viên', 'permission', DAY + HOUR],
  ['Phạm Thu Trang', 'xuất bản dự án SoloBooks', 'project', DAY + 2 * HOUR],
  ['Quản trị hệ thống', 'thêm ngôn ngữ ລາວ (Lào)', 'language', 3 * DAY + HOUR],
  ['Đỗ Hải Yến', 'xóa 2 tin nhắn nhạy cảm trong OPC TP. Hồ Chí Minh', 'moderation', 4 * DAY + HOUR],
];

function seedState(): LogState {
  const now = Date.now();
  const photo = (who: string) => {
    const ph = PHOTO[who];
    return ph ? avatarUrl(ph) : null;
  };
  const log = LOG_SEED.map(([actorName, summary, tag, ago], i): AuditLogRow => ({
    id: `lg${i + 1}`,
    actorName,
    actorAvatarUrl: photo(actorName),
    summary,
    tag,
    at: iso(now - ago),
  }));
  return { log };
}

const states = new WeakMap<MockDb, LogState>();
function state(): LogState {
  const db = mockDb();
  let s = states.get(db);
  if (!s) {
    s = seedState();
    states.set(db, s);
  }
  return s;
}

/** Tên người thao tác: TK quản trị seed (§21) */
const ACTOR_NAMES: Record<string, string> = {
  admin: 'Quản trị hệ thống',
  'adm-trang': 'Phạm Thu Trang',
  'adm-yen': 'Đỗ Hải Yến',
  'adm-quan': 'Vũ Minh Quân',
  'adm-mai': 'Hoàng Thị Mai',
  'adm-hang': 'Ngô Thu Hằng',
};

/**
 * Luật 10: ghi audit_logs (bảng chung) + dòng hiển thị ở "Nhật ký hoạt động".
 * `action` là mã máy, `summary` là câu tiếng Việt hiển thị.
 */
export function logSetting(
  actorId: string,
  action: string,
  target: string,
  summary: string,
  tag: AuditTag,
) {
  recordAudit(actorId, action, target, summary);
  state().log.unshift({
    id: nextId('lg'),
    actorName: ACTOR_NAMES[actorId] ?? actorId,
    actorAvatarUrl: null,
    summary,
    tag,
    at: iso(Date.now()),
  });
}

/** 90 ngày gần nhất (prototype: "Ghi lại … trong 90 ngày") */
export function listSettingsLog(): AuditLogRow[] {
  const since = Date.now() - 90 * DAY;
  return state().log.filter((r) => Date.parse(r.at) >= since);
}

/** Persistence bridge owns Affiliate rows only; unrelated Admin history stays in this runtime. */
export const readMockAffiliateSettingsLog = (): AuditLogRow[] =>
  state().log.filter((row) => row.tag === 'affiliate');
export function replaceMockAffiliateSettingsLog(rows: AuditLogRow[]): void {
  state().log = [...rows, ...state().log.filter((row) => row.tag !== 'affiliate')].sort((a, b) =>
    b.at.localeCompare(a.at),
  );
}
