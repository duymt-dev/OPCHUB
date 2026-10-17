import type { AdminAccount, AdminInvite, AuditLogRow, AuditTag } from '../../api-domains';
import { recordAudit } from './group-admin';
import { mockDb, nextId, type MockDb } from './store';
import { avatarUrl, conflict, iso, notFound, ok, type MockResult } from './util';

/**
 * Admin "Cài đặt" (G6a): tài khoản quản trị (D-73, D-74) + nhật ký hoạt động (D-75).
 * Mốc thời gian seed tính theo `Date.now()` lúc dựng state (MSW chạy trong trình duyệt, nên
 * khớp đồng hồ giả của parity). WeakMap theo MockDb → `resetMockDb()` tự về seed.
 */

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

interface LogState {
  admins: AdminAccount[];
  log: AuditLogRow[];
}

const ADMIN_SEED: [string, string, AdminAccount['role'], string, boolean, number | 'online'][] = [
  ['Nguyễn Văn An', 'an.nguyen@mediasoft.vn', 'super_admin', 'men/11', true, 'online'],
  ['Lê Minh Anh', 'minhanh@leadpilot.ai', 'admin', 'women/44', true, 10 * MIN],
  ['Đỗ Hải Yến', 'yen.do@brandkit.vn', 'moderator', 'women/33', false, DAY + HOUR],
  ['Trần Quốc Bảo', 'bao.tran@solobooks.vn', 'moderator', 'men/22', true, 3 * DAY + HOUR],
];

const LOG_SEED: [string, string, AuditTag, number][] = [
  ['Nguyễn Văn An', 'bật đăng nhập bằng DeepSeek', 'sso', 2 * HOUR],
  ['Lê Minh Anh', 'khóa tài khoản Ngô Thành Đạt do vi phạm nội quy', 'member', 5 * HOUR],
  ['Nguyễn Văn An', 'thêm Đỗ Hải Yến vào vai trò Điều phối viên', 'permission', DAY + HOUR],
  ['Lê Minh Anh', 'xuất bản dự án SoloBooks', 'project', DAY + 2 * HOUR],
  ['Nguyễn Văn An', 'thêm ngôn ngữ ລາວ (Lào)', 'language', 3 * DAY + HOUR],
  ['Đỗ Hải Yến', 'xóa 2 tin nhắn nhạy cảm trong OPC TP. Hồ Chí Minh', 'moderation', 4 * DAY + HOUR],
];

function seedState(): LogState {
  const now = Date.now();
  const admins = ADMIN_SEED.map(([name, email, role, ph, twoFactor, last], i): AdminAccount => ({
    id: `ad${i + 1}`,
    name,
    email,
    role,
    avatarUrl: avatarUrl(ph),
    twoFactor,
    status: 'active',
    online: last === 'online',
    lastLoginAt: last === 'online' ? iso(now) : iso(now - last),
  }));
  const photo = (who: string) => admins.find((a) => a.name === who)?.avatarUrl ?? null;
  const log = LOG_SEED.map(([actorName, summary, tag, ago], i): AuditLogRow => ({
    id: `lg${i + 1}`,
    actorName,
    actorAvatarUrl: photo(actorName),
    summary,
    tag,
    at: iso(now - ago),
  }));
  return { admins, log };
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

/** Tên người thao tác: TK admin hệ thống hoặc quản trị viên trong danh sách */
const ACTOR_NAMES: Record<string, string> = { admin: 'Quản trị hệ thống' };

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

export const listAdminAccounts = (): AdminAccount[] => state().admins;

const ROLE_LABEL: Record<AdminAccount['role'], string> = {
  super_admin: 'Super Admin',
  admin: 'Quản trị viên',
  moderator: 'Điều phối viên',
};

export function inviteAdmin(actorId: string, input: AdminInvite): MockResult<AdminAccount> {
  const s = state();
  const email = input.email.toLowerCase();
  if (s.admins.some((a) => a.email.toLowerCase() === email))
    return conflict('Email này đã có quyền quản trị');
  const acc: AdminAccount = {
    id: nextId('ad'),
    name: email.split('@')[0] ?? email,
    email,
    role: input.role,
    avatarUrl: avatarUrl('men/5'),
    twoFactor: false,
    status: 'invited',
    online: false,
    lastLoginAt: null,
  };
  s.admins.push(acc);
  logSetting(
    actorId,
    'admin.invite',
    acc.id,
    `mời ${email} làm ${ROLE_LABEL[input.role]}`,
    'permission',
  );
  return ok(acc);
}

/** Thu hồi quyền quản trị — Super Admin (chủ sở hữu) không thu hồi được */
export function revokeAdmin(actorId: string, id: string): MockResult<{ id: string }> {
  const s = state();
  const acc = s.admins.find((a) => a.id === id);
  if (!acc) return notFound('Không tìm thấy tài khoản quản trị');
  if (acc.role === 'super_admin') return conflict('Không thể thu hồi quyền của chủ sở hữu');
  s.admins = s.admins.filter((a) => a.id !== id);
  logSetting(actorId, 'admin.revoke', id, `thu hồi quyền quản trị của ${acc.name}`, 'permission');
  return ok({ id });
}
