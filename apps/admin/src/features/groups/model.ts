import type { GroupAdminUpsertInput, GroupDetail, GroupItem } from '@opchub/shared/api-domains';
import { tones, type ToneName } from '@opchub/ui';
import type {
  AdminGroup,
  ExportField,
  GroupFormErrors,
  GroupFormState,
  GroupMemberRow,
  GroupsParams,
  GroupStats,
} from './types';

/** Lọc / sắp xếp / thống kê nhóm (34 nhóm theo tỉnh — D-29, tải một lần) */

export const toAdminGroups = (items: GroupItem[]): AdminGroup[] =>
  items.map((g, order) => ({ ...g, order }));

export function filterGroups(all: AdminGroup[], p: GroupsParams): AdminGroup[] {
  const q = p.q.trim().toLowerCase();
  const list = all.filter(
    (g) =>
      (p.region === 'all' || g.region === p.region) &&
      (!q || `${g.name} ${g.province}`.toLowerCase().includes(q)),
  );
  return list.sort((a, b) => {
    if (p.sort === 'name') return a.name.localeCompare(b.name, 'vi');
    if (p.sort === 'weekly') return b.weeklyActive - a.weeklyActive;
    return b.memberCount - a.memberCount;
  });
}

export const regionCount = (all: AdminGroup[], region: string) =>
  region === 'all' ? all.length : all.filter((g) => g.region === region).length;

export function groupStats(all: AdminGroup[]): GroupStats {
  return {
    groups: all.length,
    provinces: new Set(all.map((g) => g.province).filter(Boolean)).size,
    members: all.reduce((a, g) => a + g.memberCount, 0),
    weekly: all.reduce((a, g) => a + g.weeklyActive, 0),
  };
}

export function pageSlice<T>(list: T[], page: number, size: number) {
  const pages = Math.max(1, Math.ceil(list.length / size));
  const cur = Math.min(Math.max(1, page), pages);
  return { page: cur, items: list.slice((cur - 1) * size, cur * size) };
}

export const formatCount = (n: number) => n.toLocaleString('vi-VN');

/** Chữ viết tắt: 2 chữ cuối của tên ("OPC Hà Nội" → "HN") */
export const initialsOf = (name: string) =>
  name
    .split(' ')
    .slice(-2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();

const TONE_ORDER: ToneName[] = ['blue', 'rose', 'green', 'amber', 'violet'];
export const toneOf = (order: number) => tones[TONE_ORDER[order % TONE_ORDER.length] ?? 'blue'];

const AVATAR_COLORS = ['#1677FF', '#52C41A', '#FF4D4F', '#722ED1', '#FAAD14', '#1F2A44', '#0E8A9A'];
/** Màu ảnh đại diện chữ theo tổng mã ký tự của tên (như prototype) */
export const avatarColorOf = (name: string) =>
  AVATAR_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length] ??
  '#1677FF';

/* ---------- Form Tạo / Sửa nhóm ---------- */

export const DEFAULT_RULES = [
  'Tôn trọng thành viên, không công kích cá nhân',
  'Không spam, quảng cáo khi chưa được phép',
  'Không chia sẻ thông tin cá nhân nhạy cảm của người khác',
];
/** Chủ nhóm mặc định khi tạo: TK demo Nguyễn Văn An như prototype */
export const DEFAULT_OWNER = 'm1';

export const emptyGroupForm = (): GroupFormState => ({
  id: null,
  name: '',
  province: '',
  description: '',
  approval: false,
  ownerId: DEFAULT_OWNER,
  moderatorIds: [],
  rooms: ['general', 'qa', 'docs'],
  extraRooms: [],
  rules: [...DEFAULT_RULES],
  coverUrl: null,
});

export const formFromGroup = (g: GroupDetail): GroupFormState => ({
  id: g.id,
  name: g.name,
  province: g.province,
  description: g.description,
  approval: g.joinMode === 'approval',
  ownerId: g.ownerId,
  moderatorIds: g.moderatorIds,
  rooms: g.roomKeys,
  extraRooms: g.extraRooms,
  rules: g.rules,
  coverUrl: g.coverUrl,
});

