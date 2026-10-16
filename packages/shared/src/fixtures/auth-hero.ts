/** Nội dung cột trái màn Auth của prototype (ảnh, trích dẫn, cờ). Ảnh ngoài sẽ thay bằng CDN riêng. */

const unsplash = (id: string, w: number, h: number, extra = '') =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop${extra}&auto=format`;

const face = (id: string) => unsplash(id, 160, 160, '&crop=faces') + '&q=70';

export const authHeroImages = {
  main: unsplash('1522071820081-009f0129c71c', 900, 640),
  side: unsplash('1515187029135-18ee286d815b', 600, 400),
  avatars: [
    face('1676697260508-28e246392013'),
    face('1731960745314-e12045ee74a5'),
    face('1727709699241-efabfa10aaa5'),
    face('1478427094460-4c8d412903e2'),
  ],
};

export interface AuthQuoteSeed {
  text: string;
  name: string;
  role: string;
  img: string;
}

export const authQuotes: [AuthQuoteSeed, AuthQuoteSeed, AuthQuoteSeed] = [
  {
    text: 'Nhờ OPC Hub, mình tìm được kế toán, cộng tác viên và cả khách hàng đầu tiên chỉ trong tháng đầu tham gia.',
    name: 'Lê Minh Anh',
    role: 'Founder LeadPilot · Việt Nam',
    img: face('1676697260508-28e246392013'),
  },
  {
    text: 'Các phòng chat theo chủ đề giúp tôi học hỏi trực tiếp từ founder ở Singapore và Malaysia mỗi ngày.',
    name: 'Somchai P.',
    role: 'Founder Siam AI Labs · Thái Lan',
    img: face('1731960745314-e12045ee74a5'),
  },
  {
    text: 'Meetup hằng tháng là nơi tôi gặp đối tác phân phối cho sản phẩm SaaS của mình.',
    name: 'Rina Sari',
    role: 'Founder Nusantara Tech · Indonesia',
    img: face('1727709699241-efabfa10aaa5'),
  },
];

/** Trích dẫn đổi mỗi 7 giây, giống prototype */
export const QUOTE_ROTATE_MS = 7000;
export const quoteAt = (now: number) =>
  authQuotes[Math.floor(now / QUOTE_ROTATE_MS) % authQuotes.length] ?? authQuotes[0];

export const aseanFlags = ['vn', 'th', 'id', 'my', 'ph', 'sg', 'mm', 'kh', 'la', 'bn'].map(
  (code) => ({ code: code.toUpperCase(), src: `https://flagcdn.com/w40/${code}.png` }),
);

export const authStats = { members: '4.218', communities: '36', eventsPerYear: '120+' };

/** Số người trực tuyến mặc định khi chưa có socket */
export const DEFAULT_ONLINE = 312;
