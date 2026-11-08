import QRCode from 'qrcode';

/** D-96: pure local encoder; never requests an external QR/image service. */
export function vietQrImage(payload: string): Promise<Buffer> {
  return QRCode.toBuffer(payload, {
    type: 'png',
    width: 320,
    errorCorrectionLevel: 'M',
    margin: 4,
  });
}
