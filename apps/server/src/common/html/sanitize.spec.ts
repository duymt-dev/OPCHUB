import { describe, expect, it } from 'vitest';
import { looksLikeMarkup, sanitizeRichHtml, toPlainText } from './sanitize';

describe('sanitizeRichHtml (NA-27)', () => {
  it('giữ thẻ RichEditor, bỏ script / on* / javascript:', () => {
    const out = sanitizeRichHtml(
      '<p onclick="x()">Chào <b>bạn</b></p><script>alert(1)</script><a href="javascript:alert(1)">x</a><img src=x onerror=alert(1)>',
    );
    expect(out).toBe('<p>Chào <b>bạn</b></p><a rel="noopener noreferrer">x</a>');
  });

  it('văn bản thuần giữ nguyên', () => {
    expect(sanitizeRichHtml('Mô tả ngắn & gọn')).toBe('Mô tả ngắn & gọn');
  });

  it('REQ-227 giữ biến email trong chữ và href', () => {
    const html = '<p>Chào {{ten}} ({{email}})</p><a href="{{link_dang_nhap}}">Vào</a>';
    expect(sanitizeRichHtml(html)).toBe(
      '<p>Chào {{ten}} ({{email}})</p><a href="{{link_dang_nhap}}" rel="noopener noreferrer">Vào</a>',
    );
  });

  it('REQ-227 bỏ javascript: và data:', () => {
    const out = sanitizeRichHtml(
      '<a href="data:text/html;base64,PHNjcmlwdD4=">a</a><a href=" javascript:x">b</a><a href="/rel">c</a><a href="{{ten}}x">d</a>',
    );
    expect(out).not.toMatch(/href/);
    expect(out).toContain('>a</a>');
  });

  it('REQ-227 thêm rel noopener, giữ http/https/mailto, target chỉ _blank', () => {
    const out = sanitizeRichHtml(
      '<a href="https://a.vn" target="_blank" rel="opener">1</a><a href="mailto:x@y.vn" target="top">2</a><a href="http://b.vn">3</a>',
    );
    expect(out).toBe(
      '<a href="https://a.vn" target="_blank" rel="noopener noreferrer">1</a>' +
        '<a href="mailto:x@y.vn" rel="noopener noreferrer">2</a>' +
        '<a href="http://b.vn" rel="noopener noreferrer">3</a>',
    );
  });

  it('REQ-227 idempotent', () => {
    const once = sanitizeRichHtml('<p>x <a href="https://a.vn">y</a></p><script>z</script>');
    expect(sanitizeRichHtml(once)).toBe(once);
  });
});

describe('toPlainText (security.md: chuỗi thường không nhận HTML)', () => {
  it('toPlainText giữ "2 < 3" và "a<b"', () => {
    for (const s of ['2 < 3', 'a<b', 'R&D', '2 < 3 và a<b', '<3 bạn', 'x << y']) {
      expect(looksLikeMarkup(s)).toBe(false);
      expect(toPlainText(s)).toBe(s);
    }
  });

  it('toPlainText bỏ script kèm nội dung', () => {
    expect(toPlainText('<script>alert(1)</script><img src=x onerror=alert(2)>Chào')).toBe('Chào');
    expect(toPlainText('<style>p{}</style><b>đậm</b> & <i>nghiêng</i>')).toBe('đậm & nghiêng');
    expect(toPlainText('<script>alert(1)</script>')).toBe('');
    expect(toPlainText('a <!-- x --> b')).toBe('a  b');
  });

  it('toPlainText idempotent (entity giải mã thành thẻ cũng bị bỏ)', () => {
    const once = toPlainText('<p>&lt;b&gt;x&lt;/b&gt;</p>');
    expect(once).toBe('x');
    expect(toPlainText(once)).toBe(once);
  });
});
