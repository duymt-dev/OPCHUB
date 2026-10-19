import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppError } from '../errors';
import { parseClean, sanitizeInput } from './sanitize-input';

describe('sanitizeInput (NA-27, BUG-020)', () => {
  it('REQ-227 rich theo đường dẫn lồng', () => {
    const input = {
      topic: '<b>Chủ đề</b>',
      lines: [
        { body: '<p>Câu <b>1</b></p><script>x</script>', note: '<i>n</i>' },
        { body: '<p onclick="x">Câu 2</p>', note: 'n2' },
      ],
    };
    const { value, changed } = sanitizeInput(input, { rich: ['lines.*.body'] });
    expect(value).toEqual({
      topic: 'Chủ đề',
      lines: [
        { body: '<p>Câu <b>1</b></p>', note: 'n' },
        { body: '<p>Câu 2</p>', note: 'n2' },
      ],
    });
    expect(changed.sort()).toEqual(['lines.0.body', 'lines.0.note', 'lines.1.body', 'topic']);
  });

  it('REQ-227 bỏ qua password/token/url/email', () => {
    const input = {
      password: 'Ab<b>12345',
      newPassword: '<i>x</i>',
      mfaToken: '<b>t</b>',
      code: '<b>1</b>',
      taxCode: '<b>0101</b>',
      coverUrl: 'https://a.vn/<b>',
      href: '<b>h</b>',
      email: '<b>a</b>@x.vn',
      smtpKey: '<k>',
      name: '<b>An</b>',
    };
    const { value, changed } = sanitizeInput(input);
    expect(value).toEqual({ ...input, name: 'An' });
    expect(changed).toEqual(['name']);
  });

  it('REQ-227 mảng chuỗi', () => {
    const { value } = sanitizeInput({ tags: ['<b>AI</b>', 'R&D', 'a<b'], n: 1, ok: true, x: null });
    expect(value).toEqual({ tags: ['AI', 'R&D', 'a<b'], n: 1, ok: true, x: null });
  });

  it('không đổi gì → trả đúng object cũ', () => {
    const input = { a: 'x', b: ['y'] };
    expect(sanitizeInput(input).value).toBe(input);
  });
});

describe('parseClean', () => {
  const schema = z.object({ type: z.string(), body: z.string().trim().min(1).max(100) });

  it('BUG-020 chỉ có script → 400 fields[{path:body}]', () => {
    let err: unknown;
    try {
      parseClean(schema, { type: 'q', body: '<script>alert(1)</script>' });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).fields).toEqual([{ path: 'body', message: 'Nội dung không hợp lệ' }]);
  });

  it('làm sạch xong vẫn hợp lệ → trả bản sạch', () => {
    expect(parseClean(schema, { type: 'q', body: '<b>Chào</b>' })).toEqual({
      type: 'q',
      body: 'Chào',
    });
  });
});
