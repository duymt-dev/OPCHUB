'use client';

import { planOf } from '@opchub/shared';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/auth-store';
import { useMembership } from '../hooks/use-membership';
import { isActive } from '../model';
import { PlanCards } from './plan-cards';
import { PlanHero } from './plan-hero';
import styles from './plan-panel.module.css';

/**
 * Phần trên popup Gói dịch vụ v4 (UP-12 §27, D-68): "BẢNG GIÁ THÀNH VIÊN" + 3 lợi ích + 3 thẻ gói.
 * Gói của TK theo loại TK lúc đăng ký; nút gói mình mở hộp chuyển khoản (LK-09).
 */
export function PlanPanel({ onJoin }: { onJoin: () => void }) {
  const t = useTranslations('membership.plans');
  const toast = useToast();
  const accountType = useAuthStore((s) => s.me?.accountType ?? 'personal');
  const { status } = useMembership();

  return (
    <div className={styles.plan}>
      <PlanHero />
      <PlanCards
        mine={planOf(accountType) ?? 'personal'}
        paid={isActive(status)}
        onJoin={onJoin}
        // Thanh toán Gói Gọi vốn làm ở TIP-V4-610 (UP-11, D-82)
        onFundraising={() => toast(t('fund.soon'))}
      />
    </div>
  );
}
