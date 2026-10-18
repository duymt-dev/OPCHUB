import { apiErrorSchema } from '@opchub/shared/api';
import {
  adminEventSchema,
  generalSettingsSchema,
  groupDetailSchema,
  personaSchema,
  projectCardSchema,
  type UploadKind,
} from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { STORAGE } from '@/common/integrations';
import { AppSettingsService } from '@/modules/settings';
import { removeTestEvents, TEST_EVENT_PREFIX } from '../factories/event.factory';
import { removeTestGroups, tokenOf } from '../factories/group.factory';
import { projectBody, removeTestProjects } from '../factories/project.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { type TempStorage, tempStorage, uploadPng } from './storage.helper';

const DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

interface Target {
  name: string;
  kind: UploadKind;
  /** Đường lỗi 400 */
  path: string;
  /** Tạo bản ghi với ảnh → Response */
  create: (token: string, url: string | null) => Promise<Response>;
  /** Sửa bản ghi đã tạo với ảnh (gửi lại / đổi) */
  update: (token: string, id: string, url: string | null) => Promise<Response>;
  /** Đọc id + URL ảnh trả về */
  read: (r: Response) => Promise<{ id: string; url: string | null }>;
  /** Đọc thẳng DB */
  stored: (id: string) => Promise<string | null>;
}

