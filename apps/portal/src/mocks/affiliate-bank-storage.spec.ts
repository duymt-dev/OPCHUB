import { afterEach, describe, expect, it } from 'vitest';
import { persistMockBank, readMockBank } from './handlers/affiliate-bank-storage';

afterEach(() => sessionStorage.clear());
describe('MSW bank durability', () => {
  it('REQ-309 ghi/đọc riêng theo người dùng, payload hỏng không làm lỗi handler', () => {
    const bank = { bankName: 'ACB', bankNo: '123456789', bankHolder: 'NGUYEN VAN AN' } as const;
    persistMockBank('m1', bank);
    expect(readMockBank('m1')).toEqual(bank);
    expect(readMockBank('m2')).toBeNull();
    sessionStorage.setItem('opchub-msw-affiliate-bank:m1', '{invalid');
    expect(readMockBank('m1')).toBeNull();
    sessionStorage.setItem('opchub-msw-affiliate-bank:m1', JSON.stringify({ bankName: 'invalid' }));
    expect(readMockBank('m1')).toBeNull();
  });
});
