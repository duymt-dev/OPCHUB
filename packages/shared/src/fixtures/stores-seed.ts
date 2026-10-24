/**
 * V4-608 (REQ-510): 17 gian hàng mẫu của prototype v4 (`storePage` SEED, index.html 4867–4883),
 * lĩnh vực đã chuẩn hoá qua `FMAP` sang danh mục v4; `audience` theo `AUD()` (§25.1). `ageDays` =
 * số ngày trước "hôm nay" lúc seed. Ảnh là id Unsplash như prototype (`storeImageUrl`).
 */

/** Danh mục lĩnh vực v4 scope `project` (prototype `CAT_SEED`, bỏ "Khác") */
export const STORE_FIELDS = [
  'Nông nghiệp & Nông sản',
  'Chế biến thực phẩm',
  'Thủ công & Làng nghề',
  'Du lịch & Dịch vụ',
  'Thương mại & Bán lẻ',
  'Sản xuất & Cơ khí',
  'Thủy sản',
  'Logistics & Chuỗi cung ứng',
  'Giáo dục & Đào tạo',
  'Y tế & Sức khỏe',
  'Môi trường & Năng lượng',
  'Chuyển đổi số & AI',
  'Dịch vụ doanh nghiệp',
  'Mỹ phẩm & Làm đẹp',
] as const;

/** Icon SVG path của ô danh mục (prototype `ICP`, khớp theo tiền tố tên) */
export const STORE_FIELD_ICONS: Record<string, string> = {
  'Tất cả': 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  'Sản xuất': 'M2 20h20M4 20V10l5 3V10l5 3V10l5 3v7M18 6V3',
  'Chuyển đổi số':
    'M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2M6 5h12v14H6zM10 10h4v4h-4z',
  'Dịch vụ doanh': 'M3 7h18v13H3zM8 7V4h8v3M3 12h18',
  'Môi trường': 'M5 21c0-9 5-15 15-16-1 10-7 15-15 16zM5 21l7-7',
  Nông: 'M12 21V10M12 10c0-4 3-7 8-7 0 5-3 8-8 7zM12 14c0-3-2-6-7-6 0 4 2 7 7 6',
  'Chế biến': 'M6 3v6a3 3 0 006 0V3M9 12v9M17 3c-2 0-3 3-3 6s1 4 3 4v8',
  'Thủ công': 'M4 20h16M6 20V9l6-5 6 5v11M10 20v-5h4v5',
  'Du lịch': 'M3 20h18M5 20l7-15 7 15M9 14h6',
  'Thương mại':
    'M3 6h18l-2 9H5zM5 6L4 3H2M8 20a1 1 0 100-2 1 1 0 000 2zM17 20a1 1 0 100-2 1 1 0 000 2z',
  'Công nghệ': 'M3 5h18v11H3zM8 20h8M12 16v4',
  Logistics:
    'M1 6h13v10H1zM14 10h4l4 4v2h-8zM5 19a2 2 0 100-4 2 2 0 000 4zM18 19a2 2 0 100-4 2 2 0 000 4z',
  'Giáo dục': 'M2 9l10-5 10 5-10 5zM6 11v5c3 3 9 3 12 0v-5',
  'Y tế': 'M12 21s-8-5-8-11a5 5 0 018-3 5 5 0 018 3c0 6-8 11-8 11zM12 8v6M9 11h6',
  'Thủy sản': 'M2 12c4-6 12-6 16 0-4 6-12 6-16 0zM18 12l4-3v6zM8 11h.01',
  'Xây dựng': 'M2 20h20M4 20V10h6v10M14 20V4h6v16M7 13h0M17 8h0',
  'Mỹ phẩm': 'M9 3h6v4H9zM8 7h8v14H8z',
  'Tài chính': 'M12 2v20M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
  'Truyền thông': 'M3 11l15-6v14L3 13zM7 13v5',
  'Năng lượng': 'M13 2L4 14h7l-1 8 9-12h-7z',
  'Dệt may': 'M8 3l-5 4 3 4 2-1v11h8V10l2 1 3-4-5-4c-1 2-5 2-8 0z',
};

