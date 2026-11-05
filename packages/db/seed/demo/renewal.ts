import type { DbTx } from '../../src/client';
/** Opt-in acceptance fixture only; ordinary demo/ledger dates remain unchanged. */
export async function seedRenewalDemo(tx: DbTx, now = new Date()) {
  await tx.membershipFee.update({
    where: { userId: 'm1' },
    data: { status: 'active', validUntil: new Date(now.getTime() + 12 * 86_400_000) },
  });
}
