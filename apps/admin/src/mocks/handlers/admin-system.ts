import {
  botSettingsPatchSchema,
  categoryUpsertSchema,
  createServiceCommentSchema,
  pageQuerySchema,
  personaUpsertSchema,
  rolePermissionsSchema,
  scriptUpsertSchema,
  serviceRequestQuerySchema,
  smtpTestSchema,
  smtpUpdateSchema,
  updateServiceRequestSchema,
  welcomeMailSchema,
} from '@opchub/shared/api-domains';
import { paginate } from '@opchub/shared/mock-data';
import {
  addServiceComment,
  categoryCrud,
  categoryFromInput,
  listServiceRequests,
  mockDb,
  personaCrud,
  personaFromInput,
  runScript,
  scriptCrud,
  scriptFromInput,
  updateServiceRequest,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import type { z } from 'zod';
import { param, parseBody, parseQuery, reply } from './domain-util';
import { API } from './util';

const srPageSchema = pageQuerySchema(10).extend(serviceRequestQuerySchema.shape);

interface Crud<T> {
  create: (d: T) => ReturnType<typeof reply>;
  update: (id: string, d: T) => ReturnType<typeof reply>;
  remove: (id: string) => ReturnType<typeof reply>;
}

/** CRUD REST chuẩn cho một tài nguyên admin: GET list, POST, PATCH/:id, DELETE/:id */
function crudRoutes<S extends z.ZodType>(
  path: string,
  schema: S,
  list: () => object[],
  c: Crud<z.output<S>>,
) {
  return [
    http.get(`${API}${path}`, () => HttpResponse.json({ items: list() })),
    http.post(`${API}${path}`, async ({ request }) => {
      const b = await parseBody(request, schema);
      return b.ok ? c.create(b.data) : b.res;
    }),
    http.patch(`${API}${path}/:id`, async ({ request, params }) => {
      const b = await parseBody(request, schema);
      return b.ok ? c.update(param(params, 'id'), b.data) : b.res;
    }),
    http.delete(`${API}${path}/:id`, ({ params }) => c.remove(param(params, 'id'))),
  ];
}

/** SRS §13 Services (admin) + Bot + Settings */
export const adminSystemHandlers = [
  http.get(`${API}/admin/service-requests`, ({ request }) => {
    const q = parseQuery(request.url, srPageSchema);
    if (!q.ok) return q.res;
    const rows = listServiceRequests(q.data.status, q.data.q);
    return HttpResponse.json(paginate(rows, q.data.page, q.data.size));
  }),
  http.patch(`${API}/admin/service-requests/:code`, async ({ request, params }) => {
    const b = await parseBody(request, updateServiceRequestSchema);
    return b.ok ? reply(updateServiceRequest(param(params, 'code'), b.data)) : b.res;
  }),
  http.get(`${API}/admin/service-requests/:code/comments`, ({ params }) =>
    HttpResponse.json({ items: mockDb().serviceComments.get(param(params, 'code')) ?? [] }),
  ),
  http.post(`${API}/admin/service-requests/:code/comments`, async ({ request, params }) => {
    const b = await parseBody(request, createServiceCommentSchema);
    if (!b.ok) return b.res;
    return reply(addServiceComment(param(params, 'code'), 'Quản trị hệ thống', b.data.body), 201);
  }),
  ...crudRoutes('/admin/personas', personaUpsertSchema, () => mockDb().personas, {
    create: (d) => reply(personaCrud.create(personaFromInput(d)), 201),
    update: (id, d) => reply(personaCrud.update(id, d)),
    remove: (id) => reply(personaCrud.remove(id)),
  }),
  ...crudRoutes('/admin/scripts', scriptUpsertSchema, () => mockDb().scripts, {
    create: (d) => reply(scriptCrud.create(scriptFromInput(d)), 201),
    update: (id, d) => reply(scriptCrud.update(id, d)),
    remove: (id) => reply(scriptCrud.remove(id)),
  }),
  http.post(`${API}/admin/scripts/:id/run`, ({ params }) =>
    reply(runScript(param(params, 'id')), 202),
  ),
  http.get(`${API}/admin/bot/settings`, () => HttpResponse.json(mockDb().botSettings)),
  http.patch(`${API}/admin/bot/settings`, async ({ request }) => {
    const b = await parseBody(request, botSettingsPatchSchema);
    if (!b.ok) return b.res;
    const db = mockDb();
    const patch = Object.fromEntries(Object.entries(b.data).filter(([, v]) => v !== undefined));
    db.botSettings = { ...db.botSettings, ...patch };
    return HttpResponse.json(db.botSettings);
  }),
  http.get(`${API}/admin/bot/log`, ({ request }) => {
    const q = parseQuery(request.url, pageQuerySchema(10));
    if (!q.ok) return q.res;
    return HttpResponse.json(paginate(mockDb().botLog, q.data.page, q.data.size));
  }),
  ...crudRoutes('/admin/categories', categoryUpsertSchema, () => mockDb().categories, {
    create: (d) => reply(categoryCrud.create(categoryFromInput(d)), 201),
    update: (id, d) => reply(categoryCrud.update(id, d)),
    remove: (id) => reply(categoryCrud.remove(id)),
  }),
  http.get(`${API}/admin/roles/permissions`, () => HttpResponse.json(mockDb().rolePermissions)),
  http.put(`${API}/admin/roles/permissions`, async ({ request }) => {
    const b = await parseBody(request, rolePermissionsSchema);
    if (!b.ok) return b.res;
    mockDb().rolePermissions = b.data;
    return HttpResponse.json(b.data);
  }),
  http.get(`${API}/admin/mail/welcome`, () => HttpResponse.json(mockDb().welcomeMail)),
  http.put(`${API}/admin/mail/welcome`, async ({ request }) => {
    const b = await parseBody(request, welcomeMailSchema);
    if (!b.ok) return b.res;
    mockDb().welcomeMail = b.data;
    return HttpResponse.json(b.data);
  }),
  http.get(`${API}/admin/smtp`, () => HttpResponse.json(mockDb().smtp)),
  http.put(`${API}/admin/smtp`, async ({ request }) => {
    const b = await parseBody(request, smtpUpdateSchema);
    if (!b.ok) return b.res;
    const db = mockDb();
    const { key, ...rest } = b.data;
    // Không bao giờ trả key ra ngoài
    db.smtp = { ...rest, hasKey: db.smtp.hasKey || !!key };
    return HttpResponse.json(db.smtp);
  }),
  http.post(`${API}/admin/smtp/test`, async ({ request }) => {
    const b = await parseBody(request, smtpTestSchema);
    if (!b.ok) return b.res;
    const okSend = mockDb().smtp.hasKey;
    return HttpResponse.json({
      ok: okSend,
      message: okSend ? `Đã gửi thư thử tới ${b.data.to}` : 'Chưa cấu hình API key SMTP',
    });
  }),
];
