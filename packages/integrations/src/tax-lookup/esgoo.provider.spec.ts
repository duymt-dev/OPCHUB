import { describe, expect, it } from 'vitest';
import { IntegrationError } from '../errors';
import { EsgooTaxProvider } from './esgoo.provider';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const provider = (body: unknown, status = 200) =>
  new EsgooTaxProvider({ fetchImpl: () => Promise.resolve(json(body, status)) });

/** Response thật esgoo.net/api-mst/0100100079.htm (21/10/2026), dữ liệu doanh nghiệp công khai */
const REAL = {
  error: 0,
  error_text: 'Lấy dữ liệu doanh nghiệp từ mã số thuế thành thành công..!',
  data: {
    ten: 'TẬP ĐOÀN ĐIỆN LỰC VIỆT NAM',
    mst: '0100100079',
    dt: '0246694 6789',
    dc: 'Số 11 phố Cửa Bắc, Phường Trúc Bạch, Quận Ba Đình, Thành phố Hà Nội, Việt Nam',
    daidien: 'NGUYỄN ANH TUẤN',
    hoatdong: '1970-01-01',
    tinhtrang: 'Đang hoạt động (đã được cấp GCN ĐKT)',
  },
};

describe('EsgooTaxProvider (D-17)', () => {
  it('D-17 response thật → đủ tên, địa chỉ, người đại diện, tình trạng', async () => {
    expect(await provider(REAL).lookup('0100100079')).toEqual({
      taxCode: '0100100079',
      name: 'TẬP ĐOÀN ĐIỆN LỰC VIỆT NAM',
      address: 'Số 11 phố Cửa Bắc, Phường Trúc Bạch, Quận Ba Đình, Thành phố Hà Nội, Việt Nam',
      representative: 'NGUYỄN ANH TUẤN',
      industries: [],
      status: 'Đang hoạt động (đã được cấp GCN ĐKT)',
    });
  });

  it('D-17 không thấy MST (error 1, data []) → null, không phải lỗi', async () => {
    const r = provider({ error: 1, error_text: 'Lỗi không lấy được thông tin', data: [] });
    expect(await r.lookup('0101234000')).toBeNull();
  });

  it('D-17 người đại diện rỗng → null', async () => {
    const r = provider({ error: 0, data: { ...REAL.data, daidien: '  ' } });
    expect((await r.lookup('0100100079'))?.representative).toBeNull();
  });

  it('D-17 HTTP 4xx → IntegrationError để chuỗi chuyển nguồn', async () => {
    await expect(provider({}, 403).lookup('0100100079')).rejects.toBeInstanceOf(IntegrationError);
  });
});
