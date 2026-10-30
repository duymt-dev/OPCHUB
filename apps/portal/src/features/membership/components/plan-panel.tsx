'use client';

import { planOf } from '@opchub/shared';
import { openFundraisingPopup } from '@/features/fundraising';
import { useAuthStore } from '@/lib/auth-store';
import { usePrices } from '@/lib/use-prices';
import { useMembership } from '../hooks/use-membership';
import { isActive } from '../model';
import { PlanCards } from './plan-cards';
import { PlanHero } from './plan-hero';
import styles from './plan-panel.module.css';

/**
 * Phần trên popup Gói dịch vụ v4 (UP-12 §27, D-68): "BẢNG GIÁ THÀNH VIÊN" + 3 lợi ích + 3 thẻ gói.
 * Gói của TK theo loại TK lúc đăng ký; nút gói mình mở hộp chuyển khoản (LK-09).
 */
export function PlanPanel({
  onJoin,
  onClose,
}: {
  onJoin: () => void;
  onClose?: (() => void) | undefined;
}) {
  const accountType = useAuthStore((s) => s.me?.accountType ?? 'personal');
  const { status, exempt } = useMembership();
  const prices = usePrices();

  return (
    <div className={styles.plan}>
      <PlanHero />
      {/* D-94 5A: thẻ giá dựng khi đã có Cấu hình bảng giá — không hiện số giả */}
      {prices ? (
        <PlanCards
          prices={prices}
          mine={planOf(accountType) ?? 'personal'}
          paid={isActive(status)}
          exempt={exempt}
          onJoin={onJoin}
          // V4-610 (UP-11): prototype `pk.fdGo` đóng Bảng giá rồi mở popup chọn dự án
          onFundraising={() => {
            onClose?.();
            openFundraisingPopup(null);
          }}
        />
      ) : null}
    </div>
  );
}
