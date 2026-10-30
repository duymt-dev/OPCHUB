import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

/** D-121: the earliest current province-group membership is the stable primary province. */
@Injectable()
export class ProvinceDirectoryService {
  constructor(private readonly prisma: PrismaService) {}

  provincesOf(userIds: readonly string[]) {
    return this.prisma.db.$queryRaw<{ userId: string; province: string }[]>`
      SELECT DISTINCT ON (m.user_id) m.user_id AS "userId", g.province
      FROM group_members m JOIN groups g ON g.id = m.group_id
      WHERE m.user_id = ANY(${[...userIds]}::text[]) AND m.status = 'member'
        AND g.kind = 'province' AND g.deleted_at IS NULL
      ORDER BY m.user_id, m.created_at, g.id`;
  }
}
