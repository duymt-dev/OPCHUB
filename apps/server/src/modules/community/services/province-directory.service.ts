import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';
import { provinceMembershipQuery } from '../repositories/province-directory.query';

/** D-121: the earliest current province-group membership is the stable primary province. */
@Injectable()
export class ProvinceDirectoryService {
  constructor(private readonly prisma: PrismaService) {}

  provincesOf(userIds: readonly string[], tx?: DbTx) {
    return (tx ?? this.prisma.db).$queryRaw<{ userId: string; province: string }[]>(
      provinceMembershipQuery(userIds),
    );
  }
}
