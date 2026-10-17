import { randomUUID } from 'node:crypto';
import type { TestApp } from '../setup/test-app';

/**
 * Nhóm riêng của contract lane B (bot/chat/moderation). Không dùng `createGroup` vì các suite
 * khác chạy song song gọi `removeTestGroups` (xoá mọi tỉnh "Tỉnh thử …") → cascade mất phòng/tin/
 * báo cáo giữa chừng. Tỉnh "Hợp đồng B …" chỉ suite này xoá (theo id) ở afterAll.
 */
export async function createContractGroup(t: TestApp): Promise<{ id: string; room: string }> {
  const id = randomUUID();
  await t.prisma.db.group.create({
    data: {
      id,
      slug: id,
      name: `Nhóm hợp đồng ${id.slice(0, 8)}`,
      province: `Hợp đồng B ${id}`,
      region: 'central',
      joinMode: 'open',
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
  return { id, room: `${id}-general` };
}
