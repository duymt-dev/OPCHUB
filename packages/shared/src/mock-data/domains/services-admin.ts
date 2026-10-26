import {
  type AdminService,
  type AdminServiceComment,
  type CsvFile,
  type StaffMember,
} from '../../api-domains';
import { services } from '../../fixtures';
import { mockAdminsWith } from './admin-rbac';
import { recordAudit } from './group-admin';
import { listServiceRequests } from './ops-admin';
import { mockDb, nextId, type MockDb } from './store';
import { conflict, iso, notFound, ok, type MockResult } from './util';

/**
 * Admin "Dịch vụ" (D-61 → D-65): danh mục dịch vụ sửa được, phiếu YC + ghi chú nội bộ gắn tên,
 * audit (luật 10). D-72: không trạng thái, không phụ trách. WeakMap theo MockDb.
 */

const T0 = Date.UTC(2026, 9, 16, 2, 0);
const DAY = 864e5;
/** Tác giả bình luận mẫu của prototype (seed demo lọc bình luận theo danh sách này) */
export const SERVICE_STAFF: StaffMember[] = [
  { id: 'st1', name: 'Lê Minh Châu' },
  { id: 'st2', name: 'Phạm Thu Hà' },
  { id: 'st3', name: 'Trần Đức Anh' },
  { id: 'st4', name: 'Admin OPC Hub' },
];

/**
 * Người gắn tên được — khớp `ServiceAdminService.staff` của server (D-63, Q-B46-1, Q-V4-605-1):
 * TK quản trị active có `services.action` theo ma trận §21 hiện hành, xếp theo tên.
 */
export function serviceStaff(): StaffMember[] {
  return mockAdminsWith('services.action').sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

/** Bình luận mẫu của prototype (SEEDC) */
const SEED_COMMENTS: Record<string, Omit<AdminServiceComment, 'id'>[]> = {
  'YC-1004': [
    {
      authorName: 'Lê Minh Châu',
      body: '<p>Đã gọi anh Huy, bên Sở muốn bắt đầu từ <b>tháng 1/2027</b>. Cần báo giá cho 4 buổi.</p>',
      createdAt: iso(T0 - DAY),
      mentions: ['Phạm Thu Hà'],
    },
  ],
  'YC-1003': [
    {
      authorName: 'Phạm Thu Hà',
      body: '<p>Đã gửi báo giá <b>45 triệu</b> cho gói học liệu + 2 buổi đào tạo giảng viên.</p><ul><li>Chờ trường phản hồi trước 30/10</li></ul>',
      createdAt: iso(T0 - 2 * DAY),
      mentions: ['Trần Đức Anh'],
    },
  ],
};

interface ServiceState {
  catalog: Omit<AdminService, 'requestCount'>[];
  comments: Map<string, AdminServiceComment[]>;
}
const states = new WeakMap<MockDb, ServiceState>();

function state(): ServiceState {
  const db = mockDb();
  let s = states.get(db);
  if (!s) {
    s = {
      catalog: services.map((x) => ({
        id: x.id,
        name: x.n,
        model: x.m,
        description: x.d,
        enabled: !!x.on,
      })),
      comments: new Map(
        Object.entries(SEED_COMMENTS).map(([k, l]) => [
          k,
          l.map((c, i) => ({ ...c, id: `src-seed-${k}-${i}` })),
        ]),
      ),
    };
    states.set(db, s);
  }
  return s;
}

const countFor = (id: string) => mockDb().serviceRequests.filter((r) => r.serviceId === id).length;

export const listAdminServices = (): AdminService[] =>
  state().catalog.map((c) => ({ ...c, requestCount: countFor(c.id) }));

export function createAdminService(
  actorId: string,
  input: Omit<AdminService, 'id' | 'requestCount'>,
): MockResult<AdminService> {
  const svc = { id: nextId('sv'), ...input };
  state().catalog.push(svc);
  recordAudit(actorId, 'service.create', svc.id, svc.name);
  return ok({ ...svc, requestCount: 0 });
}

export function updateAdminService(
  actorId: string,
  id: string,
  patch: { [K in 'name' | 'model' | 'description' | 'enabled']?: AdminService[K] | undefined },
): MockResult<AdminService> {
  const svc = state().catalog.find((x) => x.id === id);
  if (!svc) return notFound('Không tìm thấy dịch vụ');
  Object.assign(svc, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)));
  recordAudit(actorId, 'service.update', id, Object.keys(patch).join(','));
  return ok({ ...svc, requestCount: countFor(id) });
}

