import { NEED_SEED, needSeedDueAt, needSeedUpdatedAt, STORE_SEED } from '@opchub/shared/fixtures';
import { MOCK_NOW } from '@opchub/shared/mock-domains';
import type { DbTx } from '../../src/client';
import { storeOwnerId } from './stores';

/**
 * V4-609 (REQ-511): 11 nhu cầu mẫu prototype, gắn với gian hàng đã seed. `seed:demo` mặc định chỉ có
 * `st1` → chỉ nhu cầu của MediaSoft; `--stores` có đủ 17 gian hàng → đủ 11 nhu cầu (Q-V4-608-7).
 */
export async function seedNeeds(tx: DbTx, all = false): Promise<void> {
  const rows = NEED_SEED.map((n, i) => ({ n, i })).filter(({ n }) => all || n.store === 'st1');
  await tx.need.createMany({
    data: rows.flatMap(({ n, i }) => {
      const st = STORE_SEED.find((s) => s.id === n.store);
      if (!st) return [];
      const at = new Date(needSeedUpdatedAt(MOCK_NOW, n.ageDays, i));
      const due = needSeedDueAt(MOCK_NOW, n.dueDays);
      return [
        {
          id: n.id,
          storeId: n.store,
          ownerId: storeOwnerId(st),
          type: n.type,
          title: n.title,
          description: n.description,
          field: n.field,
          quantity: n.quantity,
          province: st.province,
          ward: n.ward,
          dueAt: due === null ? null : new Date(due),
          phone: st.phone,
          email: st.email,
          createdAt: at,
          updatedAt: at,
        },
      ];
    }),
  });
}
