import { beforeEach, describe, expect, it } from 'vitest';
import { chatMessageSchema, chatOverviewSchema, chatRoomSchema } from '../../api-domains';
import {
  chatOverview,
  createTopic,
  decideJoinWithNotice,
  deleteTopic,
  listChatMessages,
  listChatRooms,
  markRoomRead,
  reportChatMessage,
  roomFiles,
  roomPins,
  sendChatMessage,
  setPinned,
  toggleReaction,
} from './index';
import { resetMockDb } from './store';

beforeEach(() => resetMockDb());

describe('chat mock', () => {
  it('overview: 3 nhóm đã tham gia, số chưa đọc theo seed', () => {
    const o = chatOverviewSchema.parse(chatOverview('m1'));
    expect(o.joined.map((g) => g.id)).toEqual(['c1', 'c2', 'c6']);
    expect(o.joined.find((g) => g.id === 'c1')?.unread).toBe(4);
    expect(o.joined.find((g) => g.id === 'c1')?.pendingRequests).toBe(2);
    expect(o.others).toHaveLength(31);
  });

  it('phòng: Chung + chủ đề, chặn người ngoài nhóm', () => {
    const r = listChatRooms('m1', 'c1');
    expect(r.ok && r.data.map((x) => chatRoomSchema.parse(x).key)).toEqual([
      'general',
      'qa',
      'docs',
      'events',
    ]);
    expect(listChatRooms('m1', 'c3').ok).toBe(false);
  });

  it('tạo chủ đề, trùng tên bị chặn, chỉ người tạo được xoá', () => {
    const t = createTopic('m1', 'c1', { name: 'Test' });
    expect(t.ok && t.data.mine).toBe(true);
    expect(createTopic('m1', 'c1', { name: 'test' }).ok).toBe(false);
    if (!t.ok) return;
    expect(deleteTopic('m2', t.data.id).ok).toBe(false);
    expect(deleteTopic('m1', t.data.id).ok).toBe(true);
    expect(deleteTopic('m1', 'c1-general').ok).toBe(false);
  });

  it('gửi tin idempotent theo clientMsgId, có trích dẫn', () => {
    const input = { clientMsgId: 'x1', kind: 'text' as const, body: 'Xin chào', mentions: [] };
    const a = sendChatMessage('m1', 'c1-general', { ...input, replyTo: 'c1-general-0' });
    const b = sendChatMessage('m1', 'c1-general', input);
    expect(a.ok && b.ok && a.data.id === b.data.id).toBe(true);
    if (a.ok) expect(chatMessageSchema.parse(a.data).replyTo?.name).toBe('Lê Minh Anh');
    const page = listChatMessages('m1', 'c1-general', undefined, undefined, 50);
    expect(page.ok && page.data.items.length).toBe(5);
  });

  it('cảm xúc bật/tắt, ghim chỉ chủ nhóm', () => {
    const r = toggleReaction('m1', 'c1-general-0', '👍');
    expect(r.ok && r.data.myReactions).toEqual(['👍']);
    const off = toggleReaction('m1', 'c1-general-0', '👍');
    expect(off.ok && off.data.myReactions).toEqual([]);
    expect(roomPins('c1-general')).toHaveLength(1);
    expect(setPinned('m2', 'c1-general-1', true).ok).toBe(false);
    setPinned('m1', 'c1-general-1', true);
    expect(roomPins('c1-general').map((p) => p.messageId)).toEqual([
      'c1-general-1',
      'c1-general-0',
    ]);
  });

  it('báo cáo một lần, file trong phòng, đánh dấu đã đọc', () => {
    expect(reportChatMessage('m1', 'c1-general-0', { reason: 'scam' }).ok).toBe(true);
    expect(reportChatMessage('m1', 'c1-general-0', { reason: 'scam' }).ok).toBe(false);
    expect(roomFiles('c1-general').map((f) => f.name)).toEqual(['Mau-hop-dong-OPC.docx']);
    markRoomRead('m1', 'c1-qa');
    expect(chatOverview('m1').joined.find((g) => g.id === 'c1')?.unread).toBe(1);
  });

  it('chủ nhóm duyệt yêu cầu → tin hệ thống trong phòng Chung', () => {
    expect(decideJoinWithNotice('m2', 'c1', 'q4', 'approve').ok).toBe(false);
    expect(decideJoinWithNotice('m1', 'c1', 'q4', 'approve').ok).toBe(true);
    const page = listChatMessages('m1', 'c1-general', undefined, undefined, 1);
    expect(page.ok && page.data.items[0]?.senderRole).toBe('system');
  });
});
