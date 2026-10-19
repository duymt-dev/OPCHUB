import { describe, expect, it } from 'vitest';
import { sendMessageSchema } from './chat-room';
import { cleanFileName, fileExtLabel, formatFileSize, presignRequestSchema } from './uploads';

describe('uploads (TIP-V2-111)', () => {
  it('REQ-226 presign theo kind: chat-file nhận pdf ≤ 10MB; ảnh chỉ PNG/JPEG/WEBP ≤ 5MB; svg → lỗi', () => {
    const ok = (v: unknown) => presignRequestSchema.safeParse(v).success;
    expect(ok({ kind: 'chat-file', contentType: 'application/pdf', size: 10 * 1024 * 1024 })).toBe(
      true,
    );
    expect(
      ok({ kind: 'chat-file', contentType: 'application/pdf', size: 10 * 1024 * 1024 + 1 }),
    ).toBe(false);
    expect(ok({ kind: 'chat-file', contentType: 'image/svg+xml', size: 10 })).toBe(false);
    expect(ok({ kind: 'chat-image', contentType: 'image/webp', size: 5 * 1024 * 1024 })).toBe(true);
    expect(ok({ kind: 'chat-image', contentType: 'application/pdf', size: 10 })).toBe(false);
    expect(ok({ kind: 'avatar', contentType: 'image/png', size: 6 * 1024 * 1024 })).toBe(false);
  });

  it('BUG-010 tin file/image bắt buộc attachment.url', () => {
    const base = { clientMsgId: 'x', kind: 'file' as const };
    const a = { name: 'a.pdf', size: '', ext: '' };
    expect(sendMessageSchema.safeParse({ ...base, attachment: a }).success).toBe(false);
    expect(
      sendMessageSchema.safeParse({ ...base, attachment: { ...a, url: 'http://s/x' } }).success,
    ).toBe(true);
  });

  it('định dạng tên / đuôi / dung lượng', () => {
    expect(formatFileSize(640 * 1024)).toBe('640 KB');
    expect(formatFileSize(1.25 * 1024 * 1024)).toBe('1.3 MB');
    expect(cleanFileName('dir/sub/bao\u0000-cao.pdf')).toBe('bao-cao.pdf');
    expect(cleanFileName('x'.repeat(200))).toHaveLength(120);
    expect(fileExtLabel('Ke-hoach-Q4.pdf', 'application/pdf')).toBe('PDF');
    expect(fileExtLabel('khongduoi', 'application/zip')).toBe('ZIP');
  });
});
