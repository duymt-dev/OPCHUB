import { expect, it } from 'vitest';
import { vietQrPayload } from '@opchub/shared';
import { vietQrImage } from './vietqr-image';

it('D-96 SPEC10 locally renders dynamic VietQR into a real320x320 PNG with deterministic payload', async () => {
  const payload = vietQrPayload({
    bin: '970436',
    accountNo: '123456789',
    amount: 1_200_000,
    purpose: 'OPCHUB TV000001 0900000000',
  });
  const png = await vietQrImage(payload);
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(png.readUInt32BE(16)).toBe(320);
  expect(png.readUInt32BE(20)).toBe(320);
  expect(png.equals(await vietQrImage(payload))).toBe(true);
});
