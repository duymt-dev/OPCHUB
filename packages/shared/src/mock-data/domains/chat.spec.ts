import { beforeEach, describe, expect, it } from 'vitest';
import { chatMessageSchema, chatOverviewSchema, chatRoomSchema } from '../../api-domains';
import {
  chatOverview,
  listChatMessages,
  listChatRooms,
  markRoomRead,
  reportChatMessage,
  roomFiles,
  roomMembers,
  roomPins,
  sendChatMessage,
  setPinned,
  toggleReaction,
  assignGroups,
  groupRoleOf,
  inboxNotifications,
} from './index';
import { chatUnread } from './chat-ops';
import { publicStats } from './public-stats';
import { mockDb, resetMockDb } from './store';
import { buildMessages } from './community';

beforeEach(() => resetMockDb());

describe('chat mock', () => {
  it('overview: 3 nhóm đã tham gia, số chưa đọc theo seed', () => {
    const o = chatOverviewSchema.parse(chatOverview('m1'));
    expect(o.joined.map((g) => g.id)).toEqual(['c1', 'c2', 'c6']);
    expect(o.joined.find((g) => g.id === 'c1')?.unread).toBe(4);
    // D-89 (v4): 90 nhóm − 3 đã tham gia
    expect(o.others).toHaveLength(87);
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

  it('GR-R02 REQ-362 panel thành viên trả groupRole (Giảng viên), không còn isModerator', () => {
    const r = roomMembers('c1-general');
    expect(r.ok && r.data.items[0]?.groupRole).toBe('lecturer');
    expect(r.ok && r.data.items.slice(1).every((m) => m.groupRole === 'member')).toBe(true);
  });

  it('AT-GR01 REQ-361 REQ-212 gán vai trò Giảng viên: giữ nhóm cũ, thông báo từng nhóm mới', () => {
    expect(groupRoleOf('m3', 'c2')).toBe('member');
    const r = assignGroups(['m3'], ['c2', 'c1'], 'lecturer');
    expect(r.ok && r.data.updated).toBe(1);
    expect(groupRoleOf('m3', 'c2')).toBe('lecturer');
    // đã ở c1 → vẫn được nâng vai trò, nhưng không có thông báo "thêm vào nhóm"
    expect(groupRoleOf('m3', 'c1')).toBe('lecturer');
    const notes = inboxNotifications('m3').filter((n) => n.title.startsWith('Bạn đã được thêm'));
    expect(notes.map((n) => n.link)).toEqual(['/chat/c2']);
    // gán lại "Thành viên" không hạ Giảng viên, chủ nhóm giữ nguyên
    assignGroups(['m3', 'm1'], ['c2', 'c1'], 'member');
    expect(groupRoleOf('m3', 'c2')).toBe('lecturer');
    expect(groupRoleOf('m1', 'c1')).toBe('owner');
  });

  it('gửi tin idempotent theo clientMsgId, có trích dẫn', () => {
    // This case owns the original four-human-message fixture; bot history is covered separately.
    mockDb().messages.set('c1-general', buildMessages().get('c1-general') ?? []);
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
});

describe('NA-25 số chưa đọc + CR-15 public stats (MSW)', () => {
  beforeEach(() => resetMockDb());

  it('REQ-225 chatUnread cộng theo nhóm đã tham gia; đọc phòng → giảm', () => {
    const u = chatUnread('m1');
    expect(u.total).toBe(Object.values(u.byGroup).reduce((a, b) => a + b, 0));
    expect(u.byGroup['c1']).toBe(4);
    markRoomRead('m1', 'c1-qa');
    expect(chatUnread('m1').byGroup['c1']).toBe(1);
  });

  it('CR-15 publicStats tính từ store, không ngẫu nhiên', () => {
    const a = publicStats();
    expect(a).toEqual(publicStats());
    expect(a.communities).toBe(90);
    expect(a.members).toBeGreaterThan(0);
  });
});
