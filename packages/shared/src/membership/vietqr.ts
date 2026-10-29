/**
 * D-96 (§27.5c): chuỗi VietQR theo chuẩn EMVCo / NAPAS — sinh ở máy chủ, không gọi dịch vụ ngoài.
 * App ngân hàng quét ra STK + số tiền + nội dung chuyển khoản điền sẵn.
 */

/** Mã định danh dịch vụ NAPAS 247 (GUID) và dịch vụ chuyển nhanh tới tài khoản */
const NAPAS_GUID = 'A000000727';
const SERVICE_TO_ACCOUNT = 'QRIBFTTA';

const tlv = (id: string, value: string): string => {
  if (value.length > 99) throw new Error(`VietQR: trường ${id} dài quá 99 ký tự`);
  return `${id}${String(value.length).padStart(2, '0')}${value}`;
};

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) — trường 63 của EMVCo */
export function crc16(text: string): string {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i += 1) {
    crc ^= text.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Nội dung CK trong QR: bỏ dấu tiếng Việt, chỉ ASCII in được, tối đa 99 ký tự */
export function qrPurpose(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, (c) => (c === 'đ' ? 'd' : 'D'))
    .replace(/[^\x20-\x7e]/g, '')
    .trim()
    .slice(0, 99);
}

export interface VietQrInput {
  /** Mã BIN ngân hàng thụ hưởng (Vietcombank 970436) */
  bin: string;
  accountNo: string;
  /** VND nguyên */
  amount: number;
  purpose: string;
}

/** Chuỗi EMVCo động (Point of Initiation 12) có số tiền + nội dung */
export function vietQrPayload({ bin, accountNo, amount, purpose }: VietQrInput): string {
  const beneficiary = tlv('00', bin) + tlv('01', accountNo);
  const merchant = tlv('00', NAPAS_GUID) + tlv('01', beneficiary) + tlv('02', SERVICE_TO_ACCOUNT);
  const body =
    tlv('00', '01') +
    tlv('01', '12') +
    tlv('38', merchant) +
    tlv('53', '704') +
    tlv('54', String(Math.max(0, Math.round(amount)))) +
    tlv('58', 'VN') +
    tlv('62', tlv('08', qrPurpose(purpose)));
  const head = `${body}6304`;
  return head + crc16(head);
}
