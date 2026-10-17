/**
 * Ảnh nhóm cỡ w×h cho rail chat — giống prototype (GCOV): 6 nhóm có ảnh Unsplash cố định,
 * nhóm khác ảnh picsum theo id. D-36: tự host trước go-live (thay bằng `groups.cover_url`).
 */
const GROUP_COVERS: Record<string, string> = {
  c1: 'photo-1509030450996-dd1a26dda07a',
  c2: 'photo-1583417319070-4a69db38a482',
  c3: 'photo-1559592413-7cec4d0cae2b',
  c4: 'photo-1599708153386-62bf3f035c78',
  c5: 'photo-1583244685026-d8519b5e3d21',
  c6: 'photo-1573790387438-4da905039392',
};

export function groupImage(groupId: string, w: number, h: number): string {
  const u = GROUP_COVERS[groupId];
  return u
    ? `https://images.unsplash.com/${u}?w=${w}&h=${h}&fit=crop&auto=format`
    : `https://picsum.photos/seed/${groupId}/${w}/${h}`;
}
