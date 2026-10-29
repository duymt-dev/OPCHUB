import { members } from '../../fixtures';
import { registrationState } from './registration/state';
import { mockDb, type MockDb } from './store';

/**
 * Cầu Portal ↔ Admin (MSW, cùng host khác cổng): chép lượt đăng ký sự kiện giữa Portal và Admin
 * (tương tự investor-bridge.ts, service-bridge.ts, stores-bridge.ts).
 */
export const EVENT_BRIDGE_COOKIE = 'opchub-mock-ev-regs';
const MAX_COOKIE = 3800;

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
  return {
    userId,
    fullName: userId.startsWith('u-') ? 'Thành viên mới' : userId,
    email: `${userId}@opchub.vn`,
    phone: '',
    org: 'Thành viên OPC',
  };
}

function decode(raw: string | undefined): EventRegistrationMark[] {
  if (!raw) return [];
  try {
    const text = raw.startsWith('%5B') || raw.startsWith('%7B') ? decodeURIComponent(raw) : raw;
    const v: unknown = JSON.parse(text);
    return Array.isArray(v) ? (v as EventRegistrationMark[]) : [];
  } catch {
    return [];
  }
}

/**
 * Gộp lượt đăng ký app kia đã ghi (gọi đầu mỗi request MSW trong Portal và Admin).
 */
export function syncEventBridge(raw: string | undefined): void {
  const db = mockDb();
  for (const mark of decode(raw)) {
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
}

/**
 * Tạo giá trị Set-Cookie khi đăng ký / huỷ đăng ký sự kiện.
 */
export function eventBridgeCookie(raw: string | undefined, mark: EventRegistrationMark): string {
  const list = decode(raw).filter((x) => !(x.eventId === mark.eventId && x.userId === mark.userId));
  list.push(mark);
  let v = encodeURIComponent(JSON.stringify(list));
  while (v.length > MAX_COOKIE && list.length > 1) {
    list.shift();
    v = encodeURIComponent(JSON.stringify(list));
  }
  return `${EVENT_BRIDGE_COOKIE}=${v}; Path=/`;
}
