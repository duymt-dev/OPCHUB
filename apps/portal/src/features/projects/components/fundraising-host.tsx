'use client';

import { FundraisingPopup, useFundraisingPopup } from '@/features/fundraising';
import { useRouter } from 'next/navigation';
import { useMyProjects } from '../hooks/use-projects';

/**
 * V4-610 / v4.2: popup Gói Gọi vốn gắn ở khung Portal (mở từ Bảng giá hoặc sau khi gửi dự án).
 * Prototype `mine` (BR-GV-01): dự án của tôi không nháp, đã bật "Cần gọi vốn đầu tư", không chờ thẩm định
 * (hoặc bị từ chối — D-113 F6) và không đang gọi vốn còn hạn; đã từng gọi vốn và hết hạn → giá gia hạn (D-106).
 */
export function FundraisingHost() {
  const router = useRouter();
  const open = useFundraisingPopup((s) => s.open);
  const mine = useMyProjects(open);
  const projects = (mine.data ?? []).map((p) => {
    const st = p.fundraising?.status;
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      renew: st === 'expired',
      canBuy:
        p.status !== 'draft' &&
        !!p.funding &&
        st !== 'pending_review' &&
        // D-113 (F6): bị từ chối → bổ sung hồ sơ + gửi duyệt lại ở Dự án của tôi, không thu lần hai
        st !== 'rejected' &&
        !(st === 'active' && p.fundraisingActive),
    };
  });
  return (
    <FundraisingPopup projects={projects} onNewProject={() => router.push('/projects/mine')} />
  );
}
