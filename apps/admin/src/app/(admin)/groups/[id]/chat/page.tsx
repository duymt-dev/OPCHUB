import type { Metadata } from 'next';
import { ChatViewer } from '@/features/groups';

export const metadata: Metadata = { title: 'Xem chat · OPC Hub Admin' };

export const dynamic = 'force-dynamic';

/** D-26: trình xem chat chỉ đọc của admin */
export default async function GroupChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChatViewer groupId={decodeURIComponent(id)} />;
}
