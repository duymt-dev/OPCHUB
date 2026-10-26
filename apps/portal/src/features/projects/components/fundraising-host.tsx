'use client';

import { FundraisingPopup, useFundraisingPopup } from '@/features/fundraising';
import { useRouter } from 'next/navigation';
import { useMyProjects } from '../hooks/use-projects';

/**
 * V4-610: popup Gói Gọi vốn gắn ở khung Portal (mở từ Bảng giá hoặc sau khi gửi dự án). Prototype
 * `mineOpts`: dự án của tôi chưa có khoản chờ thẩm định / đang gọi vốn có phí.
 */
export function FundraisingHost() {
  const router = useRouter();
  const open = useFundraisingPopup((s) => s.open);
  const mine = useMyProjects(open);
  const projects = (mine.data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    canBuy: !p.fundraising || !['pending_review', 'active'].includes(p.fundraising.status),
  }));
  return (
    <FundraisingPopup projects={projects} onNewProject={() => router.push('/projects/mine')} />
  );
}
