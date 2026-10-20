import type { TaxInfo, TaxLookupProvider } from './types';

/**
 * Dev/test: mọi MST hợp lệ trả về cùng doanh nghiệp mẫu như prototype (mock-data `mockBizLookup`),
 * MST kết thúc `000` → không tìm thấy (để thử nhánh nhập tay / D-40 pending); kết thúc `999` →
 * nguồn lỗi (NA-06: thử nhánh "tra cứu lỗi → nhập tay").
 */
export class FakeTaxProvider implements TaxLookupProvider {
  readonly name = 'fake';

  lookup(taxCode: string): Promise<TaxInfo | null> {
    if (taxCode.endsWith('000')) return Promise.resolve(null);
    if (taxCode.endsWith('999'))
      return Promise.reject(new Error('Nguồn tra cứu MST không phản hồi'));
    return Promise.resolve({
      taxCode,
      name: 'Công ty TNHH Giải pháp MediaSoft',
      address: 'Tầng 5, 18 Tam Trinh, Hai Bà Trưng, Hà Nội',
      representative: 'Nguyễn Văn An',
      industries: [
        '6201 – Lập trình máy vi tính',
        '6202 – Tư vấn máy vi tính và quản trị hệ thống',
        '6311 – Xử lý dữ liệu, cho thuê và các hoạt động liên quan',
        '4741 – Bán lẻ máy vi tính, phần mềm',
        '7310 – Quảng cáo',
      ],
      status: 'Đang hoạt động',
    });
  }
}
