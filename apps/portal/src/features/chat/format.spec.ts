import { describe, expect, it } from 'vitest';
import {
  applyMention,
  extTone,
  fileTime,
  fmtNumber,
  insertAt,
  mentionedNames,
  mentionQuery,
  messageTime,
  shortGroupName,
  tokenize,
  vnDate,
} from './format';

const NOW = new Date('2026-10-16T09:00:00+07:00');

describe('chat format', () => {
  it('giờ VN trong ngày, "Hôm qua" khác ngày', () => {
    expect(messageTime('2026-10-16T02:12:00Z', 'Hôm qua', NOW)).toBe('09:12');
    expect(messageTime('2026-10-15T08:30:00Z', 'Hôm qua', NOW)).toBe('Hôm qua');
    expect(vnDate('2026-10-14T17:00:00Z')).toBe('15/10/2026');
  });

  it('số và tên nhóm', () => {
    expect(fmtNumber(1248)).toBe('1.248');
    expect(shortGroupName('OPC Hà Nội')).toBe('Hà Nội');
  });

  it('tách @nhắc tên và đoạn khớp tìm kiếm', () => {
    expect(tokenize('ai đi Meetup #12', 'An', 'meetup')).toEqual([
      { kind: 'text', text: 'ai đi ' },
      { kind: 'hit', text: 'Meetup' },
      { kind: 'text', text: ' #12' },
    ]);
    const t = tokenize('Chào @Nguyễn Văn An nhé', 'Nguyễn Văn An', '');
    expect(t[1]).toEqual({ kind: 'mention', text: '@Nguyễn Văn An', me: true });
  });

  it('gợi ý nhắc tên', () => {
    expect(insertAt('')).toBe('@');
    expect(insertAt('Chào')).toBe('Chào @');
    expect(mentionQuery('Chào @Le')).toBe('le');
    expect(mentionQuery('Chào')).toBeNull();
    expect(applyMention('Chào @Le', 'Lê Minh Anh')).toBe('Chào @Lê Minh Anh ');
    expect(mentionedNames('@Lê Minh Anh và @Ai Đó', ['Lê Minh Anh'])).toEqual(['Lê Minh Anh']);
  });

  it('D-98 dòng File chia sẻ: giờ hôm nay / ngày khác; màu nhãn đuôi theo prototype', () => {
    expect(fileTime('2026-10-16T02:12:00Z', NOW)).toBe('09:12');
    expect(fileTime('2026-10-14T02:12:00Z', NOW)).toBe('14/10/2026');
    expect(extTone('PDF', false)).toBe('pdf');
    expect(extTone('DOCX', false)).toBe('doc');
    expect(extTone('CSV', false)).toBe('xls');
    expect(extTone('PPTX', false)).toBe('ppt');
    expect(extTone('IMG', true)).toBe('img');
    expect(extTone('ZIP', false)).toBe('other');
  });
});
