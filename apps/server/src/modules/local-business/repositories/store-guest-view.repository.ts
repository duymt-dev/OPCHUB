import { Injectable } from '@nestjs/common';
import { Prisma } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class StoreGuestViewRepository {
  constructor(private readonly prisma: PrismaService) {}
  record(storeId: string, now: Date) {
    return this.prisma.db.$executeRaw(Prisma.sql`
      INSERT INTO store_daily_guest_views(store_id,day,views)
      VALUES (${storeId},(${now}::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,1)
      ON CONFLICT (store_id,day) DO UPDATE SET views=store_daily_guest_views.views+1`);
  }
}
