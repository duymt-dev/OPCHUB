import { pageMeta } from '@/i18n/page-meta';
import type { ReactNode } from 'react';
import { ChatScreen } from '@/features/chat';

/** Không bọc Suspense: fallback đứng yên khi harness parity dừng đồng hồ */
export const dynamic = 'force-dynamic';

export const generateMetadata = pageMeta('chat');

/**
 * P-28 → P-48. Màn đặt ở layout để giữ trạng thái (rail, phòng đã mở, cuộn) khi đổi
 * `/chat/:groupId/:room` — page con chỉ khai báo route.
 */
export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ChatScreen />
      {children}
    </>
  );
}
