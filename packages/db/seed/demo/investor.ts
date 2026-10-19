import { buildInterests } from '@opchub/shared/mock-domains';
import type { DbTx } from '../../src/client';
import { requireUserId } from './people';

/**
 * Domain investor: quan tâm đầu tư (INV_SEED, id `<dự án>-i<n>` như mock), MỘT luồng trao đổi theo
 * nhà đầu tư `investor_comments` (trao đổi mẫu của Admin với Nguyễn Hoàng Nam — SEED_COMMENTS của
 * mock), tổng hợp `investor_summaries` (gom theo user — Q-G5c-1).
 */

/** Mốc bình luận mẫu (16/10/2026 09:00 giờ VN) */
const T0 = Date.UTC(2026, 9, 16, 2, 0);

export async function seedInvestors(tx: DbTx): Promise<void> {
  const interests = buildInterests().map((i) => ({ ...i, userId: requireUserId(i.investorName) }));
  await tx.investorInterest.createMany({
    data: interests.map((i) => ({
      id: i.id,
      projectId: i.projectId,
      userId: i.userId,
      kind: i.kind,
      contactName: i.investorName,
      phone: i.phone,
      organization: i.organization,
      amount: BigInt(i.amount),
      currency: i.currency,
      message: i.message,
      status: i.status,
      investorKey: i.userId,
      createdAt: new Date(i.createdAt),
      updatedAt: new Date(i.createdAt),
    })),
  });
  const nam = requireUserId('Nguyễn Hoàng Nam');
  // Một luồng theo NĐT (TIP-V2-107): 2 tin mẫu với Nguyễn Hoàng Nam. Lời nhắn kèm quan tâm nằm ở
  // `investor_interests.message`, không vào luồng (prototype: luồng mới trống — V2Q-71)
  await tx.investorComment.createMany({
    data: [
      {
        id: 'ivc-seed-0',
        investorKey: nam,
        interestId: null,
        authorId: nam,
        fromInvestor: true,
        body: 'Chào OPC Hub, quỹ muốn nhận pitch deck và báo cáo tài chính 6 tháng gần nhất của SoloBooks.',
        createdAt: new Date(T0 - 1500e5),
      },
      {
        id: 'ivc-seed-1',
        investorKey: nam,
        interestId: null,
        authorId: 'admin',
        fromInvestor: false,
        body: 'Chào anh Nam, bên em đã chuyển yêu cầu tới chủ dự án. Dự kiến gửi tài liệu trước thứ Sáu.',
        createdAt: new Date(T0 - 1400e5),
      },
    ],
  });
  // Tổng hợp theo người: một câu INSERT … SELECT như migration investor_summaries (không vòng lặp)
  await tx.$executeRaw`
    INSERT INTO investor_summaries (investor_key, user_id, first_interest_id, kind, organization, phone,
                                    total_amount, interest_count, status, last_at, updated_at)
    SELECT g.investor_key, l.user_id, g.first_id, l.kind, l.organization, l.phone,
           g.total_amount, g.n,
           CASE WHEN EXISTS (SELECT 1 FROM investor_comments n
                             WHERE n.investor_key = g.investor_key AND NOT n.from_investor)
                THEN 'in_discussion'::investor_interest_status ELSE g.status END,
           g.last_at, now()
    FROM (
      SELECT investor_key,
             (array_agg(id ORDER BY created_at DESC, id DESC))[1] AS first_id,
             (array_agg(id ORDER BY created_at DESC, id DESC))[1] AS last_id,
             SUM(amount)::bigint AS total_amount, count(*)::int AS n, MAX(created_at) AS last_at,
             (array_agg(status ORDER BY array_position(
               ARRAY['connected','in_discussion','sent']::investor_interest_status[], status)))[1] AS status
      FROM investor_interests GROUP BY investor_key
    ) g JOIN investor_interests l ON l.id = g.last_id`;
  await tx.$executeRaw`
    UPDATE investor_interests i SET status = s.status FROM investor_summaries s
    WHERE i.investor_key = s.investor_key AND i.status <> s.status`;
}
