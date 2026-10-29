import { createPrismaClient, type DbClient, Prisma } from '@opchub/db';
import { chatMessageSchema, groupFilePageSchema } from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadEnv } from '@/common/config';
import { STORAGE } from '@/common/integrations';
import { groupFilesQuery } from '@/modules/chat/repositories/group-files.query';
import { addMember, createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { appPath, fileBytes, type TempStorage, tempStorage } from '../uploads/storage.helper';

const at = (min: number) => new Date(Date.UTC(2026, 9, 1, 8, min));
const file = (name: string, ext: string) => ({
  name,
  size: '1.2 MB',
  ext,
  url: `https://cdn.test/${name}`,
});

/**
 * TIP-V42-709 (D-98, §27.7): tab "File chia sẻ" — file + ảnh mọi chủ đề còn sống của nhóm, bỏ tin ẩn,
 * mới nhất trước, keyset; chip đếm theo toàn bộ; chỉ thành viên. Đính kèm tối đa 20 MB.
 */
describe('File chia sẻ theo nhóm (TIP-V42-709)', () => {
  let t: TestApp;
  let store: TempStorage;
  beforeAll(async () => {
    store = await tempStorage();
    t = await createTestApp({ overrides: [[STORAGE, store.provider]] });
  });
  afterAll(async () => {
    await removeTestGroups(t);
    await t.close();
    await store.dispose();
  });
  beforeEach(() => flushAuthState(t));

  /** Nhóm 3 chủ đề: Chung + Hỏi đáp + 1 chủ đề đã xoá; tin file / ảnh / chữ, 1 tin ẩn */
  async function seedGroup() {
    const g = await createGroup(t);
    const mem = await createUser(t, { fee: 'active' });
    await addMember(t, g.id, mem.id);
    const general = `${g.id}-general`;
    const qa = `${g.id}-qa`;
    const gone = `${g.id}-gone`;
    await t.prisma.db.room.createMany({
      data: [
        { id: qa, groupId: g.id, slug: 'hoi-dap', name: 'Hỏi đáp' },
        { id: gone, groupId: g.id, slug: 'cu', name: 'Chủ đề cũ', deletedAt: new Date() },
      ],
    });
    const msg = (roomId: string, kind: 'file' | 'image' | 'text', min: number, name = '') => ({
      roomId,
      senderId: mem.id,
      kind,
      body: '',
      createdAt: at(min),
      ...(name ? { attachment: file(name, name.split('.').pop()?.toUpperCase() ?? '') } : {}),
    });
    await t.prisma.db.message.createMany({
      data: [
        msg(general, 'file', 1, 'Hop-dong-mau.docx'),
        msg(qa, 'image', 2, 'anh-su-kien.png'),
        msg(qa, 'file', 3, 'Bao-cao-thue.pdf'),
        { ...msg(general, 'file', 4, 'An.pdf'), hiddenAt: at(5) },
        msg(gone, 'file', 6, 'Phong-xoa.xlsx'),
        msg(general, 'text', 7),
      ],
    });
    return { g, mem, token: await tokenOf(t, mem), general };
  }

  const page = async (token: string, groupId: string, qs = '') => {
    const r = await t.call(`/groups/${groupId}/files${qs}`, { token });
    expect(r.status).toBe(200);
    return groupFilePageSchema.parse(await r.json());
  };

  it('đủ file + ảnh chủ đề còn sống, bỏ tin ẩn, mới nhất trước; counts toàn bộ; ngoài nhóm 403', async () => {
    const { g, mem, token } = await seedGroup();
    const { fullName } = await t.prisma.db.user.findUniqueOrThrow({
      where: { id: mem.id },
      select: { fullName: true },
    });
    const all = await page(token, g.id);
    expect(all.items.map((f) => f.name)).toEqual([
      'Bao-cao-thue.pdf',
      'anh-su-kien.png',
      'Hop-dong-mau.docx',
    ]);
    expect(all.counts).toEqual({ all: 3, doc: 2, img: 1 });
    expect(all.nextCursor).toBeNull();
    expect(all.items[1]).toMatchObject({ kind: 'img', ext: 'IMG', size: '', roomKey: 'hoi-dap' });
    expect(all.items[0]).toMatchObject({ kind: 'doc', roomName: 'Hỏi đáp', sender: fullName });
    // Lọc loại + tìm không dấu theo tên tệp hoặc người gửi; counts không theo q
    const img = await page(token, g.id, '?kind=img');
    expect(img.items.map((f) => f.name)).toEqual(['anh-su-kien.png']);
    const q = await page(token, g.id, `?q=${encodeURIComponent('báo-cáo')}`);
    expect(q.items.map((f) => f.name)).toEqual(['Bao-cao-thue.pdf']);
    expect(q.counts.all).toBe(3);
    const bySender = await page(token, g.id, `?q=${encodeURIComponent(fullName)}`);
    expect(bySender.items).toHaveLength(3);
    // Keyset: trang 1 size 2 → trang 2 theo before
    const p1 = await page(token, g.id, '?size=2');
    expect(p1.items).toHaveLength(2);
    const p2 = await page(token, g.id, `?size=2&before=${p1.nextCursor ?? ''}`);
    expect(p2.items.map((f) => f.name)).toEqual(['Hop-dong-mau.docx']);
    expect(p2.nextCursor).toBeNull();
    const out = await tokenOf(t, await createUser(t, { fee: 'active' }));
    expect((await t.call(`/groups/${g.id}/files`, { token: out })).status).toBe(403);
  });

  it('D-98 đính kèm 15 MB CSV nhận, 21 MB → 400', async () => {
    const { general, token } = await seedGroup();
    const presign = (size: number) =>
      t.call('/uploads/presign', {
        method: 'POST',
        token,
        json: { kind: 'chat-file', contentType: 'text/csv', size },
      });
    expect((await presign(21 * 1024 * 1024)).status).toBe(400);
    const size = 15 * 1024 * 1024;
    const r = await presign(size);
    expect(r.status).toBe(200);
    const { uploadUrl, publicUrl } = (await r.json()) as { uploadUrl: string; publicUrl: string };
    const put = await t.call(appPath(uploadUrl), {
      method: 'PUT',
      body: fileBytes('text/csv', size),
      headers: { 'Content-Type': 'text/csv' },
    });
    expect(put.status).toBe(200);
    const sent = await t.call(`/rooms/${general}/messages`, {
      method: 'POST',
      token,
      json: {
        clientMsgId: randomUUID(),
        kind: 'file',
        attachment: { name: 'so-lieu.csv', size: '', ext: '', url: publicUrl, bytes: size },
      },
    });
    expect(sent.status).toBe(201);
    expect(chatMessageSchema.parse(await sent.json()).attachment).toMatchObject({
      ext: 'CSV',
      contentType: 'text/csv',
    });
  });
});

describe('File chia sẻ — EXPLAIN keyset (TIP-V42-709)', () => {
  let db: DbClient;
  beforeAll(async () => {
    // Bản sao tạm theo schema đã triển khai (cột, CHECK, index partial) — đo kế hoạch tách khỏi dữ liệu test khác
    db = createPrismaClient(loadEnv().DATABASE_URL, { max: 1 });
    await db.$executeRaw`CREATE TEMP TABLE rooms (LIKE public.rooms INCLUDING ALL)`;
    await db.$executeRaw`CREATE TEMP TABLE messages (LIKE public.messages INCLUDING ALL)`;
  });
  afterAll(async () => {
    await db.$executeRaw`DROP TABLE IF EXISTS pg_temp.messages`;
    await db.$executeRaw`DROP TABLE IF EXISTS pg_temp.rooms`;
    await db.$disconnect();
  });

  it('12000 tin file / ảnh + 40000 tin chữ, 50 nhóm: trang 2 theo before dùng index partial, không Seq Scan messages', async () => {
    const p = `gfx-${randomUUID()}-`;
    await db.$transaction(
      async (tx) => {
        await tx.$executeRaw`
          INSERT INTO rooms (id, group_id, slug, name, updated_at)
          SELECT ${p} || n, ${p} || 'g' || (n % 50), 'r' || n, 'Phòng ' || n, now()
          FROM generate_series(0, 199) n`;
        await tx.$executeRaw`
          INSERT INTO messages (id, room_id, kind, body, attachment, created_at, updated_at)
          SELECT ${p} || 'f' || n, ${p} || (n % 200),
                 (CASE WHEN n % 3 = 0 THEN 'image' ELSE 'file' END)::message_kind, '',
                 jsonb_build_object('name', 'Tep-' || n || '.pdf', 'size', '1 MB', 'ext', 'PDF'),
                 now() - n * interval '1 minute', now()
          FROM generate_series(1, 12000) n`;
        await tx.$executeRaw`
          INSERT INTO messages (id, room_id, kind, body, created_at, updated_at)
          SELECT ${p} || 't' || n, ${p} || (n % 200), 'text', 'Chào',
                 now() - n * interval '1 second', now()
          FROM generate_series(1, 40000) n`;
      },
      { timeout: 60000 },
    );
    await db.$executeRaw`VACUUM (ANALYZE) rooms`;
    await db.$executeRaw`VACUUM (ANALYZE) messages`;
    const filter = { groupId: `${p}g7`, kind: 'all' as const, q: '', limit: 51 };
    const first = await db.$queryRaw<{ id: string }[]>(
      groupFilesQuery({ ...filter, before: undefined }),
    );
    expect(first).toHaveLength(51);
    const before = first[49]?.id;
    const out = await db.$queryRaw<{ 'QUERY PLAN': string }[]>(
      Prisma.sql`EXPLAIN (ANALYZE, BUFFERS) ${groupFilesQuery({ ...filter, before })}`,
    );
    const plan = out.map((r) => r['QUERY PLAN']).join('\n');
    process.stdout.write(
      `\nTIP-V42-709 group files page 2 (52000 messages, temp clones):\n${plan}\n`,
    );
    // Bản sao tạm đặt tên index tự sinh → tra tên index partial (WHERE kind IN …) của bảng tạm
    const [partial] = await db.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes
      WHERE schemaname LIKE 'pg_temp%' AND tablename = 'messages' AND indexdef LIKE '%WHERE%kind%'`;
    expect(partial?.indexname).toBeTruthy();
    expect(plan).toContain(`Index Scan on ${partial?.indexname ?? '?'} `);
    expect(plan).not.toMatch(/Seq Scan on messages/);
    const second = await db.$queryRaw<{ id: string }[]>(groupFilesQuery({ ...filter, before }));
    expect(second).toHaveLength(51);
    expect(second[0]?.id).toBe(first[50]?.id);
  });
});
