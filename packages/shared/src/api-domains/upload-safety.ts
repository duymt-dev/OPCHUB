import { MIME_EXT, type UploadMime } from './uploads';

/**
 * D-117 B5 (security.md › Upload): chặn tệp thực thi đội lốt tài liệu. Ba lớp: đuôi tên không thuộc
 * danh sách thực thi, đuôi khớp MIME đã khai báo, byte đầu object khớp chữ ký của MIME.
 */

/** Đuôi tệp thực thi / script — từ chối dù MIME khai báo là gì */
export const EXECUTABLE_EXT = [
  'exe',
  'bat',
  'cmd',
  'com',
  'msi',
  'msp',
  'scr',
  'pif',
  'cpl',
  'dll',
  'sys',
  'js',
  'mjs',
  'jse',
  'vbs',
  'vbe',
  'wsf',
  'wsh',
  'hta',
  'ps1',
  'psm1',
  'sh',
  'bash',
  'zsh',
  'csh',
  'apk',
  'jar',
  'app',
  'dmg',
  'pkg',
  'deb',
  'rpm',
  'run',
  'bin',
  'elf',
  'lnk',
  'reg',
  'iso',
  'py',
  'pl',
  'rb',
  'php',
] as const;

/** Đuôi chấp nhận cho từng MIME (đuôi khoá object + tên thường gặp) */
const MIME_NAME_EXT: Record<UploadMime, readonly string[]> = {
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/webp': ['webp'],
  'application/pdf': ['pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
  'application/zip': ['zip'],
  'text/plain': ['txt'],
  'application/msword': ['doc'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.ms-powerpoint': ['ppt'],
  'text/csv': ['csv'],
  'video/mp4': ['mp4', 'm4v'],
  'video/webm': ['webm'],
  'video/quicktime': ['mov'],
};

/** Đuôi cuối của tên tệp, chữ thường; không có → '' */
export function extOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0
    ? name
        .slice(dot + 1)
        .trim()
        .toLowerCase()
    : '';
}

/** Tên có đuôi thực thi ở bất kỳ đoạn nào (`hoa-don.pdf.exe`, `a.exe.pdf`) */
export function hasExecutableExt(name: string): boolean {
  const parts = name.toLowerCase().split('.').slice(1);
  return parts.some((p) => (EXECUTABLE_EXT as readonly string[]).includes(p.trim()));
}

/** Đuôi tên khớp MIME (tên không đuôi → chấp nhận, hiển thị theo MIME) */
export function extMatchesMime(name: string, mime: UploadMime): boolean {
  const ext = extOf(name);
  return ext === '' || MIME_NAME_EXT[mime].includes(ext) || MIME_EXT[mime] === ext;
}

/** Số byte đầu cần đọc để kiểm chữ ký */
export const MAGIC_PREFIX_BYTES = 16;

const startsWith = (b: Uint8Array, sig: readonly number[], at = 0) =>
  sig.every((v, i) => b[at + i] === v);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

/** Chữ ký tệp thực thi phổ biến: PE (MZ), ELF, Mach-O, Java class / Mach-O fat, script `#!` */
const EXECUTABLE_MAGIC: readonly (readonly number[])[] = [
  ascii('MZ'),
  [0x7f, 0x45, 0x4c, 0x46],
  [0xfe, 0xed, 0xfa, 0xce],
  [0xfe, 0xed, 0xfa, 0xcf],
  [0xce, 0xfa, 0xed, 0xfe],
  [0xcf, 0xfa, 0xed, 0xfe],
  [0xca, 0xfe, 0xba, 0xbe],
  ascii('#!'),
];

/** Byte đầu khớp MIME đã khai báo và không phải chữ ký tệp thực thi */
export function magicMatches(mime: UploadMime, head: Uint8Array): boolean {
  if (EXECUTABLE_MAGIC.some((sig) => startsWith(head, sig))) return false;
  switch (mime) {
    case 'image/png':
      return startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case 'image/jpeg':
      return startsWith(head, [0xff, 0xd8, 0xff]);
    case 'image/webp':
      return startsWith(head, ascii('RIFF')) && startsWith(head, ascii('WEBP'), 8);
    case 'application/pdf':
      return startsWith(head, ascii('%PDF-'));
    case 'text/plain':
    case 'text/csv':
      // Văn bản thuần không có chữ ký — chỉ chặn byte NUL (nhị phân)
      return !head.includes(0);
    case 'application/msword':
    case 'application/vnd.ms-excel':
    case 'application/vnd.ms-powerpoint':
      // Office 97–2003: OLE Compound File
      return startsWith(head, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    case 'video/mp4':
    case 'video/quicktime':
      // ISO BMFF / QuickTime: hộp đầu `ftyp` ở byte 4 (QuickTime cũ: `moov` / `mdat` / `wide`)
      return ['ftyp', 'moov', 'mdat', 'wide'].some((b) => startsWith(head, ascii(b), 4));
    case 'video/webm':
      // EBML
      return startsWith(head, [0x1a, 0x45, 0xdf, 0xa3]);
    default:
      // docx / xlsx / pptx / zip đều là ZIP (`PK\x03\x04`, rỗng `PK\x05\x06`)
      return (
        startsWith(head, [0x50, 0x4b, 0x03, 0x04]) || startsWith(head, [0x50, 0x4b, 0x05, 0x06])
      );
  }
}
