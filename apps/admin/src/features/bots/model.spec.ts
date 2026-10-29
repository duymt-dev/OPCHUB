import type { BotThread, Persona } from '@opchub/shared/api-domains';
import {
  agoOf,
  botStats,
  emptyScript,
  initialOf,
  moveItem,
  parseTopics,
  personaBody,
  personaError,
  personaToForm,
  scriptBody,
  scriptError,
  splitTags,
} from './model';
import { drawerPath, parseBotPath } from './route';

const persona = (over: Partial<Persona> = {}): Persona => ({
  id: 'ps1',
  name: 'Trần Minh Khoa',
  title: 'Freelancer',
  province: 'Hà Nội',
  tone: 'Thân thiện, hay hỏi',
  groupIds: ['c1'],
  enabled: true,
  postCount: 3,
  color: '#1677FF',
  avatarUrl: null,
  gender: '',
  ageRange: '',
  bio: '',
  skills: '',
  postsPerDay: 2,
  activeHours: '8:00 – 22:00',
  ...over,
});

describe('bots model', () => {
  it('chữ cái đầu lấy từ tên cuối như prototype', () => {
    expect(initialOf('Trần Minh Khoa')).toBe('K');
    expect(initialOf('')).toBe('?');
  });

  it('x phút / giờ / ngày trước, tối thiểu 1 phút', () => {
    const now = Date.parse('2026-10-16T09:00:00Z');
    expect(agoOf('2026-10-16T09:00:00Z', now)).toEqual({ key: 'minutes', n: 1 });
    expect(agoOf('2026-10-16T06:00:00Z', now)).toEqual({ key: 'hours', n: 3 });
    expect(agoOf('2026-10-14T09:00:00Z', now)).toEqual({ key: 'days', n: 2 });
  });

  it('thống kê persona bật / tổng, hội thoại theo trạng thái', () => {
    const th = (status: BotThread['status']) => ({ status }) as BotThread;
    const s = botStats(
      [persona(), persona({ id: 'ps2', enabled: false })],
      [],
      [th('done'), th('scheduled'), th('done')],
    );
    expect(s).toEqual({ personas: '1 / 2', scripts: '0', posted: '2', pending: '1' });
  });

  it('kiểm tra persona: thiếu tên → thiếu nhóm → hợp lệ', () => {
    const f = personaToForm(persona({ name: ' ', groupIds: [] }));
    expect(personaError(f)).toEqual({ name: 'needName', groupIds: 'needGroup' });
    expect(personaError({ ...f, name: 'A B' })).toEqual({ groupIds: 'needGroup' });
    expect(personaError({ ...f, name: 'A B', groupIds: ['c1'] })).toEqual({});
    expect(personaBody({ ...f, postsPerDay: '99' }).postsPerDay).toBe(20);
  });

  it('kịch bản: kiểm tra + bỏ lượt trống khi gửi', () => {
    const f = emptyScript(['ps1', 'ps2']);
    expect(f.lines.map((l) => l.personaId)).toEqual(['ps1', 'ps2']);
    expect(scriptError(f)).toEqual({
      topic: 'needTopic',
      groupIds: 'needGroup',
      lines: 'needLine',
    });
    const g = { ...f, topic: 'Thuế', groupIds: ['c1'] };
    expect(scriptError(g)).toEqual({ lines: 'needLine' });
    const first = g.lines[0];
    if (!first) throw new Error('thiếu lượt');
    const h = { ...g, lines: [{ ...first, body: ' Hỏi ' }, ...g.lines.slice(1)] };
    expect(scriptError(h)).toEqual({});
    expect(scriptBody(h).lines).toEqual([{ personaId: 'ps1', body: 'Hỏi' }]);
    expect(scriptBody(h).runAt).toBeNull();
  });

  it('D-112 preserves script gaps above five and caps the form at60 minutes', () => {
    const form = emptyScript(['ps1', 'ps2']);
    expect(scriptBody({ ...form, delayMinutes: '6' }).delayMinutes).toBe(6);
    expect(scriptBody({ ...form, delayMinutes: '60' }).delayMinutes).toBe(60);
    expect(scriptBody({ ...form, delayMinutes: '120' }).delayMinutes).toBe(60);
  });

  it('BUG-022 personaError / scriptError trả mọi lỗi cùng lúc, thứ tự ô prototype', () => {
    expect(Object.keys(personaError(personaToForm(persona({ name: '', groupIds: [] }))))).toEqual([
      'name',
      'groupIds',
    ]);
    expect(Object.keys(scriptError(emptyScript([])))).toEqual(['topic', 'groupIds', 'lines']);
  });

  it('đổi chỗ lượt, giữ nguyên ở biên', () => {
    expect(moveItem([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
    expect(moveItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
    expect(moveItem([1, 2, 3], 2, 1)).toEqual([1, 2, 3]);
  });

  it('chủ đề và chuyên môn tách theo dấu phẩy', () => {
    expect(parseTopics('a, , b ,c')).toEqual(['a', 'b', 'c']);
    expect(splitTags('Thuế, AI, Marketing, Khác')).toEqual(['Thuế', 'AI', 'Marketing']);
  });
});

describe('bots route', () => {
  it('đọc tab + drawer từ đường dẫn', () => {
    expect(parseBotPath('/bots')).toEqual({ tab: 'log', drawer: null });
    expect(parseBotPath('/bots/personas')).toEqual({ tab: 'persona', drawer: null });
    expect(parseBotPath('/bots/personas/new')).toEqual({ tab: 'persona', drawer: 'new' });
    expect(parseBotPath('/bots/scripts/sc1')).toEqual({ tab: 'script', drawer: 'sc1' });
    expect(parseBotPath('/bots/threads')).toEqual({ tab: 'queue', drawer: null });
    expect(parseBotPath('/bots/threads/x')).toBeNull();
    expect(parseBotPath('/bots/replies')).toEqual({ tab: 'reply', drawer: null });
    expect(parseBotPath('/bots/replies/new')).toBeNull();
    expect(parseBotPath('/bots/abc')).toBeNull();
  });

  it('đường dẫn drawer', () => {
    expect(drawerPath('persona', null)).toBe('/bots/personas/new');
    expect(drawerPath('script', 'sc1')).toBe('/bots/scripts/sc1');
  });
});
