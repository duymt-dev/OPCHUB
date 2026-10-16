import { tones } from '@opchub/ui';
import type { ToneName } from '@opchub/ui';

/**
 * Ảnh mẫu + tông màu nhóm như prototype (Q-05 / D-36: giữ ảnh ngoài cho parity,
 * thay bằng ảnh tự host trước go-live). Khi API trả `coverUrl` thì dùng ảnh đó.
 */

const UNSPLASH = 'https://images.unsplash.com/photo-';

/** Ảnh bìa riêng cho 6 nhóm lớn; còn lại lấy ảnh ngẫu nhiên theo id */
const COVER_IDS: Record<string, string> = {
  c1: '1509030450996-dd1a26dda07a',
  c2: '1583417319070-4a69db38a482',
  c3: '1559592413-7cec4d0cae2b',
  c4: '1599708153386-62bf3f035c78',
  c5: '1583244685026-d8519b5e3d21',
  c6: '1573790387438-4da905039392',
};

export const fallbackCover = (id: string) => `https://picsum.photos/seed/${id}/800/400`;

export function coverOf(id: string): string {
  const photo = COVER_IDS[id];
  return photo ? `${UNSPLASH}${photo}?w=800&h=400&fit=crop&auto=format` : fallbackCover(id);
}

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

/** Ảnh chân dung của thành viên mẫu (cột 7 bảng D_P của prototype) */
const PEOPLE = [
  'w44',
  'm32',
  'w65',
  'm75',
  'm46',
  'w68',
  'm86',
  'm52',
  'w26',
  'w90',
  'm22',
  'w12',
  'm61',
  'w33',
  'w57',
  'm18',
  'w79',
  'm40',
  'w50',
  'm67',
  'w21',
  'm9',
  'm28',
  'm36',
  'm71',
  'm11',
];

function portrait(code: string): string {
  const list = code.startsWith('w') ? FACES_W : FACES_M;
  const photo = list[Number(code.slice(1)) % list.length] ?? list[0];
  return `${UNSPLASH}${photo}?w=160&h=160&fit=crop&crop=faces&auto=format&q=70`;
}

/** 4 ảnh đại diện chồng nhau trên ảnh bìa nhóm thứ `order` */
export const avatarsOf = (order: number) =>
  [0, 1, 2, 3].map((j) => portrait(PEOPLE[(order * 5 + j * 3) % PEOPLE.length] ?? 'm1'));

const TONE_ORDER: ToneName[] = ['blue', 'rose', 'green', 'amber', 'violet'];

export const toneOf = (order: number) => tones[TONE_ORDER[order % TONE_ORDER.length] ?? 'blue'];