/** Dịch vụ đã có phiếu YC thì không xoá được (prototype) — tắt hiển thị thay vì xoá */
export function deleteAdminService(actorId: string, id: string): MockResult<{ id: string }> {
  const s = state();
  const svc = s.catalog.find((x) => x.id === id);
  if (!svc) return notFound('Không tìm thấy dịch vụ');
  if (countFor(id) > 0) return conflict('Dịch vụ đã có yêu cầu – hãy tắt hiển thị thay vì xóa');
  s.catalog = s.catalog.filter((x) => x.id !== id);
  recordAudit(actorId, 'service.delete', id, svc.name);
  return ok({ id });
}

/** Tìm theo mã, tên, email, tổ chức (prototype) */
export const searchServiceRequests = (q?: string) => {
  const needle = (q ?? '').trim().toLowerCase();
  return listServiceRequests().filter(
    (r) =>
      !needle ||
      `${r.code} ${r.fullName} ${r.email} ${r.organization}`.toLowerCase().includes(needle),
  );
};

/** Badge menu "Dịch vụ" (Q-V4-605-2): phiếu chưa có ghi chú nội bộ — khớp server */
export const unnotedServiceRequestCount = () => {
  const notes = state().comments;
  return mockDb().serviceRequests.filter((r) => !(notes.get(r.code)?.length ?? 0)).length;
};

export function listAdminServiceComments(code: string): MockResult<AdminServiceComment[]> {
  if (!mockDb().serviceRequests.some((r) => r.code === code))
    return notFound('Không tìm thấy phiếu yêu cầu');
  return ok(state().comments.get(code) ?? []);
}

export function addAdminServiceComment(
  actorId: string,
  code: string,
  body: string,
  mentions: string[],
): MockResult<AdminServiceComment> {
  if (!mockDb().serviceRequests.some((r) => r.code === code))
    return notFound('Không tìm thấy phiếu yêu cầu');
  const s = state();
  const c: AdminServiceComment = {
    id: nextId('src'),
    authorName: 'Admin OPC Hub',
    body,
    createdAt: iso(Date.now()),
    mentions,
  };
  s.comments.set(code, [...(s.comments.get(code) ?? []), c]);
  recordAudit(actorId, 'service_request.comment', code, mentions.join(','));
  return ok(c);
}

const BOM = String.fromCharCode(0xfeff);
const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
const vnDate = (s: string) =>
  new Date(s).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  });

/** CSV mọi phiếu như prototype; xuất dữ liệu cá nhân → audit_logs (luật 10) */
export function exportServiceRequestsCsv(actorId: string): CsvFile {
  const all = mockDb().serviceRequests;
  const cat = new Map(state().catalog.map((c) => [c.id, c.name]));
  const head = 'Mã,Ngày gửi,Dịch vụ,Đối tượng,Người liên hệ,SĐT,Email,Tổ chức,MST,Tỉnh thành,Mô tả';
  const body = all
    .map((r) =>
      [
        r.code,
        vnDate(r.createdAt),
        cat.get(r.serviceId) ?? r.serviceName,
        r.requesterType === 'business' ? 'Doanh nghiệp / Tổ chức' : 'Cá nhân',
        r.fullName,
        r.phone,
        r.email,
        r.organization,
        r.taxCode,
        r.address,
        r.note,
      ]
        .map(cell)
        .join(','),
    )
    .join('\n');
  recordAudit(actorId, 'service_request.export', 'service_requests', String(all.length));
  return { filename: 'yeu-cau-dich-vu.csv', csv: `${BOM}${head}\n${body}` };
}
