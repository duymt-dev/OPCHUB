import { beforeEach, describe, expect, it } from 'vitest';
import { groupFileQuerySchema } from '../../api-domains';
import { listChatRooms } from './chat-ops';
import { deleteMockRoom, groupFiles, renameMockRoom } from './chat-topics';
import { getGroupDetail } from './group-admin';
import { mockDb, resetMockDb } from './store';

const query = (raw: Record<string, string> = {}) => groupFileQuerySchema.parse(raw);
const room = (key: string) => `c1-${key}`;

describe('mock File chia sẻ + chủ đề (TIP-V42-709)', () => {
  beforeEach(() => resetMockDb());

  it('D-98 gom file mọi chủ đề của nhóm, chip đếm toàn bộ, tìm theo tên / người gửi, ngoài nhóm 403', () => {
    const r = groupFiles('m1', 'c1', query());
    if (!r.ok) throw new Error(r.message);
    expect(r.data.items.map((f) => f.name).sort()).toEqual(
      ['Checklist-thue-Q4.pdf', 'Mau-hop-dong-OPC.docx', 'Mau-hop-dong-dich-vu.docx'].sort(),
    );
    expect(r.data.counts).toEqual({ all: 3, doc: 3, img: 0 });
    const hit = groupFiles('m1', 'c1', query({ q: 'vu duc' }));
    expect(hit.ok && hit.data.items.map((f) => f.name)).toEqual(['Mau-hop-dong-dich-vu.docx']);
    expect(hit.ok && hit.data.counts.all).toBe(3);
    const page = groupFiles('m1', 'c1', query({ size: '2' }));
    if (!page.ok) throw new Error(page.message);
    expect(page.data.items).toHaveLength(2);
    const next = groupFiles('m1', 'c1', query({ size: '2', before: page.data.nextCursor ?? '' }));
    expect(next.ok && next.data.items).toHaveLength(1);
    expect(groupFiles('khong-co', 'c1', query())).toMatchObject({ ok: false, status: 403 });
  });

  it('D-111 đổi tên (trùng → 409, "Chung" khoá) + xoá mềm: phòng ẩn, file ẩn, tin giữ', () => {
    expect(
      renameMockRoom('a1', 'c1', room('qa'), { name: 'Hỏi & đáp', description: 'x' }),
    ).toMatchObject({
      ok: true,
      data: { name: 'Hỏi & đáp' },
    });
    expect(
      renameMockRoom('a1', 'c1', room('qa'), { name: 'chia sẻ MẪU biểu', description: '' }),
    ).toMatchObject({
      ok: false,
      status: 409,
    });
    expect(
      renameMockRoom('a1', 'c1', room('general'), { name: 'Chung 2', description: '' }),
    ).toMatchObject({ ok: false, status: 409 });
    expect(deleteMockRoom('a1', 'c1', room('general'))).toMatchObject({ ok: false, status: 409 });
    expect(deleteMockRoom('a1', 'c1', room('docs'))).toMatchObject({ ok: true });
    const rooms = listChatRooms('m1', 'c1');
    expect(rooms.ok && rooms.data.some((r) => r.id === room('docs'))).toBe(false);
    const files = groupFiles('m1', 'c1', query());
    expect(files.ok && files.data.counts.all).toBe(1);
    expect(mockDb().messages.get(room('docs'))?.length).toBeGreaterThan(0);
    // Form Admin theo phòng còn sống: bỏ "docs" khỏi roomKeys, chi tiết không còn phòng đã xoá
    const d = getGroupDetail('c1');
    if (!d.ok) throw new Error(d.message);
    expect(d.data.roomKeys).not.toContain('docs');
    expect(d.data.rooms.some((r) => r.id === room('docs'))).toBe(false);
    expect(d.data.rooms.find((r) => r.id === room('qa'))?.name).toBe('Hỏi & đáp');
  });
});
