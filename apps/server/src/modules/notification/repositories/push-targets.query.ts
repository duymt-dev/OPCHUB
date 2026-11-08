import { Prisma } from '@opchub/db';

/** One indexed realm/owner join for the entire batch, reused by the delivery claim. */
export const pushTargetsQuery = (ids: readonly string[]) => Prisma.sql`
  SELECT d.notification_id AS "notificationId",s.id AS "subscriptionId",
    s.created_at AS "createdAt",s.endpoint,s.p256dh,s.auth,n.title,n.body,n.link,d.kind
  FROM push_dispatches d JOIN notifications n ON n.id=d.notification_id
  JOIN LATERAL (
    SELECT device.id FROM push_subscriptions device
    WHERE device.realm=d.realm AND device.user_id=n.user_id AND device.created_at<=d.created_at
    ORDER BY device.created_at DESC,device.id DESC LIMIT 10
  ) found ON true
  JOIN push_subscriptions s ON s.id=found.id
  WHERE d.notification_id=ANY(${[...ids]}::text[])`;