export const storeFieldIcon = (label: string): string =>
  STORE_FIELD_ICONS[
    Object.keys(STORE_FIELD_ICONS).find((k) => label.startsWith(k) || label.includes(k)) ?? ''
  ] ?? 'M3 7h18v13H3zM8 7V4h8v3';

/**
 * Mốc cập nhật của gian hàng mẫu: prototype dùng cùng một `T` cho mọi gian hàng cùng ngày rồi sort
 * ổn định (giữ thứ tự seed) → lùi thêm `i` phút theo thứ tự seed để "Mới nhất" khớp prototype.
 */
export const storeSeedUpdatedAt = (now: number, ageDays: number, index: number): number =>
  now - ageDays * 86_400_000 - index * 60_000;

export const storeImageUrl = (id: string, w = 900, h = 520): string =>
  `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&auto=format`;

export interface StoreSeedItem {
  kind: 'product' | 'service';
  name: string;
  price: number | null;
  description: string;
  image: string;
}
export interface StoreSeed {
  id: string;
  /** `m1` = TK demo; `x2…x17` = chủ gian hàng mẫu (TK DN demo tạo khi seed) */
  owner: string;
  name: string;
  slogan: string;
  field: string;
  province: string;
  /** Loại hình prototype (Doanh nghiệp / Hợp tác xã / Hộ kinh doanh / OPC / Cá nhân) */
  kind: string;
  audience: 'student' | 'personal' | 'organization' | 'business';
  cover: string;
  intro: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  ageDays: number;
  items: StoreSeedItem[];
}

