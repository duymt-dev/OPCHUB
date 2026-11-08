import { Injectable } from '@nestjs/common';
import { Prisma } from '@opchub/db';
import type { PushPreferences, PushRealm, PushSubscribe } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import { pushTargetsQuery } from './push-targets.query';

export interface DispatchRow {
  notificationId: string;
  kind: keyof PushPreferences | 'test';
  realm: PushRealm;
  userId: string;
  preferences: unknown;
}
export interface DeliveryRow {
  notificationId: string;
  subscriptionId: string;
  createdAt: Date;
  endpoint: string;
  p256dh: string;
  auth: string;
  title: string;
  body: string;
  link: string;
  kind: DispatchRow['kind'];
}
export interface DeliveryOutcome {
  notificationId: string;
  subscriptionId: string;
  createdAt: string;
  outcome: 'ok' | 'gone' | 'retry' | 'terminal';
}
export const dispatchQuery = (ids: readonly string[]) => Prisma.sql`
  SELECT d.notification_id AS "notificationId",d.kind,d.realm,n.user_id AS "userId",p.kinds AS preferences
  FROM push_dispatches d JOIN notifications n ON n.id=d.notification_id
  LEFT JOIN push_preferences p ON p.realm=d.realm AND p.user_id=n.user_id
  WHERE d.notification_id=ANY(${[...ids]}::text[])`;

/** All recipient/device reads and result writes are batched; no query per device. */
@Injectable()
export class PushDeliveryRepository {
  constructor(private readonly prisma: PrismaService) {}
  dispatches(ids: readonly string[]) {
    return this.prisma.db.$queryRaw<DispatchRow[]>(dispatchQuery(ids));
  }

  claim(ids: readonly string[], owner: string, attempt: number) {
    // A retry can reclaim its own abandoned lease using BullMQ attemptsStarted.
    // Other jobs must wait; successful/terminal deliveries can never be reclaimed.
    return this.prisma.db.$queryRaw<DeliveryRow[]>`
      WITH claimed AS (
        INSERT INTO push_deliveries(notification_id,subscription_id,lease_owner,lease_attempt,lease_until)
        SELECT target."notificationId",target."subscriptionId",${owner},${attempt},now()+interval '2 hours'
        FROM (${pushTargetsQuery(ids)}) target
        ON CONFLICT(notification_id,subscription_id) DO UPDATE
        SET lease_owner=EXCLUDED.lease_owner,lease_attempt=EXCLUDED.lease_attempt,
          lease_until=EXCLUDED.lease_until
        WHERE push_deliveries.sent_at IS NULL AND push_deliveries.terminal_at IS NULL
          AND (push_deliveries.lease_owner IS NULL OR push_deliveries.lease_until<now()
            OR (push_deliveries.lease_owner=${owner} AND push_deliveries.lease_attempt<${attempt}))
        RETURNING notification_id,subscription_id
      ) SELECT c.notification_id AS "notificationId",s.id AS "subscriptionId",
          s.created_at AS "createdAt",s.endpoint,s.p256dh,s.auth,n.title,n.body,n.link,d.kind
        FROM claimed c JOIN push_subscriptions s ON s.id=c.subscription_id
        JOIN push_dispatches d ON d.notification_id=c.notification_id
        JOIN notifications n ON n.id=c.notification_id`;
  }

  async finish(owner: string, attempt: number, results: DeliveryOutcome[]) {
    const data = JSON.stringify(results);
    await this.prisma.db.$transaction(async (tx) => {
      await tx.$executeRaw`
        WITH r AS (SELECT * FROM jsonb_to_recordset(${data}::jsonb)
          AS x("notificationId" text,"subscriptionId" text,outcome text))
        UPDATE push_deliveries d SET
          sent_at=CASE WHEN r.outcome='ok' THEN now() ELSE d.sent_at END,
          terminal_at=CASE WHEN r.outcome IN ('gone','terminal') THEN now() ELSE d.terminal_at END,
          lease_owner=NULL,lease_until=NULL
        FROM r WHERE d.notification_id=r."notificationId" AND d.subscription_id=r."subscriptionId"
          AND d.lease_owner=${owner} AND d.lease_attempt=${attempt}`;
      // Aggregate by device: a successful send resets the consecutive-failure counter.
      await tx.$executeRaw`
        WITH r AS (SELECT "subscriptionId", "createdAt",bool_or(outcome='ok') AS ok,
          bool_or(outcome='gone') AS gone,count(*) FILTER(WHERE outcome IN ('retry','terminal'))::int AS failures
          FROM jsonb_to_recordset(${data}::jsonb)
          AS x("subscriptionId" text,"createdAt" timestamptz,outcome text)
          GROUP BY "subscriptionId","createdAt")
        UPDATE push_subscriptions s SET
          last_success_at=CASE WHEN r.ok THEN now() ELSE s.last_success_at END,
          failure_count=CASE WHEN r.gone THEN 20 WHEN r.ok THEN 0 ELSE s.failure_count+r.failures END
        FROM r WHERE s.id=r."subscriptionId" AND s.created_at=r."createdAt"`;
      await tx.$executeRaw`
        DELETE FROM push_subscriptions WHERE failure_count>=20 AND id IN (
          SELECT x."subscriptionId" FROM jsonb_to_recordset(${data}::jsonb) AS x("subscriptionId" text))`;
    });
  }

  async release(owner: string, attempt: number) {
    await this.prisma.db.$executeRaw`UPDATE push_deliveries SET lease_owner=NULL,lease_until=NULL
      WHERE lease_owner=${owner} AND lease_attempt=${attempt} AND sent_at IS NULL AND terminal_at IS NULL`;
  }
}

export const subscriptionOf = (row: DeliveryRow): PushSubscribe => ({
  endpoint: row.endpoint,
  keys: { p256dh: row.p256dh, auth: row.auth },
});
