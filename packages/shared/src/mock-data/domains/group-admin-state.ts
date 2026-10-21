import type { DefaultRoomKey, ExtraRoom } from '../../api-domains';
import { members } from '../../fixtures';
import { GROUP_OWNERS } from './chat-seed';
import { LOCKED_USERS } from './extras';
import { mockDb } from './store';
import type { MockDb } from './store-types';

export interface GroupExt {
  ownerId: string;
  lecturerIds: string[];
  roomKeys: DefaultRoomKey[];
  extraRooms: ExtraRoom[];
  rules: string[];
}
interface GroupAdminState {
  ext: Map<string, GroupExt>;
  keywords: string[];
  roles: Map<string, 'lecturer' | 'member'>;
}
export const DEFAULT_RULES = [
  'Tôn trọng thành viên, không công kích cá nhân',
  'Không spam, quảng cáo khi chưa được phép',
  'Không chia sẻ thông tin cá nhân nhạy cảm của người khác',
];
const KEYWORD_SEED = [
  'chuyển khoản trước',
  'bán tài khoản',
  'số CCCD',
  'mật khẩu',
  'đồ ngu',
  'kiếm tiền nhanh',
  'vay nóng',
];

/** Same initial owner provenance as packages/db/seed/demo/community.ts::ownersOf. */
function seedOwners() {
  const owners = new Map(Object.entries(GROUP_OWNERS));
  for (const member of members)
    for (const groupId of member.groups) {
      if (owners.has(groupId) || LOCKED_USERS.includes(member.id)) continue;
      const hasM2 = members.some((row) => row.id === 'm2' && row.groups.includes(groupId));
      owners.set(groupId, hasM2 ? 'm2' : member.id);
    }
  return owners;
}
const initialOwners = seedOwners();
const states = new WeakMap<MockDb, GroupAdminState>();
export function groupAdminState(): GroupAdminState {
  const db = mockDb();
  let state = states.get(db);
  if (!state) {
    state = { ext: new Map(), keywords: [...KEYWORD_SEED], roles: new Map() };
    states.set(db, state);
  }
  return state;
}
export function groupAdminExt(groupId: string): GroupExt {
  const state = groupAdminState();
  let value = state.ext.get(groupId);
  if (!value) {
    value = {
      ownerId: initialOwners.get(groupId) ?? '',
      lecturerIds: [],
      roomKeys: ['general', 'qa', 'docs'],
      extraRooms: [],
      rules: [...DEFAULT_RULES],
    };
    state.ext.set(groupId, value);
  }
  return value;
}
