/**
 * D-36: ảnh bìa mặc định TỰ HOST (`public/images/cover-default.svg` của Portal + Admin) khi nhóm /
 * sự kiện chưa có ảnh bìa. Ảnh thật là `coverUrl` của API (storage, NA-26) — không còn ảnh CDN ngoài.
 */
export const COVER_DEFAULT_SRC = '/images/cover-default.svg';

export function groupCoverSrc(custom?: string | null): string {
  return custom || COVER_DEFAULT_SRC;
}
