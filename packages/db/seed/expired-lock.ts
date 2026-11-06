import { z } from 'zod';
import { createPrismaClient } from '../src/client';

/** BR-465 fixture only: expire a real Admin-created lock; never unlock or fabricate a session. */
const env = z
  .object({ DIRECT_URL: z.string().url() })
  // eslint-disable-next-line no-restricted-syntax -- fixture CLI parses its environment before connecting
  .parse(process.env);
const target = new URL(env.DIRECT_URL);
if (
  !['localhost', '127.0.0.1'].includes(target.hostname) ||
  target.port !== '5432' ||
  target.pathname !== '/opchub_v46_812_dev'
)
  throw new Error('Expired-lock fixture requires the exact isolated TIP-812 database');

const db = createPrismaClient(env.DIRECT_URL, { max: 1 });
try {
  const updated = await db.user.updateMany({
    where: { id: 'm1', email: 'an.nguyen@mediasoft.vn', status: 'locked', lockKind: 'manual' },
    data: { lockedUntil: new Date(Date.now() - 60_000) },
  });
  if (updated.count !== 1) throw new Error('Expected exactly one manually locked demo member');
  process.stdout.write('BR-465 prerequisite: one timed lock expired; account remains locked\n');
} finally {
  await db.$disconnect();
}
