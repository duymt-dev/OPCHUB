import { members } from '../../fixtures';
import { registrationState } from './registration/state';
import { mockDb, type MockDb } from './store';

/**
 * Cầu Portal ↔ Admin (MSW, cùng host khác cổng): chép lượt đăng ký sự kiện và trạng thái
 * đóng/mở đăng ký giữa Portal và Admin.
 */
export const EVENT_BRIDGE_COOKIE = 'opchub-mock-ev-regs';
const MAX_COOKIE = 3800;

export const SEED_REGISTRANT_NAMES: readonly string[] = [
  'Trần Quốc Bảo',
  'Lê Minh Anh',
  'Phạm Thu Hà',
  'Đỗ Hải Yến',
  'Vũ Đức Long',
  'Hoàng Gia Linh',
  'Ngô Thành Đạt',
];

export const slugName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z]+/g, '.');

export interface EventRegistrationMark {
  eventId: string;
  userId: string;
  registered: boolean;
  at: string;
  fullName?: string;
  email?: string;
  phone?: string;
  org?: string;
}

export interface EventStatusMark {
  id?: string | undefined;
  eventId?: string | undefined;
  registrationOpen: boolean;
  at?: string | undefined;
}

export interface EventBridgePayload {
  regs: EventRegistrationMark[];
  status: EventStatusMark[];
}

export interface BridgeMemberProfile {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  org: string;
}

const bridgeProfiles = new WeakMap<MockDb, Map<string, BridgeMemberProfile>>();

export function saveBridgeProfile(userId: string, brief: BridgeMemberProfile): void {
  const db = mockDb();
  let m = bridgeProfiles.get(db);
  if (!m) {
    m = new Map();
    bridgeProfiles.set(db, m);
  }
  m.set(userId, brief);
}

export function getBridgeProfile(userId: string): BridgeMemberProfile | undefined {
  return bridgeProfiles.get(mockDb())?.get(userId);
}

/** Tra cứu thông tin hiển thị của thành viên đăng ký sự kiện (ưu tiên từ hồ sơ thật) */
export function resolveMemberInfo(userId: string): BridgeMemberProfile {
  const m = members.find((x) => x.id === userId);
  if (m) {
    return {
      userId,
      fullName: m.name,
      email: m.email,
      phone: m.phone ?? '',
      org: m.org ?? 'Thành viên OPC',
    };
  }
  const reg = registrationState().profiles.get(userId);
  if (reg) {
    return {
      userId,
      fullName: reg.fullName,
      email: reg.email,
      phone: reg.phone ?? '',
      org:
        (reg.accountType === 'business' ? reg.business?.companyName : undefined) ??
        (reg.organization || 'Thành viên OPC'),
    };
  }
  const fee = mockDb().fees.find((f) => f.userId === userId);
  if (fee) {
    return {
      userId,
      fullName: fee.fullName,
      email: fee.email,
      phone: '',
      org: 'Thành viên OPC',
    };
  }
  const bridge = getBridgeProfile(userId);
  if (bridge) {
    return bridge;
  }
  if (userId.startsWith('g-')) {
    const s = userId.slice(2);
    const hit = SEED_REGISTRANT_NAMES.find((n) => slugName(n) === s);
    if (hit) {
      return {
        userId,
        fullName: hit,
        email: `${s}@opchub.vn`,
        phone: '',
        org: 'Thành viên OPC',
      };
    }
  }
  return {
    userId,
    fullName: userId.startsWith('u-') ? 'Thành viên mới' : userId,
    email: `${userId}@opchub.vn`,
    phone: '',
    org: 'Thành viên OPC',
  };
}

function decode(raw: string | undefined): EventBridgePayload {
  if (!raw) return { regs: [], status: [] };
  try {
    const text = raw.startsWith('%5B') || raw.startsWith('%7B') ? decodeURIComponent(raw) : raw;
    const v: unknown = JSON.parse(text);
    if (Array.isArray(v)) {
      return { regs: v as EventRegistrationMark[], status: [] };
    }
    const obj = v as Partial<EventBridgePayload>;
    return {
      regs: Array.isArray(obj.regs) ? obj.regs : [],
      status: Array.isArray(obj.status) ? obj.status : [],
    };
  } catch {
    return { regs: [], status: [] };
  }
}

/**
 * Gộp lượt đăng ký và trạng thái mở/đóng app kia đã ghi (gọi đầu mỗi request MSW).
 */
export function syncEventBridge(raw: string | undefined): void {
  const db = mockDb();
  const payload = decode(raw);
  for (const mark of payload.regs) {
    const regs = db.eventRegs.get(mark.eventId) ?? new Set<string>();
    db.eventRegs.set(mark.eventId, regs);
    const ev = db.events.find((e) => e.id === mark.eventId);
    if (mark.registered) {
      if (!regs.has(mark.userId)) {
        regs.add(mark.userId);
        if (ev) ev.registered += 1;
      }
    } else {
      if (regs.has(mark.userId)) {
        regs.delete(mark.userId);
        if (ev) ev.registered = Math.max(0, ev.registered - 1);
      }
    }
    if (mark.fullName) {
      saveBridgeProfile(mark.userId, {
        userId: mark.userId,
        fullName: mark.fullName,
        email: mark.email ?? `${mark.userId}@opchub.vn`,
        phone: mark.phone ?? '',
        org: mark.org ?? 'Thành viên OPC',
      });
    }
  }
  for (const st of payload.status) {
    const targetId = st.id ?? st.eventId;
    const ev = db.events.find((e) => e.id === targetId);
    if (ev) {
      ev.registrationOpen = st.registrationOpen;
    }
  }
}

/**
 * Tạo giá trị Set-Cookie khi đăng ký / huỷ đăng ký hoặc đóng / mở đăng ký sự kiện.
 */
export function eventBridgeCookie(
  raw: string | undefined,
  addReg?: EventRegistrationMark,
  addStatus?: EventStatusMark,
): string {
  const current = decode(raw);
  if (addReg) {
    current.regs = current.regs.filter(
      (x) => !(x.eventId === addReg.eventId && x.userId === addReg.userId),
    );
    current.regs.push(addReg);
  }
  if (addStatus) {
    const stId = addStatus.id ?? addStatus.eventId;
    current.status = current.status.filter((x) => (x.id ?? x.eventId) !== stId);
    current.status.push({
      id: stId,
      eventId: stId,
      registrationOpen: addStatus.registrationOpen,
      at: addStatus.at ?? new Date().toISOString(),
    });
  }
  let v = encodeURIComponent(JSON.stringify(current));
  while (v.length > MAX_COOKIE && current.regs.length > 1) {
    current.regs.shift();
    v = encodeURIComponent(JSON.stringify(current));
  }
  return `${EVENT_BRIDGE_COOKIE}=${v}; Path=/`;
}