/** NA-26 / REQ-226: 5 nơi gắn ảnh chỉ nhận URL storage do chính người gọi tải (head kiểm lại) */
describe('Ảnh gắn bản ghi qua storage (TIP-V2-102)', () => {
  let t: TestApp;
  let store: TempStorage;
  let admin: string;
  let other: string;
  let member: string;
  const personaIds: string[] = [];
  const groupIds: string[] = [];
  let generalBackup: unknown;
  /** Tỉnh của nhóm seed c34 — xoá mềm trong lúc test để tạo nhóm ở tỉnh thật (như admin-groups) */
  let seedProvince = '';

  beforeAll(async () => {
    store = await tempStorage();
    t = await createTestApp({ overrides: [[STORAGE, store.provider]] });
    const g = await t.prisma.db.appSetting.findUniqueOrThrow({ where: { key: 'general' } });
    generalBackup = g.value;
    const seed = await t.prisma.db.group.update({
      where: { id: 'c34' },
      data: { deletedAt: new Date() },
      select: { province: true },
    });
    seedProvince = seed.province;
  });
  beforeEach(async () => {
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    other = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    member = await tokenOf(t, await createUser(t, { fee: 'active' }));
  });
  afterAll(async () => {
    await t.prisma.db.persona.deleteMany({ where: { id: { in: personaIds } } });
    await t.prisma.db.group.deleteMany({ where: { id: { in: groupIds } } });
    await t.prisma.db.group.update({ where: { id: 'c34' }, data: { deletedAt: null } });
    await t.prisma.db.appSetting.update({
      where: { key: 'general' },
      data: { value: generalBackup as never },
    });
    await t.app.get(AppSettingsService).invalidate('general');
    await removeTestEvents(t);
    await removeTestGroups(t);
    await removeTestProjects(t);
    await t.close();
    await store.dispose();
  });

  const send = (method: 'POST' | 'PATCH', path: string, token: string, json: unknown) =>
    t.call(path, { method, token, json });

  const groupName = `Nhóm ảnh ${randomUUID().slice(0, 8)}`;
  const groupBody = (url: string | null) => ({
    name: groupName,
    province: seedProvince,
    description: 'Nhóm thử ảnh',
    joinMode: 'open',
    coverUrl: url,
  });
  const eventBody = (url: string | null) => ({
    title: `${TEST_EVENT_PREFIX} ảnh`,
    mode: 'online',
    startsAt: '2030-11-20T12:00:00.000Z',
    place: 'https://zoom.us/j/1',
    seats: 10,
    description: 'Mô tả',
    coverUrl: url,
  });
  const personaBody = (url: string | null) => ({
    name: 'Persona ảnh',
    title: 'x',
    province: 'Hà Nội',
    tone: 'vui',
    avatarUrl: url,
  });

  const targets: Target[] = [
    {
      name: 'nhóm',
      kind: 'group-cover',
      path: 'coverUrl',
      create: async (token, url) => {
        // Mỗi tỉnh chỉ một nhóm sống: xoá nhóm thử trước rồi tạo lại ở tỉnh của c34 (đã xoá mềm)
        await t.prisma.db.group.deleteMany({ where: { id: { in: groupIds.splice(0) } } });
        return send('POST', '/admin/groups', token, groupBody(url));
      },
      update: (token, id, url) => send('PATCH', `/admin/groups/${id}`, token, groupBody(url)),
      read: async (r) => {
        const d = groupDetailSchema.parse(await r.json());
        groupIds.push(d.id);
        return { id: d.id, url: d.coverUrl };
      },
      stored: async (id) =>
        (await t.prisma.db.group.findUniqueOrThrow({ where: { id }, select: { coverUrl: true } }))
          .coverUrl,
    },
    {
      name: 'sự kiện',
      kind: 'event-cover',
      path: 'coverUrl',
      create: (token, url) => send('POST', '/admin/events', token, eventBody(url)),
      update: (token, id, url) => send('PATCH', `/admin/events/${id}`, token, eventBody(url)),
      read: async (r) => {
        const e = adminEventSchema.parse(await r.json());
        return { id: e.id, url: e.coverUrl };
      },
      stored: async (id) =>
        (await t.prisma.db.event.findUniqueOrThrow({ where: { id }, select: { coverUrl: true } }))
          .coverUrl,
    },
    {
      name: 'persona',
      kind: 'persona-avatar',
      path: 'avatarUrl',
      create: (token, url) => send('POST', '/admin/personas', token, personaBody(url)),
      update: (token, id, url) => send('PATCH', `/admin/personas/${id}`, token, personaBody(url)),
      read: async (r) => {
        const p = personaSchema.parse(await r.json());
        personaIds.push(p.id);
        return { id: p.id, url: p.avatarUrl };
      },
      stored: async (id) =>
        (
          await t.prisma.db.persona.findUniqueOrThrow({
            where: { id },
            select: { avatarUrl: true },
          })
        ).avatarUrl,
    },
    {
      name: 'logo',
      kind: 'platform-logo',
      path: 'logoUrl',
      create: (token, url) => send('PATCH', '/admin/settings/general', token, { logoUrl: url }),
      update: (token, _id, url) =>
        send('PATCH', '/admin/settings/general', token, { logoUrl: url }),
      read: async (r) => ({
        id: 'general',
        url: generalSettingsSchema.parse(await r.json()).logoUrl,
      }),
      stored: async () => {
        const row = await t.prisma.db.appSetting.findUniqueOrThrow({ where: { key: 'general' } });
        return generalSettingsSchema.parse(row.value).logoUrl;
      },
    },
  ];

  const fieldOf = async (r: Response) =>
    apiErrorSchema.parse(await r.json()).error.fields?.[0]?.path;

  for (const tg of targets) {
    it(`REQ-226 ${tg.name}: data URL → 400 fields[${tg.path}]`, async () => {
      const r = await tg.create(admin, DATA_URL);
      expect(r.status).toBe(400);
      expect(await fieldOf(r)).toBe(tg.path);
    });

    it(`REQ-226 ${tg.name}: URL storage của chính người gọi → lưu; khoá người khác / URL ngoài → 400; gửi lại URL cũ không kiểm lại`, async () => {
      const mine = await uploadPng(t, admin, tg.kind);
      const r = await tg.create(admin, mine);
      expect(r.status).toBeLessThan(300);
      const saved = await tg.read(r);
      expect(saved.url).toBe(mine);
      expect(await tg.stored(saved.id)).toBe(mine);

      // Khoá của Admin khác (chưa gắn) → 400
      const theirs = await uploadPng(t, other, tg.kind);
      const bad = await tg.update(admin, saved.id, theirs);
      expect(bad.status).toBe(400);
      expect(await fieldOf(bad)).toBe(tg.path);
      const evil = await tg.update(admin, saved.id, 'https://evil.example/a.png');
      expect(evil.status).toBe(400);

      // Admin khác sửa bản ghi, gửi lại đúng URL đang lưu (khoá không phải của họ) → giữ nguyên
      await store.provider.delete(new URL(mine).pathname.replace(/^\/v1\/uploads\//, ''));
      const keep = await tg.update(other, saved.id, mine);
      expect(keep.status).toBe(200);
      expect(await tg.stored(saved.id)).toBe(mine);
    });
  }

  it('REQ-226 dự án: data URL → 400; ảnh bìa + ảnh đội ngũ 1,5MB storage → 201; khoá người khác → 400', async () => {
    const dataUrl = await t.call('/projects', {
      method: 'POST',
      token: member,
      json: projectBody({ coverUrl: DATA_URL }),
    });
    expect(dataUrl.status).toBe(400);
    expect(await fieldOf(dataUrl)).toBe('coverUrl');

    const cover = await uploadPng(t, member, 'project-cover', 1_500_000);
    const avatar = await uploadPng(t, member, 'team-avatar', 1_500_000);
    const r = await t.call('/projects', {
      method: 'POST',
      token: member,
      json: projectBody({
        coverUrl: cover,
        team: [
          { name: 'Chủ dự án', role: 'CEO', avatarUrl: null, isOwner: true },
          { name: 'Cộng sự', role: 'CTO', avatarUrl: avatar, isOwner: false },
        ],
      }),
    });
    expect(r.status).toBe(201);
    const card = projectCardSchema.parse(await r.json());
    const row = await t.prisma.db.project.findUniqueOrThrow({
      where: { id: card.id },
      select: { coverUrl: true, members: { select: { avatarUrl: true } } },
    });
    expect(row.coverUrl).toBe(cover);
    expect(row.members.map((m) => m.avatarUrl)).toContain(avatar);

    const otherMember = await tokenOf(t, await createUser(t, { fee: 'active' }));
    const stolen = await t.call('/projects', {
      method: 'POST',
      token: otherMember,
      json: projectBody({ coverUrl: cover }),
    });
    expect(stolen.status).toBe(400);
  });
});
