import type { RegionalRegion, RegionalSlot } from '../../api-domains';
import { mockRegionalDirectors } from './regional-directors';
import { regionalShareState } from './regional-share-state';
import { rememberRegionalBank } from './regional-share-bank';
import { recordAudit } from './audit-store';
import { conflict, notFound, ok } from './util';

export function mockRegionalPayeeBank(
  region: RegionalRegion,
  userId: string,
  bank: RegionalSlot['bank'],
  actorId: string | null = null,
) {
  const directors = mockRegionalDirectors(false);
  if (directors.items.find((s) => s.region === region)?.member?.id === userId)
    return conflict('Cập nhật tài khoản GĐ Vùng đương nhiệm tại cấu hình vùng');
  if (
    !directors.history.some(
      (e) => e.region === region && e.userId === userId && e.action === 'revoke',
    ) &&
    !regionalShareState().rows.some(
      (s) => s.region === region && s.directorUserId === userId && s.status === 'pending',
    )
  )
    return notFound('Không tìm thấy người nhận của vùng');
  rememberRegionalBank(region, userId, bank);
  recordAudit(
    actorId,
    'regional_director.payee_bank',
    `${region}:${userId}`,
    'Cập nhật tài khoản nhận của GĐ Vùng đã thu hồi',
    { bankLast4: bank.bankNo.replaceAll(' ', '').slice(-4) },
  );
  return ok({ updated: true as const });
}
