import type { Metadata } from 'next';
import { BotsScreen } from '@/features/bots';

export const metadata: Metadata = { title: 'Bot tương tác · OPC Hub Admin' };
export const dynamic = 'force-dynamic';

/** /bots · /bots/personas[/new|/:id] · /bots/scripts[/new|/:id] · /bots/threads (D-36 → D-41) */
export default function BotsPage() {
  return <BotsScreen />;
}
