import type { GroupJoinMode, GroupRole } from '@opchub/db';
import { loginResponseSchema } from '@opchub/shared/api';
import { randomUUID } from 'node:crypto';
import type { TestApp } from '../setup/test-app';
import { type CreatedUser, loginOf } from './user.factory';

/**
 * Nhóm test riêng (không đụng 34 nhóm seed): tỉnh giả duy nhất, có phòng `general`.
 * Gọi `removeTestGroups` ở afterAll để lưới nhóm/thống kê không phình qua các lần chạy.
 */
export async function createGroup(
  t: TestApp,
  spec: { joinMode?: GroupJoinMode; name?: string } = {},
): Promise<{ id: string; name: string; province: string }> {
  const id = randomUUID();
  const name = spec.name ?? `Nhóm thử ${id.slice(0, 8)}`;
  const province = `Tỉnh thử ${id}`;
  await t.prisma.db.group.create({
    data: {
      id,
      slug: id,
      name,
      province,
      region: 'central',
      joinMode: spec.joinMode ?? 'open',
      rooms: {
        create: {
          id: `${id}-general`,
          slug: 'general',
          name: 'Chung',
          description: 'Phòng mặc định của nhóm',
          isDefault: true,
        },
      },
    },
  });
  return { id, name, province };
}

export async function addMember(
  t: TestApp,
  groupId: string,
  userId: string,
  groupRole: GroupRole = 'member',
): Promise<void> {
  await t.prisma.db.groupMember.create({
    data: { groupId, userId, groupRole, status: 'member' },
  });
  await t.prisma.db.group.update({
    where: { id: groupId },
    data: { memberCount: { increment: 1 } },
  });
}

export async function tokenOf(t: TestApp, u: CreatedUser): Promise<string> {
  const r = await loginOf(t, u);
  return loginResponseSchema.parse(await r.json()).accessToken;
}

/** Xoá cứng nhóm do factory tạo (tỉnh "Tỉnh thử …") — cascade phòng/thành viên */
export async function removeTestGroups(t: TestApp): Promise<void> {
  await t.prisma.db.group.deleteMany({ where: { province: { startsWith: 'Tỉnh thử ' } } });
}
