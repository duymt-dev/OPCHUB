import {
  exportStatusSchema,
  reportExportResponseSchema,
  reportPreviewSchema,
  reportScopesSchema,
} from '@opchub/shared/api-domains';
import { resetMockDb } from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;
const as = (uid: string) => ({
  Authorization: `Bearer mock.${uid}`,
  'Content-Type': 'application/json',
});

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => resetMockDb());
afterAll(() => server.close());

const preview = (qs: string, uid = 'admin') =>
  fetch(`${BASE}/admin/reports/preview?${qs}`, { headers: as(uid) });

/** V4-614 (D-78) MSW: phạm vi, xem trước B1/B2/B3, job xuất `report` → CSV đúng khuôn */
describe('MSW Admin › Báo cáo (V4-614)', () => {
  it('phạm vi: 34 nhóm, tỉnh kèm vùng', async () => {
    const s = reportScopesSchema.parse(
      await (await fetch(`${BASE}/admin/reports/scopes`, { headers: as('admin') })).json(),
    );
    expect(s.groups).toHaveLength(34);
    expect(s.provinces.find((p) => p.name === 'Hà Nội')).toEqual({
      name: 'Hà Nội',
      region: 'north',
    });
  });

  it('B2 Hà Nội: một dòng / nhóm; B3 Miền Bắc: Tổng vùng = tổng phí các tỉnh', async () => {
    const b2 = reportPreviewSchema.parse(
      await (await preview('template=b2&month=2026-09&province=H%C3%A0%20N%E1%BB%99i')).json(),
    );
    expect(b2.groups.map((g) => g.name)).toEqual(['OPC Hà Nội']);
    expect(b2.metrics.totalRevenue).toBe(b2.metrics.feeRevenue + b2.metrics.fundraisingRevenue);
    const b3 = reportPreviewSchema.parse(
      await (await preview('template=b3&month=2026-09&region=north')).json(),
    );
    expect(b3.scope).toBe('Miền Bắc');
    expect(b3.provinces.reduce((a, r) => a + r.feeRevenue, 0)).toBe(b3.metrics.feeRevenue);
  });

  it('400 tháng tương lai / thiếu phạm vi; 404 nhóm không có; 403 thiếu reports.view', async () => {
    expect((await preview('template=b1&month=2026-11&groupId=c1')).status).toBe(400);
    expect((await preview('template=b2&month=2026-09')).status).toBe(400);
    expect((await preview('template=b1&month=2026-09&groupId=khong-co')).status).toBe(404);
    expect((await preview('template=b1&month=2026-09&groupId=c1', 'adm-yen')).status).toBe(403);
    expect((await preview('template=b1&month=2026-09&groupId=c1', 'adm-mai')).status).toBe(200);
  });

  it('xuất B1 → running → done, link tải đúng tên + CSV có BOM, 17 dòng', async () => {
    const r = await fetch(`${BASE}/admin/reports/export`, {
      method: 'POST',
      headers: as('admin'),
      body: JSON.stringify({ template: 'b1', month: '2026-09', groupId: 'c1' }),
    });
    expect(r.status).toBe(202);
    const { jobId } = reportExportResponseSchema.parse(await r.json());
    const status = async () =>
      exportStatusSchema.parse(
        await (await fetch(`${BASE}/admin/exports/${jobId}`, { headers: as('admin') })).json(),
      );
    expect((await status()).status).toBe('running');
    const done = await status();
    expect(done).toMatchObject({ kind: 'report', status: 'done' });
    expect(done.url).toMatch(/\/Bao-cao-B1-2026-09-OPC-Ha-Noi\.csv$/);
    // `text()` bỏ BOM khi giải mã → kiểm byte thô
    const bytes = new Uint8Array(await (await fetch(done.url ?? '')).arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const lines = new TextDecoder().decode(bytes).split('\n');
    expect(lines).toHaveLength(17);
    expect(lines[2]).toMatch(/^"Tên nhóm ngành","OPC Hà Nội","Trưởng nhóm",/);
  });
});
