import { describe, expect, it } from 'vitest';
import { requiresPaymentOverlay } from './overlay-policy';

describe('AF-R02 payment overlay', () => {
  it('REQ-302 người chưa đóng phí được xem đúng route preview Affiliate', () => {
    expect(requiresPaymentOverlay(true, '/affiliate')).toBe(false);
  });
  it('REQ-302 không mở rộng ngoại lệ sang các trang khác hay subroute không có thật', () => {
    for (const path of ['/dashboard', '/chat/c1', '/services', '/affiliate/private'])
      expect(requiresPaymentOverlay(true, path)).toBe(true);
  });
  it('REQ-302 người đã đóng phí không có overlay bắt buộc', () => {
    expect(requiresPaymentOverlay(false, '/dashboard')).toBe(false);
  });
});
