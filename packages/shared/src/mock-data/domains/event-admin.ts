import type {
  AdminEvent,
  AdminEventUpsert,
  AdminUpcoming,
  EventCheckInResult,
  EventRegistrant,
  EventRegistrantsExport,
} from '../../api-domains';
import { members } from '../../fixtures';
import { recordAudit } from './group-admin';
import { deleteEvent, upsertEvent } from './ops-content';
import { mockDb, type MockDb } from './store';
import { DAY_MS, iso, MOCK_NOW, notFound, ok, type MockResult } from './util';
import { resolveMemberInfo } from './events-bridge';

/**
 * Phần mở rộng CSDL giả cho màn Admin "Nội dung & Sự kiện" (G5a): giờ kết thúc, link bản đồ,
 * nhóm tổ chức, mở/đóng đăng ký, ảnh bìa, danh sách đăng ký mẫu + check-in.
 * WeakMap theo MockDb nên `resetMockDb()` tự dựng lại. Thao tác ghi → audit (luật 10).
 */

interface EventExt {
  endTime: string | null;
  groupId: string | null;
  registrationOpen: boolean;
}

interface EventAdminState {
  ext: Map<string, EventExt>;
  /** eventId → userId đã check-in */
  checkedIn: Map<string, Set<string>>;
}

/** Người đăng ký mẫu của prototype (drawer "Danh sách đăng ký": tối đa 7 người) */
const SEED_REGISTRANTS = [
  'Trần Quốc Bảo',
  'Lê Minh Anh',
  'Phạm Thu Hà',
  'Đỗ Hải Yến',
  'Vũ Đức Long',
  'Hoàng Gia Linh',
  'Ngô Thành Đạt',
];
const MAX_SEED = 7;

const states = new WeakMap<MockDb, EventAdminState>();

function state(): EventAdminState {
  const db = mockDb();
  let s = states.get(db);
  if (!s) {
    s = { ext: new Map(), checkedIn: new Map() };
    states.set(db, s);
  }
  return s;
}

function extOf(id: string): EventExt {
  const s = state();
  let e = s.ext.get(id);
  if (!e) {
    e = {
      endTime: null,
      groupId: null,
      registrationOpen: true,
    };
    s.ext.set(id, e);
  }
  return e;
}

export function listAdminEvents(): AdminEvent[] {
  return mockDb().events.map((e) => ({ ...e, registeredByMe: false, ...extOf(e.id) }));
}

export function saveAdminEvent(
  actorId: string,
  input: AdminEventUpsert,
  id?: string,
): MockResult<AdminEvent> {
  const { endTime, mapUrl, groupId, registrationOpen, coverUrl, meetUrl, ...base } = input;
  const r = upsertEvent(base, id);
  if (!r.ok) return r;
  const ext: EventExt = { endTime, groupId, registrationOpen };
  state().ext.set(r.data.id, ext);
  // BUG-011 / EV-R01: ảnh bìa, link Meet, bản đồ nằm trên dòng sự kiện → Portal + Admin cùng thấy
  const ev = mockDb().events.find((e) => e.id === r.data.id);
  const mapOf = base.mode === 'offline' ? mapUrl : null;
  if (ev) Object.assign(ev, { coverUrl, meetUrl, mapUrl: mapOf });
  recordAudit(actorId, id ? 'event.update' : 'event.create', r.data.id, r.data.title);
  return ok({ ...r.data, coverUrl, meetUrl, mapUrl: mapOf, ...ext });
}

export function removeAdminEvent(actorId: string, id: string): MockResult<{ id: string }> {
  const r = deleteEvent(id);
  if (r.ok) recordAudit(actorId, 'event.delete', id);
  return r;
}

const userOf = (name: string) => members.find((m) => m.name === name);
const slug = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z]+/g, '.');

const FIXTURE_EVENT_IDS = new Set(['e1', 'e2', 'e3', 'e4', 'e5']);

