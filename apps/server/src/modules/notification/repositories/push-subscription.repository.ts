import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type { PushRealm, PushSubscribe, PushPreferences } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class PushSubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(tx: DbTx, realm: PushRealm, userId: string, input: PushSubscribe) {
    // Serialize the cap for this owner; endpoint uniqueness also serializes transfers.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${realm}:${userId}`},0))`;
    await tx.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: {
        realm,
        userId,
        endpoint: input.endpoint,
        ...input.keys,
        userAgent: input.userAgent ?? null,
      },
      update: {
        realm,
        userId,
        ...input.keys,
        userAgent: input.userAgent ?? null,
        createdAt: new Date(),
        lastSuccessAt: null,
        failureCount: 0,
      },
      select: { id: true },
    });
    await tx.$executeRaw`
      DELETE FROM push_subscriptions WHERE id IN (
        SELECT id FROM push_subscriptions WHERE realm=${realm} AND user_id=${userId}
        ORDER BY created_at DESC,id DESC OFFSET 10
      )`;
  }

  async remove(realm: PushRealm, userId: string, endpoint: string) {
    await this.prisma.db.pushSubscription.deleteMany({ where: { realm, userId, endpoint } });
  }

  count(realm: PushRealm, userId: string) {
    return this.prisma.db.pushSubscription.count({ where: { realm, userId } });
  }

  preferences(realm: PushRealm, userId: string) {
    return this.prisma.db.pushPreference.findUnique({
      where: { realm_userId: { realm, userId } },
      select: { kinds: true },
    });
  }

  async savePreferences(realm: PushRealm, userId: string, kinds: PushPreferences) {
    await this.prisma.db.pushPreference.upsert({
      where: { realm_userId: { realm, userId } },
      create: { realm, userId, kinds },
      update: { kinds },
      select: { userId: true },
    });
  }

  /** Expression index supports bounded cleanup without reading device secrets. */
  purge(now: Date) {
    const before = new Date(now.getTime() - 90 * 86400000);
    return this.prisma.db.$executeRaw`
      DELETE FROM push_subscriptions WHERE id IN (
        SELECT id FROM push_subscriptions WHERE COALESCE(last_success_at,created_at)<${before}
        ORDER BY COALESCE(last_success_at,created_at),id LIMIT 1000
      )`;
  }
}
