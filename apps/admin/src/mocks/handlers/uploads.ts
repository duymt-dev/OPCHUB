import { presignRequestSchema } from '@opchub/shared/api-domains';
import { http, HttpResponse } from 'msw/http';
import { parseBody } from './domain-util';
import { apiError, API } from './util';

/** Ảnh đã "tải lên" trong phiên MSW (giả MinIO) — như Portal `mocks/handlers/profile.ts` */
const uploads = new Map<string, { type: string; body: ArrayBuffer }>();

const keyOf = (p: Record<string, string | readonly string[] | undefined>): string => {
  const v = p.key;
  return typeof v === 'string' ? v : (v?.[0] ?? '');
};

/** TIP-V2-102: presign → PUT → GET cho ảnh bìa nhóm/sự kiện, persona, logo (NA-26) */
export const uploadHandlers = [
  http.post(`${API}/uploads/presign`, async ({ request }) => {
    const body = await parseBody(request, presignRequestSchema);
    if (!body.ok) return body.res;
    const key = `${body.data.kind}-${crypto.randomUUID()}`;
    const origin = new URL(request.url).origin;
    return HttpResponse.json({
      uploadUrl: `${origin}${API}/uploads/${key}`,
      publicUrl: `${origin}${API}/uploads/${key}`,
    });
  }),
  http.put(`${API}/uploads/:key`, async ({ request, params }) => {
    const type = request.headers.get('Content-Type') ?? 'image/png';
    uploads.set(keyOf(params), { type, body: await request.arrayBuffer() });
    return new HttpResponse(null, { status: 200 });
  }),
  http.get(`${API}/uploads/:key`, ({ params }) => {
    const file = uploads.get(keyOf(params));
    return file
      ? new HttpResponse(file.body, { headers: { 'Content-Type': file.type } })
      : apiError(404, 'NOT_FOUND', 'Không có ảnh');
  }),
];
