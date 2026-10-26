/**
 * V4-609 (REQ-511): 11 nhu cầu mẫu của prototype v4 (`NSEED`, index.html 4991). Ngành đã chuẩn hoá qua
 * `FMAP` sang danh mục v4; tỉnh / phường lấy theo gian hàng. `dueDays` = 0 → "Không thời hạn";
 * `ageDays` = số ngày trước "hôm nay" lúc seed. SĐT / email liên hệ lấy từ gian hàng (prototype).
 */
export interface NeedSeed {
  id: string;
  store: string;
  type: 'buy' | 'sell' | 'partner' | 'service';
  title: string;
  description: string;
  field: string;
  quantity: string;
  dueDays: number;
  ageDays: number;
}

export const NEED_SEED: NeedSeed[] = [
  {
    id: 'n1',
    store: 'st6',
    type: 'buy',
    title: 'Cần 50 kg cà phê Robusta rang mộc mỗi tháng',
    description:
      'Ưu tiên xưởng rang có truy xuất nguồn gốc, giao hằng tháng tại quán, thanh toán chuyển khoản.',
    field: 'Chế biến thực phẩm',
    quantity: '50 kg / tháng',
    dueDays: 30,
    ageDays: 1,
  },
  {
    id: 'n2',
    store: 'st2',
    type: 'sell',
    title: 'Tìm đầu ra cho 20 tấn cà phê nhân vụ 2026',
    description:
      'Cà phê nhân Robusta sàng 18, có QR truy xuất. Cần xưởng rang, đơn vị thu mua dài hạn.',
    field: 'Chế biến thực phẩm',
    quantity: '20 tấn / vụ',
    dueDays: 60,
    ageDays: 2,
  },
  {
    id: 'n3',
    store: 'st3',
    type: 'buy',
    title: 'Cần 5.000 túi zip van một chiều in logo',
    description: 'Túi 500 g và 1 kg, in 2 màu, giao trong 15 ngày.',
    field: 'Sản xuất & Cơ khí',
    quantity: '5.000 túi',
    dueDays: 15,
    ageDays: 1,
  },
  {
    id: 'n4',
    store: 'st3',
    type: 'service',
    title: 'Vận chuyển 2 chuyến/tuần Buôn Ma Thuột → TP.HCM',
    description: 'Hàng cà phê đóng thùng 300–500 kg/chuyến, cần giao tận quán tại TP.HCM.',
    field: 'Logistics & Chuỗi cung ứng',
    quantity: '2 chuyến / tuần',
    dueDays: 0,
    ageDays: 3,
  },
  {
    id: 'n5',
    store: 'st8',
    type: 'partner',
    title: 'Tìm vườn rau, nông trại liên kết tour trải nghiệm',
    description: 'Đón 2–3 đoàn khách/tuần tham quan, hái rau, chia doanh thu theo lượt khách.',
    field: 'Nông nghiệp & Nông sản',
    quantity: '2–3 đoàn / tuần',
    dueDays: 0,
    ageDays: 2,
  },
  {
    id: 'n6',
    store: 'st9',
    type: 'sell',
    title: 'Đầu ra 300 kg rau VietGAP mỗi ngày',
    description: 'Tìm nhà hàng, quán ăn, bếp ăn tập thể nhận rau ổn định, giao theo ngày.',
    field: 'Du lịch & Dịch vụ',
    quantity: '300 kg / ngày',
    dueDays: 45,
    ageDays: 1,
  },
  {
    id: 'n7',
    store: 'st10',
    type: 'buy',
    title: 'Tinh dầu sả, bưởi nguyên chất 100 lít mỗi quý',
    description: 'Cần hộ sản xuất, HTX có giấy kiểm nghiệm, giao tại TP.HCM.',
    field: 'Nông nghiệp & Nông sản',
    quantity: '100 lít / quý',
    dueDays: 40,
    ageDays: 4,
  },
  {
    id: 'n8',
    store: 'st7',
    type: 'partner',
    title: 'Đối tác bán gốm qua livestream và sàn TMĐT',
    description: 'Chia hoa hồng theo đơn, hỗ trợ hàng mẫu và đóng gói.',
    field: 'Thương mại & Bán lẻ',
    quantity: 'Hoa hồng 15–20%',
    dueDays: 0,
    ageDays: 3,
  },
  {
    id: 'n9',
    store: 'st12',
    type: 'buy',
    title: 'Gỗ keo có chứng chỉ FSC 30 m³ mỗi tháng',
    description: 'Gỗ xẻ sấy, độ ẩm ≤ 12%, giao tại xưởng.',
    field: 'Nông nghiệp & Nông sản',
    quantity: '30 m³ / tháng',
    dueDays: 30,
    ageDays: 6,
  },
  {
    id: 'n10',
    store: 'st13',
    type: 'service',
    title: 'Thuê kho lạnh 50 m² tại TP.HCM',
    description: 'Bảo quản hải sản khô, cần kho gần trung tâm, có giao hàng nội thành.',
    field: 'Logistics & Chuỗi cung ứng',
    quantity: '50 m²',
    dueDays: 20,
    ageDays: 2,
  },
  {
    id: 'n11',
    store: 'st1',
    type: 'partner',
    title: 'Đối tác tư vấn kế toán, thuế cho học viên OPC tại TP.HCM',
    description:
      'Đồng hành cùng chương trình đào tạo OPC, hỗ trợ học viên chuyển hộ kinh doanh lên doanh nghiệp.',
    field: 'Dịch vụ doanh nghiệp',
    quantity: '10 phường, xã',
    dueDays: 60,
    ageDays: 1,
  },
];

/** Prototype cùng `T` cho nhu cầu cùng ngày, sort ổn định theo thứ tự seed → lùi `i` phút */
export const needSeedUpdatedAt = (now: number, ageDays: number, index: number): number =>
  now - ageDays * 86_400_000 - index * 60_000;

/** Hạn = 00:00 giờ VN của ngày `now + dueDays` (prototype `T + dueD * D` hiển thị theo ngày) */
export const needSeedDueAt = (now: number, dueDays: number): number | null => {
  if (!dueDays) return null;
  const vn = new Date(now + dueDays * 86_400_000 + 7 * 3_600_000);
  return Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()) - 7 * 3_600_000;
};
