import type { GroupKind, GroupMemberStatus, Region } from '@opchub/db';
import {
  DEFAULT_ROOM_KEYS,
  type DefaultRoomKey,
  type ExtraRoom,
  type GroupDetail,
  type GroupItem,
} from '@opchub/shared/api-domains';
import { regionLabel } from './region';

export interface GroupRow {
  id: string;
  name: string;
  province: string;
  region: Region;
  kind: GroupKind;
  industry: string | null;
  parentId: string | null;
  description: string;
  memberCount: number;
  weeklyActive: number;
  coverUrl: string | null;
}

export const GROUP_SELECT = {
  id: true,
  name: true,
  province: true,
  region: true,
  kind: true,
  industry: true,
  parentId: true,
  description: true,
  memberCount: true,
  weeklyActive: true,
  coverUrl: true,
} as const;

/** BUG-011: `avatars` ≤ 4 ảnh thành viên thật (một query cho cả trang — repository) */
export function toGroupItem(
  g: GroupRow,
  myStatus: GroupMemberStatus | null,
  avatars: readonly string[] = [],
): GroupItem {
  return {
    id: g.id,
    name: g.name,
    province: g.province,
    region: regionLabel(g.region),
    kind: g.kind,
    industry: g.industry,
    parentId: g.parentId,
    memberCount: g.memberCount,
    weeklyActive: g.weeklyActive,
    description: g.description,
    myStatus,
    coverUrl: g.coverUrl,
    avatars: avatars.slice(0, 4),
  };
}

/** Phòng mặc định Admin bật được (admin `groups.json › room`) */
export const DEFAULT_ROOMS: Record<DefaultRoomKey, { name: string; description: string }> = {
  general: { name: 'Chung', description: 'Phòng mặc định của nhóm' },
  qa: { name: 'Hỏi đáp', description: 'Hỏi & trả lời' },
  docs: { name: 'Tài liệu', description: 'Chia sẻ file' },
  events: { name: 'Sự kiện', description: 'Thông báo sự kiện' },
  board: { name: 'Ban điều hành', description: 'Riêng tư' },
};

const isDefaultKey = (slug: string): slug is DefaultRoomKey =>
  (DEFAULT_ROOM_KEYS as readonly string[]).includes(slug);

export interface RoomRow {
  id: string;
  isDefault: boolean;
  slug: string;
  name: string;
  description: string;
}

/** Phòng của nhóm → `roomKeys` (slug mặc định) + `extraRooms` (phòng còn lại, theo thứ tự tạo) */
export function splitRooms(rooms: readonly RoomRow[]): {
  roomKeys: DefaultRoomKey[];
  extraRooms: ExtraRoom[];
} {
  const roomKeys: DefaultRoomKey[] = [];
  const extraRooms: ExtraRoom[] = [];
  for (const r of rooms) {
    if (isDefaultKey(r.slug)) roomKeys.push(r.slug);
    else extraRooms.push({ name: r.name, description: r.description });
  }
  return { roomKeys, extraRooms };
}

/** Slug phòng thêm: bỏ dấu, chữ thường, `-`; trùng thì thêm số */
export function roomSlug(name: string, taken: ReadonlySet<string>): string {
  const base =
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'room';
  let slug = base;
  for (let i = 2; taken.has(slug); i += 1) slug = `${base}-${i}`;
  return slug;
}

export interface GroupDetailParts {
  group: GroupRow;
  rules: string[];
  ownerId: string;
  lecturerIds: string[];
  rooms: readonly RoomRow[];
}

export function toGroupDetail(p: GroupDetailParts): GroupDetail {
  return {
    ...toGroupItem(p.group, null),
    ownerId: p.ownerId,
    lecturerIds: p.lecturerIds,
    ...splitRooms(p.rooms),
    rules: p.rules,
    rooms: p.rooms.map((r) => ({
      id: r.id,
      key: r.slug,
      name: r.name,
      description: r.description,
      isDefault: r.isDefault,
    })),
  };
}
