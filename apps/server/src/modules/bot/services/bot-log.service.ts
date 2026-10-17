import { Injectable } from '@nestjs/common';
import type { BotLogRow } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';

/**
 * Nhật ký bot `GET /admin/bot/log` (SRS §13): mỗi hội thoại đã chạy là một dòng.
 * Deferred join: id theo idx (created_at DESC, id) → đọc cột + tên nhóm cho đúng một trang.
 */
@Injectable()
export class BotLogService {
  constructor(private readonly prisma: PrismaService) {}

  async page(page: number, size: number) {
    const [ids, total] = await Promise.all([
      this.prisma.db.botThread.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * size,
        take: size,
        select: { id: true },
      }),
      this.prisma.db.botThread.count(),
    ]);
    const rows = await this.prisma.db.botThread.findMany({
      where: { id: { in: ids.map((r) => r.id) } },
      select: {
        id: true,
        scriptId: true,
        topic: true,
        groupIds: true,
        status: true,
        createdAt: true,
      },
    });
    const groups = await this.prisma.db.group.findMany({
      where: { id: { in: [...new Set(rows.flatMap((r) => r.groupIds))] } },
      select: { id: true, name: true },
    });
    const gm = new Map(groups.map((g) => [g.id, g.name]));
    const by = new Map(rows.map((r) => [r.id, r]));
    const items = ids.flatMap(({ id }): BotLogRow[] => {
      const r = by.get(id);
      if (!r) return [];
      return [
        {
          id: r.id,
          scriptId: r.scriptId ?? '',
          topic: r.topic,
          groupNames: r.groupIds.map((g) => gm.get(g) ?? g),
          status: r.status,
          createdAt: r.createdAt.toISOString(),
        },
      ];
    });
    return { items, page, size, total };
  }
}
