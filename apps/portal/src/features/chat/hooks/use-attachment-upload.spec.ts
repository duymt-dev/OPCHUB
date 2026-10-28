import { describe, expect, it } from 'vitest';
import { checkFile } from './use-attachment-upload';

const MB = 1024 * 1024;

describe('checkFile (TIP-V2-111)', () => {
  it('NA-26 ảnh 6 MB / sai kiểu → lỗi, không presign', () => {
    expect(checkFile('image', { type: 'image/png', size: 6 * MB })).toBe('imageInvalid');
    expect(checkFile('image', { type: 'image/gif', size: 10 })).toBe('imageInvalid');
    expect(checkFile('image', { type: 'image/jpeg', size: 5 * MB })).toBeNull();
  });

  it('BUG-010 D-98 tệp: pdf 300 KB / 15 MB nhận; 21 MB → tối đa 20 MB; csv / xls nhận; exe → không hỗ trợ', () => {
    expect(checkFile('file', { type: 'application/pdf', size: 300 * 1024 })).toBeNull();
    expect(checkFile('file', { type: 'application/pdf', size: 15 * MB })).toBeNull();
    expect(checkFile('file', { type: 'application/pdf', size: 21 * MB })).toBe('fileTooBig');
    expect(checkFile('file', { type: 'text/csv', size: 10 })).toBeNull();
    expect(checkFile('file', { type: 'application/vnd.ms-excel', size: 10 })).toBeNull();
    expect(checkFile('file', { type: 'application/x-msdownload', size: 10 })).toBe('fileType');
  });
});
