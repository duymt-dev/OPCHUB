import type { GroupItem, Message, Report, Room } from '../../api-domains';
import { communities, members, regionOf, seed } from '../../fixtures';
import {
  GENERAL_ROOM,
  MESSAGE_REACTIONS,
  PINNED_MESSAGES,
  REPORT_SEED,
  TOPIC_SEED,
} from './extras';
import { avatarUrl, isoFromClock } from './util';

/** Seed prototype → DTO cho nhóm, phòng, tin nhắn, báo cáo (SRS §13 Groups/Chat) */

interface MsgSeed {
  who: string;
  time: string;
  text?: string;
  file?: string;
  size?: string;
  ext?: string;
}

const MSGS = seed.MSGS as Record<string, MsgSeed[]>;

/** Ảnh đại diện mẫu theo tên (các thành viên seed có `ph` trong team/bình luận) */
const PH_BY_NAME: Record<string, string> = {
  'Lê Minh Anh': 'women/44',
  'Trần Quốc Bảo': 'men/22',
  'Phạm Thu Hà': 'women/65',
  'Đỗ Hải Yến': 'women/33',
  'Somchai Prasert': 'men/32',
  'Hoàng Gia Linh': 'men/52',
  'Vũ Đức Long': 'men/46',
};
export const avatarOf = (name: string) => avatarUrl(PH_BY_NAME[name]);

export const roomIdOf = (groupId: string, roomKey: string) => `${groupId}-${roomKey}`;

/**
 * Ảnh thành viên trên thẻ nhóm (BUG-011): MSW dùng chân dung mẫu D_P của prototype theo thứ tự
 * nhóm như cũ (`(k*5 + j*3) % n`) để parity giữ 4 avatar; server trả ảnh thật của thành viên.
 */
const PORTRAITS = (seed.D_P as string[][]).map((p) => p[6] ?? '');
export const sampleAvatars = (order: number, step: number, offset: number, base = 0) =>
  [0, 1, 2, 3].flatMap((j) => {
    const url = avatarUrl(PORTRAITS[(order * step + j * offset + base) % PORTRAITS.length]);
    return url ? [url] : [];
  });

export function buildGroups(): Omit<GroupItem, 'myStatus'>[] {
  return communities.map((c, order) => ({
    id: c.id,
    name: c.name,
    province: c.province,
    region: regionOf(c.province),
    memberCount: c.members,
    weeklyActive: c.weekly,
    description: c.desc,
    coverUrl: null,
    avatars: sampleAvatars(order, 5, 3),
  }));
}

export function buildRooms(): Room[] {
  return communities.flatMap((c) =>
    [
      { ...GENERAL_ROOM, isDefault: true },
      ...(TOPIC_SEED[c.id] ?? []).map((t) => ({ ...t, isDefault: false })),
    ].map((r) => ({
      id: roomIdOf(c.id, r.id),
      groupId: c.id,
      name: r.name,
      description: r.desc,
      isDefault: r.isDefault,
    })),
  );
}

function toMessage(key: string, roomId: string, m: MsgSeed, i: number): Message {
  const metaKey = `${key}:${i}`;
  const reacts = MESSAGE_REACTIONS[metaKey] ?? {};
  return {
    id: `${roomId}-${i}`,
    roomId,
    sender: { name: m.who, avatarUrl: avatarOf(m.who) },
    body: m.text ?? '',
    attachment: m.file ? { name: m.file, size: m.size ?? '', ext: m.ext ?? '' } : null,
    reactions: Object.entries(reacts).map(([emoji, names]) => ({
      emoji,
      count: names.length,
      names,
    })),
    pinned: PINNED_MESSAGES.includes(metaKey),
    isSimulated: false,
    createdAt: isoFromClock(m.time),
  };
}

/** Tin nhắn theo roomId, cũ → mới */
export function buildMessages(): Map<string, Message[]> {
  const out = new Map<string, Message[]>();
  for (const [key, list] of Object.entries(MSGS)) {
    const [gid = '', rk = ''] = key.split(':');
    const roomId = roomIdOf(gid, rk);
    out.set(
      roomId,
      list.map((m, i) => toMessage(key, roomId, m, i)),
    );
  }
  return out;
}

export function buildReports(): Report[] {
  return REPORT_SEED.map((r) => ({
    id: r.id,
    senderName: r.who,
    groupName: r.room,
    body: r.text,
    hit: r.hit,
    reason: r.cat,
    source: r.src,
    reporterCount: r.by,
    status: 'open',
    createdAt: isoFromClock(r.time),
    violations: 0,
    senderLocked: false,
    lockedUntil: null,
    canLock: false,
  }));
}

/** Nhóm thành viên đã tham gia (MEMBERS.groups) */
export function memberGroupIds(userId: string): string[] {
  return members.find((m) => m.id === userId)?.groups ?? [];
}