/** Mẫu prototype (≤ 7, theo số đã đăng ký) + người đăng ký thật trong CSDL giả */
export function listEventRegistrants(eventId: string): MockResult<EventRegistrant[]> {
  const db = mockDb();
  const ev = db.events.find((e) => e.id === eventId);
  if (!ev) return notFound('Không tìm thấy sự kiện');
  const done = state().checkedIn.get(eventId) ?? new Set<string>();
  const isFixture = FIXTURE_EVENT_IDS.has(eventId);
  const rows: EventRegistrant[] = isFixture
    ? SEED_REGISTRANTS.slice(0, Math.min(MAX_SEED, ev.registered)).map((name, i) => {
        const m = userOf(name);
        const userId = m?.id ?? `g-${slug(name)}`;
        return {
          userId,
          fullName: name,
          email: m?.email ?? `${slug(name)}@opchub.vn`,
          phone: m?.phone ?? '',
          org: m?.org ?? 'Thành viên OPC',
          status: done.has(userId) ? 'attended' : 'registered',
          registeredAt: iso(MOCK_NOW - (i + 1) * DAY_MS),
        };
      })
    : [];
  for (const uid of db.eventRegs.get(eventId) ?? []) {
    if (rows.some((r) => r.userId === uid)) continue;
    const info = resolveMemberInfo(uid);
    rows.push({
      userId: uid,
      fullName: info.fullName,
      email: info.email,
      phone: info.phone,
      org: info.org,
      status: done.has(uid) ? 'attended' : 'registered',
      registeredAt: iso(MOCK_NOW),
    });
  }
  return ok(rows);
}

/** Check-in / bỏ check-in một hoặc nhiều người (ghi audit) */
export function checkInRegistrants(
  actorId: string,
  eventId: string,
  userIds: string[],
  attended: boolean,
): MockResult<EventCheckInResult> {
  const list = listEventRegistrants(eventId);
  if (!list.ok) return list;
  const known = new Set(list.data.map((r) => r.userId));
  const s = state();
  const done = s.checkedIn.get(eventId) ?? new Set<string>();
  s.checkedIn.set(eventId, done);
  for (const uid of userIds) {
    if (!known.has(uid)) continue;
    if (attended) done.add(uid);
    else done.delete(uid);
  }
  recordAudit(
    actorId,
    attended ? 'event.check_in' : 'event.check_in_undo',
    eventId,
    userIds.join(','),
  );
  const after = listEventRegistrants(eventId);
  if (!after.ok) return after;
  const items = after.data;
  // EV-R05: "Đã check-in x/y"
  return ok({
    items,
    checkedIn: items.filter((r) => r.status === 'attended').length,
    total: items.length,
  });
}

const VN_OFFSET_MS = 7 * 3_600_000;
const vnDay = (t: number) => Math.floor((t + VN_OFFSET_MS) / DAY_MS);

/** EV-R02: như server — đang mở đăng ký, chưa qua (bắt đầu + 2h), từ đầu ngày VN hôm nay */
export function adminUpcoming(now = Date.now()): AdminUpcoming {
  const today = vnDay(now);
  const rows = listAdminEvents()
    .filter((e) => e.registrationOpen)
    .map((e) => ({ e, t: Date.parse(e.startsAt) }))
    .filter(({ t }) => vnDay(t) >= today && t + 2 * 3_600_000 > now)
    .sort((a, b) => a.t - b.t || a.e.id.localeCompare(b.e.id))
    .slice(0, 4)
    .map(({ e, t }) => ({ ...e, inDays: vnDay(t) - today }));
  const [next, ...more] = rows;
  return { next: next ?? null, more };
}

const BOM = String.fromCharCode(0xfeff);
const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
const STATUS_LABEL = { registered: 'Đã đăng ký', attended: 'Đã check-in', cancelled: 'Đã huỷ' };

/** Xuất CSV danh sách đăng ký — xuất dữ liệu cá nhân nên ghi audit (luật 10) */
export function exportEventRegistrants(
  actorId: string,
  eventId: string,
): MockResult<EventRegistrantsExport> {
  const list = listEventRegistrants(eventId);
  if (!list.ok) return list;
  const head = 'Họ tên,Tổ chức,Email,Điện thoại,Trạng thái,Ngày đăng ký';
  const body = list.data.map((r) =>
    [r.fullName, r.org, r.email, r.phone, STATUS_LABEL[r.status], r.registeredAt.slice(0, 10)]
      .map(cell)
      .join(','),
  );
  recordAudit(actorId, 'event.registrants_export', eventId, `${list.data.length} dòng`);
  return ok({ filename: `dang-ky-${eventId}.csv`, csv: `${BOM}${[head, ...body].join('\n')}` });
}
