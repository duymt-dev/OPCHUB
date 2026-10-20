import {
  assignGroupsSchema,
  feeBulkRemindSchema,
  type ExportStatus,
  feeQuerySchema,
  FEE_ACTIONS,
  groupUpsertSchema,
  pageQuerySchema,
  userExportSchema,
  userStatusUpdateSchema,
} from '@opchub/shared/api-domains';
import { paginate } from '@opchub/shared/mock-data';
import {
  assignGroups,
  deleteGroup,
  feeAction,
  listFees,
  listGroups,
  listAdminMembers,
  listJoinRequests,
  nextId,
  setUserStatus,
  upsertGroup,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { z } from 'zod';
import { param, parseBody, parseQuery, reply } from './domain-util';
import { apiError, API } from './util';

/** Như `membership-fee.service` khi version phí đổi giữa chừng (409) */
const FEE_CONFLICT_COOKIE = 'opchub-mock-fee-conflict';
const FEE_CONFLICT_MESSAGE = 'Phí vừa được cập nhật bởi thao tác khác';

const feePageSchema = pageQuerySchema(10).extend(feeQuerySchema.shape);
const feeActionSchema = z.enum(FEE_ACTIONS);
const exportJob = () => ({ jobId: nextId('job'), status: 'queued' as const });

/**
 * Job xuất thành viên giả (BUG-013, NA-14): lần hỏi đầu `running`, sau đó `done` + link tới CSV
 * dựng từ dữ liệu mock (như worker `export.run`). `/exports/:file` giả link ký của storage.
 */
const userJobs = new Map<string, { userIds: string[] | null; polls: number }>();
const USER_HEAD = ['Mã thành viên', 'Họ và tên', 'Email', 'Số điện thoại', 'Loại tài khoản'];
const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
function usersCsv(userIds: string[] | null): { csv: string; rows: number } {
  const all = listAdminMembers(undefined, undefined).items;
  const picked = userIds ? all.filter((m) => userIds.includes(m.id)) : all;
  const lines = picked.map((m) =>
    [m.id, m.fullName, m.email, m.phone, m.accountType === 'business' ? 'Doanh nghiệp' : 'Cá nhân']
      .map(cell)
      .join(','),
  );
  const body = [USER_HEAD.join(','), ...lines].join('\n');
  return { csv: String.fromCharCode(0xfeff) + body, rows: lines.length };
}
function userJobStatus(id: string, origin: string): ExportStatus | null {
  const job = userJobs.get(id);
  if (!job) return null;
  job.polls += 1;
  const base = { id, kind: 'users' as const };
  if (job.polls < 2) {
    return { ...base, status: 'running', rowCount: null, url: null, expiresInSec: null };
  }
  return {
    ...base,
    status: 'done',
    rowCount: usersCsv(job.userIds).rows,
    url: `${origin}${API}/exports/${id}.csv?ttl=3600`,
    expiresInSec: 3600,
  };
}

/** SRS §13 Membership (admin) + Users (admin) + Groups (admin). Thao tác ghi → audit_logs ở BE */
export const adminMemberHandlers = [
  http.get(`${API}/admin/fees`, ({ request }) => {
    const q = parseQuery(request.url, feePageSchema);
    if (!q.ok) return q.res;
    return HttpResponse.json(paginate(listFees(q.data.status, q.data.q), q.data.page, q.data.size));
  }),
  // Khai báo trước `:uid/:action` để "remind" không bị hiểu là uid
  http.post(`${API}/admin/fees/remind`, async ({ request }) => {
    const body = await parseBody(request, feeBulkRemindSchema);
    if (!body.ok) return body.res;
    return HttpResponse.json({ queued: body.data.userIds.length }, { status: 202 });
  }),
  http.post(`${API}/admin/fees/:uid/:action`, ({ params, cookies }) => {
    const a = feeActionSchema.safeParse(params.action);
    if (!a.success) return apiError(404, 'NOT_FOUND', 'Không tìm thấy');
    // BUG-024 (V2Q-78): cookie chỉ cho mock/test — giả lập thao tác khác vừa ghi nhận trước
    if (cookies[FEE_CONFLICT_COOKIE] === '1' && a.data !== 'remind')
      return apiError(409, 'CONFLICT', FEE_CONFLICT_MESSAGE);
    return reply(feeAction(param(params, 'uid'), a.data));
  }),
  http.patch(`${API}/admin/users/:id/status`, async ({ request, params }) => {
    const body = await parseBody(request, userStatusUpdateSchema);
    if (!body.ok) return body.res;
    return reply(setUserStatus(param(params, 'id'), body.data.status));
  }),
  http.post(`${API}/admin/users/assign-groups`, async ({ request }) => {
    const body = await parseBody(request, assignGroupsSchema);
    if (!body.ok) return body.res;
    return reply(assignGroups(body.data.userIds, body.data.groupIds, body.data.role));
  }),
  http.post(`${API}/admin/users/export`, async ({ request }) => {
    const body = await parseBody(request, userExportSchema);
    if (!body.ok) return body.res;
    const job = exportJob();
    userJobs.set(job.jobId, { userIds: body.data.userIds ?? null, polls: 0 });
    return HttpResponse.json(job, { status: 202 });
  }),
  http.get(`${API}/admin/exports/:id`, ({ params, request }) => {
    const s = userJobStatus(param(params, 'id'), new URL(request.url).origin);
    return s ? HttpResponse.json(s) : apiError(404, 'NOT_FOUND', 'Không tìm thấy yêu cầu xuất');
  }),
  http.get(`${API}/exports/:file`, ({ params }) => {
    const job = userJobs.get(param(params, 'file').replace(/\.csv$/, ''));
    if (!job) return apiError(404, 'NOT_FOUND', 'Không có tệp');
    return new HttpResponse(usersCsv(job.userIds).csv, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8' },
    });
  }),
  http.get(`${API}/admin/groups`, ({ request }) => {
    const q = parseQuery(request.url, pageQuerySchema(10));
    if (!q.ok) return q.res;
    return HttpResponse.json(paginate(listGroups(null, { q: q.data.q }), q.data.page, q.data.size));
  }),
  http.get(`${API}/admin/groups/requests`, () => HttpResponse.json({ items: listJoinRequests() })),
  http.post(`${API}/admin/groups`, async ({ request }) => {
    const body = await parseBody(request, groupUpsertSchema);
    if (!body.ok) return body.res;
    return reply(upsertGroup(body.data), 201);
  }),
  http.patch(`${API}/admin/groups/:id`, async ({ request, params }) => {
    const body = await parseBody(request, groupUpsertSchema);
    if (!body.ok) return body.res;
    return reply(upsertGroup(body.data, param(params, 'id')));
  }),
  http.delete(`${API}/admin/groups/:id`, ({ params }) => reply(deleteGroup(param(params, 'id')))),
  http.post(`${API}/admin/groups/:id/members/export`, () =>
    HttpResponse.json(exportJob(), { status: 202 }),
  ),
];
