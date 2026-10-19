import { generalSettingsSchema } from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { STORAGE } from '@/common/integrations';
import { AppSettingsService } from '@/modules/settings';
import { MediaBackfillService } from '@/modules/uploads';
import { removeTestEvents, TEST_EVENT_PREFIX } from '../factories/event.factory';
import { removeTestGroups } from '../factories/group.factory';
import { createUser } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { STORAGE_BASE, type TempStorage, tempStorage } from './storage.helper';

const PNG_B64 = Buffer.from(
  Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]),
).toString('base64');
const GOOD = `data:image/png;base64,${PNG_B64}`;
const BROKEN = 'data:text/html;base64,PGI+aGk8L2I+';

/** TD-014: data URL cũ ở 6 vị trí → storage, idempotent; hỏng → NULL */
describe('MediaBackfillService (TIP-V2-102)', () => {
  let t: TestApp;
  let store: TempStorage;
  let svc: MediaBackfillService;
  let generalBackup: unknown;
  const ids = { group: '', event: '', project: '', member: '', persona: '', brokenEvent: '' };

  const keyOf = (url: string) => new URL(url).pathname.replace(/^\/v1\/uploads\//, '');

  beforeAll(async () => {
    store = await tempStorage();
    t = await createTestApp({ overrides: [[STORAGE, store.provider]] });
    svc = t.app.get(MediaBackfillService);
    const g = await t.prisma.db.appSetting.findUniqueOrThrow({ where: { key: 'general' } });
    generalBackup = g.value;
    // Dọn data URL còn sót trong DB test từ lần chạy cũ để đếm chính xác
    await svc.run();

    const owner = await createUser(t, { fee: 'active' });
    const gid = randomUUID();
    ids.group = gid;
    await t.prisma.db.group.create({
      data: {
        id: gid,
        slug: gid,
        name: `Nhóm thử ${gid.slice(0, 8)}`,
        province: `Tỉnh thử ${gid}`,
        region: 'central',
        coverUrl: GOOD,
      },
    });
    const mkEvent = (coverUrl: string) =>
      t.prisma.db.event.create({
        data: {
          title: `${TEST_EVENT_PREFIX} backfill`,
          mode: 'online',
          startsAt: new Date('2030-01-01T00:00:00Z'),
          place: 'https://zoom.us/j/1',
          seats: 10,
          description: '',
          coverUrl,
        },
        select: { id: true },
      });
    ids.event = (await mkEvent(GOOD)).id;
    ids.brokenEvent = (await mkEvent(BROKEN)).id;
    const p = await t.prisma.db.project.create({
      data: {
        ownerId: owner.id,
        name: `Dự án thử backfill ${gid.slice(0, 6)}`,
        coverUrl: GOOD,
        members: { create: { name: 'Cộng sự', role: 'CTO', avatarUrl: GOOD } },
      },
      select: { id: true, members: { select: { id: true } } },
    });
    ids.project = p.id;
    ids.member = p.members[0]?.id ?? '';
    ids.persona = `ps-bf-${gid.slice(0, 8)}`;
    await t.prisma.db.persona.create({
      data: { id: ids.persona, name: 'Persona backfill', avatarUrl: GOOD },
    });
    await t.prisma.db.appSetting.update({
      where: { key: 'general' },
      data: {
        value: { ...generalSettingsSchema.parse(generalBackup), logoUrl: GOOD },
      },
    });
  });
  afterAll(async () => {
    await t.prisma.db.persona.deleteMany({ where: { id: ids.persona } });
    await t.prisma.db.project.deleteMany({ where: { id: ids.project } });
    await t.prisma.db.appSetting.update({
      where: { key: 'general' },
      data: { value: generalBackup as never },
    });
    await t.app.get(AppSettingsService).invalidate('general');
    await removeTestEvents(t);
    await removeTestGroups(t);
    await t.close();
    await store.dispose();
  });

  const remaining = async (): Promise<number> => {
    const [r] = await t.prisma.db.$queryRaw<{ n: bigint }[]>`
      SELECT (SELECT count(*) FROM groups WHERE cover_url LIKE 'data:%')
        + (SELECT count(*) FROM events WHERE cover_url LIKE 'data:%')
        + (SELECT count(*) FROM projects WHERE cover_url LIKE 'data:%')
        + (SELECT count(*) FROM project_members WHERE avatar_url LIKE 'data:%')
        + (SELECT count(*) FROM personas WHERE avatar_url LIKE 'data:%')
        + (SELECT count(*) FROM app_settings
           WHERE key = 'general' AND value->>'logoUrl' LIKE 'data:%') AS n`;
    return Number(r?.n ?? -1);
  };

  it('TD-014 backfill chuyển data URL → storage, idempotent', async () => {
    expect(await remaining()).toBe(7);
    const first = await svc.run();
    expect(first).toMatchObject({ moved: 6, nulled: 1, logoChanged: true });
    expect(await remaining()).toBe(0);

    const urls = [
      (await t.prisma.db.group.findUniqueOrThrow({ where: { id: ids.group } })).coverUrl,
      (await t.prisma.db.event.findUniqueOrThrow({ where: { id: ids.event } })).coverUrl,
      (await t.prisma.db.project.findUniqueOrThrow({ where: { id: ids.project } })).coverUrl,
      (await t.prisma.db.projectMember.findUniqueOrThrow({ where: { id: ids.member } })).avatarUrl,
      (await t.prisma.db.persona.findUniqueOrThrow({ where: { id: ids.persona } })).avatarUrl,
      generalSettingsSchema.parse(
        (await t.prisma.db.appSetting.findUniqueOrThrow({ where: { key: 'general' } })).value,
      ).logoUrl,
    ];
    const kinds = [
      'group-cover',
      'event-cover',
      'project-cover',
      'team-avatar',
      'persona-avatar',
      'platform-logo',
    ];
    for (const [i, url] of urls.entries()) {
      expect(url?.startsWith(`${STORAGE_BASE}/uploads/${kinds[i] ?? ''}/system/`)).toBe(true);
      const head = await store.provider.head(keyOf(url ?? ''));
      expect(head).toEqual({ size: 12, contentType: 'image/png' });
    }

    const second = await svc.run();
    expect(second).toEqual({ moved: 0, nulled: 0, logoChanged: false });
  });

  it('TD-014 data URL hỏng → NULL (ảnh mặc định)', async () => {
    const e = await t.prisma.db.event.findUniqueOrThrow({
      where: { id: ids.brokenEvent },
      select: { coverUrl: true },
    });
    expect(e.coverUrl).toBeNull();
  });
});