/** Tên nhóm tự điền theo tỉnh nếu chưa nhập hoặc vẫn là tên tự sinh "OPC …" */
export function nameForProvince(name: string, province: string) {
  if (name && !/^OPC /.test(name)) return name;
  return province ? `OPC ${province}` : '';
}

/**
 * Kiểm MỌI ô (BUG-022), thứ tự khoá theo toast prototype; trùng tỉnh gắn vào ô tỉnh.
 * Rỗng = hợp lệ.
 */
export function validateGroup(f: GroupFormState, all: AdminGroup[]): GroupFormErrors {
  const e: GroupFormErrors = {};
  if (!f.name.trim()) e.name = 'name';
  if (!f.province) e.province = 'province';
  else if (!f.id && all.some((g) => g.province === f.province)) e.province = 'duplicate';
  if (!f.description.trim()) e.description = 'desc';
  if (!f.ownerId) e.ownerId = 'owner';
  return e;
}

/** path lỗi server (POST/PATCH /admin/groups) → ô form */
export const GROUP_FIELD_MAP = {
  name: 'name',
  province: 'province',
  description: 'description',
  ownerId: 'ownerId',
} as const;

export const formToUpsert = (f: GroupFormState): GroupAdminUpsertInput => ({
  name: f.name.trim(),
  province: f.province,
  description: f.description.trim(),
  joinMode: f.approval ? 'approval' : 'open',
  ownerId: f.ownerId,
  moderatorIds: f.moderatorIds,
  roomKeys: f.rooms,
  extraRooms: f.extraRooms
    .map((r) => ({ name: r.name.trim(), description: r.description.trim() }))
    .filter((r) => r.name),
  rules: f.rules.map((r) => r.trim()).filter(Boolean),
  coverUrl: f.coverUrl,
});

/* ---------- Xuất danh sách thành viên ---------- */

const vnDate = (iso: string) =>
  new Date(iso).toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

export type CellLabels = Record<
  'business' | 'personal' | 'owner' | 'moderator' | 'member' | 'active' | 'locked',
  string
>;

export function exportCell(r: GroupMemberRow, f: ExportField, l: CellLabels): string {
  switch (f) {
    case 'group':
      return r.groupName;
    case 'name':
      return r.fullName;
    case 'email':
      return r.email;
    case 'phone':
      return r.phone;
    case 'type':
      return l[r.accountType];
    case 'company':
      return r.company;
    case 'tax':
      return r.taxCode;
    case 'grole':
      return l[r.groupRole];
    case 'country':
      return r.country;
    case 'date':
      return vnDate(r.joinedAt);
    case 'status':
      return l[r.status];
  }
}

/** BOM UTF-8 để Excel đọc đúng tiếng Việt */
const BOM = String.fromCharCode(0xfeff);
const csvEsc = (x: string) => `"${x.replace(/"/g, '""')}"`;
const htmlEsc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Nội dung file: CSV (BOM UTF-8) hoặc bảng HTML mở được bằng Excel như prototype */
export function exportFile(head: string[], rows: string[][], format: 'csv' | 'xls') {
  if (format === 'csv') {
    const csv = [head.map(csvEsc).join(','), ...rows.map((r) => r.map(csvEsc).join(','))].join(
      '\r\n',
    );
    return new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
  }
  const tr = (cells: string[], tag: 'th' | 'td') =>
    `<tr>${cells.map((c) => `<${tag}>${htmlEsc(c)}</${tag}>`).join('')}</tr>`;
  const html = `<html><head><meta charset="utf-8"></head><body><table border="1">${tr(head, 'th')}${rows
    .map((r) => tr(r, 'td'))
    .join('')}</table></body></html>`;
  return new Blob([BOM + html], { type: 'application/vnd.ms-excel' });
}

/** Tên file "opchub-thanh-vien-nhom-YYYYMMDD" theo ngày giờ VN */
export function exportName(now: Date) {
  const [d = '', m = '', y = ''] = vnDate(now.toISOString()).split('/');
  return `opchub-thanh-vien-nhom-${y}${m}${d}`;
}
