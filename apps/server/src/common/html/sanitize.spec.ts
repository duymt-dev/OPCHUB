import { describe, expect, it } from 'vitest';
import { sanitizeRichHtml as sanitizeDescription } from './sanitize';

describe('sanitizeDescription', () => {
  it('giữ thẻ RichEditor, bỏ script / on* / javascript:', () => {
    const out = sanitizeDescription(
      '<p onclick="x()">Chào <b>bạn</b></p><script>alert(1)</script><a href="javascript:alert(1)">x</a><img src=x onerror=alert(1)>',
    );
    expect(out).toBe('<p>Chào <b>bạn</b></p><a>x</a>');
  });

  it('văn bản thuần giữ nguyên', () => {
    expect(sanitizeDescription('Mô tả ngắn & gọn')).toBe('Mô tả ngắn & gọn');
  });
});
