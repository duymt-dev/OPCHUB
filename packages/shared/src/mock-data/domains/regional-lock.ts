import { mockRegionalDirectors, mockRegionalRevoke } from './regional-directors';
import { recordAudit } from './audit-store';

export function mockRegionalSystemRevoke(userId: string, reason: 'locked' | 'deleted') {
  const slot = mockRegionalDirectors(false).items.find((s) => s.member?.id === userId);
  if (!slot) return;
  const result = mockRegionalRevoke(slot.region, 'system', Date.now(), reason);
  if (result.ok)
    recordAudit('system', 'regional_director.revoke', slot.region, 'Thu hồi GĐ Vùng tự động', {
      userId,
      reason,
    });
}
