import {
  EMPTY_SOCIALS,
  type StoreCert,
  type StoreDoc,
  type StoreSocials,
  type StoreTeamMember,
  type StoreVideo,
} from '../api-domains/store-builder';

/**
 * TIP-V42-710 (D-97): media mở rộng của gian hàng mẫu. Chỉ `st1` (MediaSoft, TK demo M1) có dữ liệu như
 * prototype `EX.st1` (index.html :5349 → 5352) + `ward` của SEED (:5211); các gian hàng khác rỗng —
 * chi tiết chỉ hiện khối có dữ liệu thật (bỏ `FS` / reels dựng từ ảnh / số liệu `facts`).
 * Ảnh là URL công khai như ảnh bìa mẫu; chứng nhận / tài liệu của prototype không có tệp → không seed.
 */
export interface StoreSeedMedia {
  ward: string;
  vision: string;
  mission: string;
  gallery: string[];
  videos: StoreVideo[];
  team: StoreTeamMember[];
  certs: StoreCert[];
  docs: StoreDoc[];
  phones: string[];
  emails: string[];
  addresses: string[];
  socials: StoreSocials;
}

const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?w=600&h=600&fit=crop&auto=format`;
const portrait = (p: string) => `https://randomuser.me/api/portraits/${p}.jpg`;

export const EMPTY_STORE_MEDIA: StoreSeedMedia = {
  ward: '',
  vision: '',
  mission: '',
  gallery: [],
  videos: [],
  team: [],
  certs: [],
  docs: [],
  phones: [],
  emails: [],
  addresses: [],
  socials: EMPTY_SOCIALS,
};

const ST1: StoreSeedMedia = {
  ...EMPTY_STORE_MEDIA,
  ward: 'P. Từ Liêm',
  vision:
    'Trở thành tập đoàn công nghệ AI và nền tảng số hàng đầu Việt Nam, kết nối Việt Nam với ASEAN và thế giới.',
  mission:
    'Giúp mọi doanh nghiệp, đặc biệt là doanh nghiệp một người, tiếp cận và ứng dụng AI dễ dàng, hiệu quả và bền vững.',
  team: [
    ['Mai Đình Ngọc', 'CEO / CSO', 'Chiến lược & phát triển hệ sinh thái', 'men/32'],
    ['Nguyễn Hữu Tuấn', 'Giám đốc Phát triển', 'Thương mại điện tử & hợp tác công', 'men/45'],
    ['Trần Khánh Dương', 'Giám đốc Điều hành', 'Đà Nẵng & Miền Trung', 'men/52'],
    ['Lê Thu Hà', 'Giám đốc Sản phẩm', 'AI & trải nghiệm khách hàng', 'women/44'],
  ].map(([name = '', role = '', desc = '', p = '']) => ({
    name,
    role,
    desc,
    photoUrl: portrait(p),
  })),
  gallery: [
    'photo-1497366216548-37526070297c',
    'photo-1522071820081-009f0129c71c',
    'photo-1556761175-5973dc0f32e7',
    'photo-1460925895917-afdab827c52f',
  ].map(unsplash),
};

export const storeSeedMedia = (id: string): StoreSeedMedia =>
  id === 'st1' ? ST1 : EMPTY_STORE_MEDIA;
