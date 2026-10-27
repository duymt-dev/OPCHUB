import { describe, expect, it } from 'vitest';
import { extMatchesMime, hasExecutableExt, magicMatches } from './upload-safety';

const bytes = (...v: number[]) => Uint8Array.from(v);
const text = (s: string) => Uint8Array.from([...s].map((c) => c.charCodeAt(0)));

describe('upload-safety (D-117 B5)', () => {
  it('đuôi thực thi ở mọi đoạn tên → chặn; tài liệu thường → không', () => {
    for (const n of [
      'x.exe',
      'X.EXE',
      'hoa-don.pdf.exe',
      'a.exe.pdf',
      'setup.msi',
      'run.sh',
      'a.ps1',
    ])
      expect(hasExecutableExt(n)).toBe(true);
    for (const n of ['bao-cao.pdf', 'Ke-hoach-Q4.docx', 'anh.png', 'README'])
      expect(hasExecutableExt(n)).toBe(false);
  });

  it('đuôi phải khớp MIME; tên không đuôi chấp nhận', () => {
    expect(extMatchesMime('a.pdf', 'application/pdf')).toBe(true);
    expect(extMatchesMime('a.JPEG', 'image/jpeg')).toBe(true);
    expect(extMatchesMime('a.xlsx', 'application/pdf')).toBe(false);
    expect(extMatchesMime('anh', 'image/png')).toBe(true);
  });

  it('byte đầu khớp MIME; chữ ký thực thi luôn bị chặn', () => {
    expect(magicMatches('application/pdf', text('%PDF-1.7'))).toBe(true);
    expect(magicMatches('application/pdf', text('MZ\x90\x00'))).toBe(false);
    expect(magicMatches('image/png', bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe(
      true,
    );
    expect(magicMatches('image/jpeg', bytes(0xff, 0xd8, 0xff, 0xe0))).toBe(true);
    expect(magicMatches('image/webp', text('RIFF\x00\x00\x00\x00WEBPVP8 '))).toBe(true);
    expect(
      magicMatches(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        bytes(0x50, 0x4b, 0x03, 0x04),
      ),
    ).toBe(true);
    expect(magicMatches('application/zip', bytes(0x7f, 0x45, 0x4c, 0x46))).toBe(false);
    expect(magicMatches('text/plain', text('xin chao'))).toBe(true);
    expect(magicMatches('text/plain', text('#!/bin/sh'))).toBe(false);
    expect(magicMatches('text/plain', bytes(0x41, 0x00))).toBe(false);
  });
});