export const STORE_SEED: StoreSeed[] = [
  {
    id: 'st1',
    owner: 'm1',
    name: 'Công ty TNHH Giải pháp MediaSoft',
    slogan: 'Chuyển đổi số cho doanh nghiệp một người',
    field: 'Chuyển đổi số & AI',
    province: 'Hà Nội',
    kind: 'Doanh nghiệp',
    audience: 'business',
    cover: 'photo-1497366216548-37526070297c',
    intro:
      'MediaSoft phát triển nền tảng CRM, website và công cụ tự động hóa giúp OPC vận hành gọn nhẹ, tiết kiệm chi phí và tăng trưởng bền vững.',
    website: 'mediasoft.vn',
    phone: '+84 912 345 678',
    email: 'an.nguyen@mediasoft.vn',
    address: 'Tòa nhà Sông Đà, Mỹ Đình, Nam Từ Liêm, Hà Nội',
    ageDays: 2,
    items: [
      {
        kind: 'service',
        name: 'Thiết kế website doanh nghiệp',
        price: 8900000,
        description: 'Website chuẩn SEO, giao diện riêng, bàn giao trong 14 ngày.',
        image: 'photo-1460925895917-afdab827c52f',
      },
      {
        kind: 'product',
        name: 'Phần mềm CRM OPC',
        price: 250000,
        description: 'Quản lý khách hàng, báo giá, hợp đồng. Giá theo tháng.',
        image: 'photo-1551288049-bebda4e38f71',
      },
      {
        kind: 'service',
        name: 'Tư vấn tự động hóa bằng AI',
        price: null,
        description: 'Đánh giá quy trình và đề xuất giải pháp AI phù hợp.',
        image: 'photo-1522071820081-009f0129c71c',
      },
    ],
  },
  {
    id: 'st2',
    owner: 'x2',
    name: 'HTX Cà phê Hòa Phú',
    slogan: 'Cà phê nhân Robusta vùng trồng đạt chuẩn',
    field: 'Nông nghiệp & Nông sản',
    province: 'Đắk Lắk',
    kind: 'Hợp tác xã',
    audience: 'organization',
    cover: 'photo-1447933601403-0c6688de566e',
    intro:
      'Hợp tác xã 86 hộ thành viên, 210 ha cà phê Robusta canh tác bền vững, có nhật ký vùng trồng và mã QR truy xuất.',
    website: '',
    phone: '+84 905 222 111',
    email: 'htxhoaphu@gmail.com',
    address: 'Xã Hòa Phú, Đắk Lắk',
    ageDays: 5,
    items: [
      {
        kind: 'product',
        name: 'Cà phê nhân Robusta loại 1',
        price: null,
        description: 'Sàng 18, độ ẩm ≤ 12,5%. Báo giá theo vụ.',
        image: 'photo-1572402123736-c79526db405a',
      },
    ],
  },
  {
    id: 'st3',
    owner: 'x3',
    name: 'Rang xay Hạnh Phúc',
    slogan: 'Cà phê rang mộc cho quán & văn phòng',
    field: 'Chế biến thực phẩm',
    province: 'Đắk Lắk',
    kind: 'OPC',
    audience: 'business',
    cover: 'photo-1511537190424-bbbab87ac5eb',
    intro:
      'Xưởng rang xay một chủ, công suất 2 tấn/tháng, nhận rang gia công và cung cấp cà phê rang mộc cho quán, văn phòng toàn quốc.',
    website: '',
    phone: '+84 935 118 226',
    email: 'hanhphuc.coffee@gmail.com',
    address: 'P. Buôn Ma Thuột, Đắk Lắk',
    ageDays: 2,
    items: [
      {
        kind: 'product',
        name: 'Cà phê Robusta rang mộc 1 kg',
        price: 230000,
        description: 'Rang medium, đóng túi van một chiều.',
        image: 'photo-1447933601403-0c6688de566e',
      },
      {
        kind: 'service',
        name: 'Rang gia công theo yêu cầu',
        price: null,
        description: 'Nhận từ 20 kg/mẻ.',
        image: 'photo-1495474472287-4d71bcdd2085',
      },
    ],
  },
  {
    id: 'st4',
    owner: 'x4',
    name: 'Bao bì Tây Nguyên',
    slogan: 'Túi zip, hộp giấy in logo số lượng nhỏ',
    field: 'Sản xuất & Cơ khí',
    province: 'Đắk Lắk',
    kind: 'Doanh nghiệp',
    audience: 'business',
    cover: 'photo-1586528116311-ad8dd3c8310d',
    intro: 'In bao bì cho nông sản, cà phê, đặc sản OCOP; nhận đơn từ 500 túi, thiết kế miễn phí.',
    website: '',
    phone: '+84 262 385 4455',
    email: 'sales@baobitaynguyen.vn',
    address: 'P. Tân An, Đắk Lắk',
    ageDays: 6,
    items: [
      {
        kind: 'product',
        name: 'Túi zip van một chiều in logo',
        price: 1800,
        description: 'Giá mỗi túi, đơn 1.000 túi.',
        image: 'photo-1567789884554-0b844b597180',
      },
    ],
  },
  {
    id: 'st5',
    owner: 'x5',
    name: 'Vận tải Minh Phát',
    slogan: 'Xe tải 2–5 tấn tuyến Tây Nguyên – TP.HCM',
    field: 'Logistics & Chuỗi cung ứng',
    province: 'Đắk Lắk',
    kind: 'Hộ kinh doanh',
    audience: 'business',
    cover: 'photo-1601584115197-04ecc0da31d7',
    intro:
      'Hộ kinh doanh vận tải 6 xe, chạy cố định Buôn Ma Thuột – TP.HCM hằng ngày, nhận hàng ghép cho hộ sản xuất.',
    website: '',
    phone: '+84 913 456 120',
    email: 'minhphat.vt@gmail.com',
    address: 'P. Buôn Ma Thuột, Đắk Lắk',
    ageDays: 3,
    items: [
      {
        kind: 'service',
        name: 'Ghép hàng Buôn Ma Thuột – TP.HCM',
        price: null,
        description: 'Báo giá theo kg, theo chuyến.',
        image: 'photo-1494412574643-ff11b0a5c1c3',
      },
    ],
  },
  {
    id: 'st6',
    owner: 'x6',
    name: 'Mộc Coffee',
    slogan: 'Quán cà phê specialty tại trung tâm',
    field: 'Du lịch & Dịch vụ',
    province: 'TP. Hồ Chí Minh',
    kind: 'Hộ kinh doanh',
    audience: 'business',
    cover: 'photo-1517248135467-4c7edcad34c4',
    intro:
      'Chuỗi 2 quán cà phê, dùng 100% cà phê Việt, ưu tiên nguồn hàng trực tiếp từ hộ trồng và xưởng rang địa phương.',
    website: '',
    phone: '+84 908 221 345',
    email: 'mockcoffee.sg@gmail.com',
    address: 'P. Sài Gòn, TP. Hồ Chí Minh',
    ageDays: 1,
    items: [
      {
        kind: 'service',
        name: 'Nhận bán ký gửi đặc sản địa phương',
        price: null,
        description: 'Kệ trưng bày tại quán.',
        image: 'photo-1590846406792-0adc7f938f1d',
      },
    ],
  },
  {
    id: 'st7',
    owner: 'x7',
    name: 'Gốm Ngọc Hà Bát Tràng',
    slogan: 'Gốm men lam thủ công, quà tặng doanh nghiệp',
    field: 'Thủ công & Làng nghề',
    province: 'Hà Nội',
    kind: 'Hộ kinh doanh',
    audience: 'business',
    cover: 'photo-1565193566173-7a0ee3dbe261',
    intro: 'Gia đình ba thế hệ làm gốm, nhận đặt quà tặng in logo, bộ ấm chén và đồ trang trí.',
    website: '',
    phone: '+84 983 555 246',
    email: 'gomngocha@gmail.com',
    address: 'Xã Bát Tràng, Hà Nội',
    ageDays: 4,
    items: [
      {
        kind: 'product',
        name: 'Bộ ấm chén men lam',
        price: 650000,
        description: 'Bộ 6 chén.',
        image: 'photo-1564890369478-c89ca6d9cde9',
      },
    ],
  },
  {
    id: 'st8',
    owner: 'x8',
    name: 'Homestay Đồi Thông',
    slogan: 'Lưu trú & tour trải nghiệm nông trại Đà Lạt',
    field: 'Du lịch & Dịch vụ',
    province: 'Lâm Đồng',
    kind: 'Cá nhân',
    audience: 'student',
    cover: 'photo-1520250497591-112f2f40a3f4',
    intro: '8 phòng giữa đồi thông, tổ chức tour hái rau, cà phê và workshop cho nhóm nhỏ.',
    website: '',
    phone: '+84 914 333 222',
    email: 'doithong.homestay@gmail.com',
    address: 'P. Xuân Hương – Đà Lạt, Lâm Đồng',
    ageDays: 2,
    items: [
      {
        kind: 'service',
        name: 'Phòng đôi view đồi',
        price: 750000,
        description: 'Giá một đêm, gồm ăn sáng.',
        image: 'photo-1566073771259-6a8506099945',
      },
    ],
  },
  {
    id: 'st9',
    owner: 'x9',
    name: 'HTX Rau sạch Langbiang',
    slogan: 'Rau ôn đới VietGAP giao hằng ngày',
    field: 'Nông nghiệp & Nông sản',
    province: 'Lâm Đồng',
    kind: 'Hợp tác xã',
    audience: 'organization',
    cover: 'photo-1464226184884-fa280b87c399',
    intro:
      '35 hộ thành viên, 40 ha nhà kính, cung cấp rau VietGAP cho siêu thị, nhà hàng và bếp ăn.',
    website: '',
    phone: '+84 263 383 9911',
    email: 'htxlangbiang@gmail.com',
    address: 'Xã Lạc Dương, Lâm Đồng',
    ageDays: 1,
    items: [
      {
        kind: 'product',
        name: 'Rau xà lách, cải bó xôi VietGAP',
        price: null,
        description: 'Báo giá theo tuần.',
        image: 'photo-1572402123736-c79526db405a',
      },
    ],
  },
  {
    id: 'st10',
    owner: 'x10',
    name: 'Lá Cosmetics',
    slogan: 'Mỹ phẩm thiên nhiên từ thảo mộc Việt',
    field: 'Mỹ phẩm & Làm đẹp',
    province: 'TP. Hồ Chí Minh',
    kind: 'OPC',
    audience: 'business',
    cover: 'photo-1556228578-8c89e6adf883',
    intro:
      'Doanh nghiệp một người phát triển dầu gội, xà bông thảo mộc, bán qua TikTok Shop và đại lý.',
    website: '',
    phone: '+84 909 778 001',
    email: 'hello@lacosmetics.vn',
    address: 'P. Thủ Đức, TP. Hồ Chí Minh',
    ageDays: 3,
    items: [
      {
        kind: 'product',
        name: 'Dầu gội bưởi 300 ml',
        price: 185000,
        description: 'Thành phần thiên nhiên.',
        image: 'photo-1595855759920-86582396756a',
      },
    ],
  },
  {
    id: 'st11',
    owner: 'x11',
    name: 'Kế toán OPC Thu Hà',
    slogan: 'Kế toán, thuế trọn gói cho hộ kinh doanh & OPC',
    field: 'Dịch vụ doanh nghiệp',
    province: 'TP. Hồ Chí Minh',
    kind: 'Cá nhân',
    audience: 'personal',
    cover: 'photo-1554224155-6726b3ff858f',
    intro:
      'Kế toán viên 10 năm kinh nghiệm, nhận khai thuế, hóa đơn điện tử, sổ sách cho hộ kinh doanh chuyển lên doanh nghiệp.',
    website: '',
    phone: '+84 936 111 000',
    email: 'thuha.ketoan@gmail.com',
    address: 'P. Bình Thạnh, TP. Hồ Chí Minh',
    ageDays: 5,
    items: [
      {
        kind: 'service',
        name: 'Kế toán thuế trọn gói',
        price: 800000,
        description: 'Theo tháng.',
        image: 'photo-1556761175-5973dc0f32e7',
      },
    ],
  },
  {
    id: 'st12',
    owner: 'x12',
    name: 'Nội thất gỗ An Phú',
    slogan: 'Bàn ghế gỗ keo xuất khẩu',
    field: 'Sản xuất đồ gỗ',
    province: 'Đồng Nai',
    kind: 'Doanh nghiệp',
    audience: 'business',
    cover: 'photo-1518455027359-f3f8164ba6bd',
    intro: 'Xưởng 60 công nhân sản xuất bàn ghế ngoài trời từ gỗ keo, nhận gia công OEM.',
    website: '',
    phone: '+84 251 382 6677',
    email: 'sales@noithatanphu.vn',
    address: 'P. Trấn Biên, Đồng Nai',
    ageDays: 7,
    items: [
      {
        kind: 'product',
        name: 'Bộ bàn ghế sân vườn',
        price: 3200000,
        description: 'Gỗ keo, 4 ghế.',
        image: 'photo-1518455027359-f3f8164ba6bd',
      },
    ],
  },
  {
    id: 'st13',
    owner: 'x13',
    name: 'Thủy sản Sông Đốc',
    slogan: 'Tôm, mực khô đặc sản Cà Mau',
    field: 'Thủy sản',
    province: 'Cà Mau',
    kind: 'Doanh nghiệp',
    audience: 'business',
    cover: 'photo-1559737558-2f5a35f4523b',
    intro: 'Thu mua và chế biến tôm khô, mực khô từ ngư dân Sông Đốc, đạt OCOP 4 sao.',
    website: '',
    phone: '+84 290 385 1122',
    email: 'thuysansongdoc@gmail.com',
    address: 'Xã Sông Đốc, Cà Mau',
    ageDays: 4,
    items: [
      {
        kind: 'product',
        name: 'Tôm khô loại 1 (500 g)',
        price: 450000,
        description: 'OCOP 4 sao.',
        image: 'photo-1534604973900-c43ab4c2e0ab',
      },
    ],
  },
  {
    id: 'st14',
    owner: 'x14',
    name: 'Livestream Miền Tây',
    slogan: 'Bán hàng qua livestream cho nông sản & đặc sản',
    field: 'Thương mại & Bán lẻ',
    province: 'Cần Thơ',
    kind: 'OPC',
    audience: 'business',
    cover: 'photo-1556742049-0cfed4f6a45d',
    intro:
      'Nhận livestream bán hàng trên TikTok, Facebook, Shopee cho hộ sản xuất; chia hoa hồng theo đơn.',
    website: '',
    phone: '+84 939 456 789',
    email: 'livestreammientay@gmail.com',
    address: 'P. Ninh Kiều, Cần Thơ',
    ageDays: 2,
    items: [
      {
        kind: 'service',
        name: 'Livestream bán hàng theo phiên',
        price: null,
        description: 'Hoa hồng theo đơn.',
        image: 'photo-1556742049-0cfed4f6a45d',
      },
    ],
  },
  {
    id: 'st15',
    owner: 'x15',
    name: 'Kho lạnh Sài Gòn Logistics',
    slogan: 'Kho lạnh & giao hàng nội thành',
    field: 'Logistics & Chuỗi cung ứng',
    province: 'TP. Hồ Chí Minh',
    kind: 'Doanh nghiệp',
    audience: 'business',
    cover: 'photo-1601584115197-04ecc0da31d7',
    intro: 'Kho lạnh 2.000 m², cho thuê theo m² và theo pallet, kèm giao hàng nội thành.',
    website: '',
    phone: '+84 28 3872 9900',
    email: 'sales@khosaigon.vn',
    address: 'P. Tân Thuận, TP. Hồ Chí Minh',
    ageDays: 6,
    items: [
      {
        kind: 'service',
        name: 'Thuê kho lạnh theo pallet',
        price: null,
        description: 'Báo giá theo tháng.',
        image: 'photo-1494412574643-ff11b0a5c1c3',
      },
    ],
  },
  {
    id: 'st16',
    owner: 'x16',
    name: 'CNC Việt Nam',
    slogan: 'Cung cấp máy CNC và giải pháp gia công cơ khí chính xác.',
    field: 'Sản xuất & Cơ khí',
    province: 'Hà Nội',
    kind: 'Doanh nghiệp',
    audience: 'business',
    cover: 'photo-1581091226825-a6a2a5aee158',
    intro:
      'CNC Việt Nam là đơn vị chuyên cung cấp máy CNC, thiết bị cơ khí và giải pháp gia công chính xác cho doanh nghiệp sản xuất tại Việt Nam. Chúng tôi cung cấp máy CNC mới và đã qua sử dụng, linh kiện, dịch vụ kỹ thuật, đào tạo vận hành và bảo trì, giúp khách hàng tối ưu năng suất và chất lượng sản phẩm.',
    website: 'https://www.cncvietnam.vn',
    phone: '0901 234 567',
    email: 'sales@cncvietnam.vn',
    address: 'Khu công nghiệp Thăng Long, Đông Anh, Hà Nội',
    ageDays: 1,
    items: [
      {
        kind: 'product',
        name: 'Máy CNC trung tâm',
        price: null,
        description: 'Máy CNC 3–5 trục cho gia công chính xác',
        image: 'photo-1581091226825-a6a2a5aee158',
      },
      {
        kind: 'product',
        name: 'Máy CNC tiện',
        price: null,
        description: 'Giải pháp tiện CNC hiệu suất cao',
        image: 'photo-1567789884554-0b844b597180',
      },
      {
        kind: 'service',
        name: 'Tự động hóa sản xuất',
        price: null,
        description: 'Robot và hệ thống tự động hóa',
        image: 'photo-1537462715879-360eeb61a0ad',
      },
      {
        kind: 'product',
        name: 'Linh kiện & Phụ tùng',
        price: null,
        description: 'Dao cụ, đồ gá, phụ tùng chính hãng',
        image: 'photo-1563770660941-20978e870e26',
      },
    ],
  },
  {
    id: 'st17',
    owner: 'x17',
    name: 'Cơ khí Nông nghiệp Ea Kar',
    slogan: 'Máy sấy, máy xát cà phê và nông sản cho HTX, hộ sản xuất.',
    field: 'Sản xuất & Cơ khí',
    province: 'Đắk Lắk',
    kind: 'Doanh nghiệp',
    audience: 'business',
    cover: 'photo-1504917595217-d4dc5ebe6122',
    intro:
      'Xưởng cơ khí chế tạo máy sấy, máy xát, máy phân loại cà phê và nông sản; lắp đặt, bảo trì tận nơi cho hợp tác xã và hộ sản xuất Tây Nguyên.',
    website: '',
    phone: '0262 3621 888',
    email: 'cokhieakar@gmail.com',
    address: 'Xã Ea Kar, Đắk Lắk',
    ageDays: 3,
    items: [
      {
        kind: 'product',
        name: 'Máy sấy cà phê 5 tấn/mẻ',
        price: null,
        description: 'Sấy tĩnh, đốt củi trấu',
        image: 'photo-1513828583688-c52646db42da',
      },
      {
        kind: 'service',
        name: 'Bảo trì máy nông nghiệp',
        price: null,
        description: 'Bảo trì định kỳ tận nơi',
        image: 'photo-1621905251189-08b45d6a269e',
      },
    ],
  },
];
