import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { provinceMembershipQuery } from '../repositories/province-directory.query';

/** D-121: the earliest current province-group membership is the stable primary province. */
@Injectable()
export class ProvinceDirectoryService {
  constructor(private readonly prisma: PrismaService) {}

  provincesOf(userIds: readonly string[]) {
    return this.prisma.db.$queryRaw<{ userId: string; province: string }[]>(
      provinceMembershipQuery(userIds),
    );
  }
}
