/**
 * Ảnh mẫu như prototype (D-36: giữ ảnh ngoài cho parity, tự host trước go-live).
 * Khi API trả `coverUrl` thì dùng ảnh đó.
 */

const UNSPLASH = 'https://images.unsplash.com/photo-';

const COVERS: Record<string, string> = {
  e1: '1515187029135-18ee286d815b',
  e2: '1591115765373-5207764f72e7',
  e3: '1554224155-6726b3ff858f',
  e4: '1540575467063-178a50c2df87',
  e5: '1528605248644-14dd04022da1',
};
const DEFAULT_COVER = '1540575467063-178a50c2df87';

export const eventCoverSrc = (id: string, custom?: string | null) =>
  custom || `${UNSPLASH}${COVERS[id] ?? DEFAULT_COVER}?w=800&h=400&fit=crop&auto=format`;

export const eventCoverFallback = (id: string) => `https://picsum.photos/seed/${id}/800/400`;

const FACES_W = [
  '1726067438466-df7db360f4e3',
  '1726067438478-7dd7a4dfcab4',
  '1727709699256-f73bc3b72798',
  '1676697002149-593897f7a012',
  '1726067438503-9c9c5d3ebe22',
  '1727709699241-efabfa10aaa5',
  '1676697016870-00e68381a3ff',
  '1727709699258-6195f9125fa0',
  '1676697260508-28e246392013',
];
const FACES_M = [
  '1731960745314-e12045ee74a5',
  '1633177188754-980c2a6b6266',
  '1592473858143-790cde951b1a',
  '1478427094460-4c8d412903e2',
];

/** 3 ảnh người đã đăng ký trên thẻ thứ `order` (prototype avs: (k*7 + j*11) % 70 + 1) */
export const attendeesOf = (order: number) =>
  [0, 1, 2].map((j) => {
    const list = j % 2 ? FACES_W : FACES_M;
    const n = (((order * 7 + j * 11) % 70) + 1) % list.length;
    return `${UNSPLASH}${list[n] ?? list[0]}?w=160&h=160&fit=crop&crop=faces&auto=format&q=70`;
  });
