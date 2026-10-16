/**
 * Ảnh bìa mẫu của nhóm cộng đồng như prototype (D-36: giữ ảnh ngoài cho parity, tự host trước
 * go-live). Khi API trả `coverUrl` thì dùng ảnh đó.
 */
const COVER_IDS: Record<string, string> = {
  c1: '1509030450996-dd1a26dda07a',
  c2: '1583417319070-4a69db38a482',
  c3: '1559592413-7cec4d0cae2b',
  c4: '1599708153386-62bf3f035c78',
  c5: '1583244685026-d8519b5e3d21',
  c6: '1573790387438-4da905039392',
};

export const groupCoverFallback = (id: string) => `https://picsum.photos/seed/${id}/600/300`;

export function groupCoverSrc(id: string, custom?: string | null): string {
  if (custom) return custom;
  const photo = COVER_IDS[id];
  return photo
    ? `https://images.unsplash.com/photo-${photo}?w=800&h=400&fit=crop&auto=format`
    : `https://picsum.photos/seed/${id}/800/400`;
}
