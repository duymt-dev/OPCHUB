import { z } from 'zod';

/**
 * Hằng upload dùng chung server + FE + MSW (security.md › Upload, NA-26, TIP-V2-111):
 * ảnh JPG/PNG/WebP ≤ 5 MB; tệp đính kèm chat thêm tài liệu văn phòng / PDF / ZIP / TXT / CSV ≤ 20 MB (D-98).
 */

export const IMAGE_MIME = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type ImageMime = (typeof IMAGE_MIME)[number];
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** V2Q-97: whitelist tệp chat chọn theo prototype ("Ke-hoach-Q4.pdf") + tài liệu văn phòng thường gặp */
export const CHAT_FILE_MIME = [
  ...IMAGE_MIME,
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'text/plain',
  // D-98 / FULL-AUDIT :96: Word / Excel / PowerPoint đời cũ + CSV
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'text/csv',
] as const;
export type ChatFileMime = (typeof CHAT_FILE_MIME)[number];
/** D-98 (§27.7): 20 MB / tệp */
export const CHAT_FILE_MAX_BYTES = 20 * 1024 * 1024;

/** Đuôi khoá object theo MIME (server sinh khoá, không dùng tên tệp người dùng) */
export const MIME_EXT: Record<ChatFileMime, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/zip': 'zip',
  'text/plain': 'txt',
  'application/msword': 'doc',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.ms-powerpoint': 'ppt',
  'text/csv': 'csv',
};

export const isImageMime = (v: string): v is ImageMime =>
  (IMAGE_MIME as readonly string[]).includes(v);
export const isChatFileMime = (v: string): v is ChatFileMime =>
  (CHAT_FILE_MIME as readonly string[]).includes(v);

/** Chuỗi hiển thị "640 KB" / "1.2 MB" (như prototype) */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Tên tệp hiển thị: bỏ ký tự điều khiển + đường dẫn, ≤ 120 ký tự */
export function cleanFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  // eslint-disable-next-line no-control-regex -- bỏ đúng ký tự điều khiển
  const clean = base.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return (clean || 'tep').slice(0, 120);
}

/** Nhãn đuôi tệp in hoa trên thẻ tệp ("PDF") */
export function fileExtLabel(name: string, contentType: string): string {
  const dot = name.lastIndexOf('.');
  const fromName = dot > 0 ? name.slice(dot + 1) : '';
  const ext = /^[a-z0-9]{1,6}$/i.test(fromName)
    ? fromName
    : (MIME_EXT[contentType as ChatFileMime] ?? '');
  return ext.toUpperCase() || 'FILE';
}

/** Q-G3b-6, Q-G5a-2: ảnh bìa dự án / sự kiện / nhóm, avatar; TIP-V2-111: tệp + ảnh chat */
export const UPLOAD_KINDS = [
  'avatar',
  'project-cover',
  'store-cover',
  'store-item',
  'team-avatar',
  'event-cover',
  'group-cover',
  'persona-avatar',
  'platform-logo',
  'chat-image',
  'chat-file',
] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];
export const IMAGE_UPLOAD_KINDS = UPLOAD_KINDS.filter(
  (k): k is Exclude<UploadKind, 'chat-file'> => k !== 'chat-file',
);
/** Kind cần phí thành viên khi presign (chat) — avatar/hồ sơ đổi được khi chưa đóng phí */
export const FEE_UPLOAD_KINDS: readonly UploadKind[] = ['chat-image', 'chat-file'];

const imagePresign = z.object({
  kind: z.enum(IMAGE_UPLOAD_KINDS),
  contentType: z.enum(IMAGE_MIME),
  size: z.number().int().min(1).max(IMAGE_MAX_BYTES),
});
const chatFilePresign = z.object({
  kind: z.literal('chat-file'),
  contentType: z.enum(CHAT_FILE_MIME),
  size: z.number().int().min(1).max(CHAT_FILE_MAX_BYTES),
});

/** `POST /uploads/presign` — MIME + cỡ theo kind */
export const presignRequestSchema = z.discriminatedUnion('kind', [imagePresign, chatFilePresign]);
export type PresignRequest = z.infer<typeof presignRequestSchema>;
export const presignResultSchema = z.object({ uploadUrl: z.string(), publicUrl: z.url() });
export type PresignResult = z.infer<typeof presignResultSchema>;
