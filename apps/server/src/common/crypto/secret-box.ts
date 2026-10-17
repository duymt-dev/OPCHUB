import { Inject, Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { ENV, type Env } from '../config';

/**
 * AES-256-GCM cho secret lưu DB (security.md): TOTP secret, SMTP key.
 * Định dạng: iv(12) | tag(16) | ciphertext.
 */
@Injectable()
export class SecretBox {
  private readonly key: Buffer;

  constructor(@Inject(ENV) env: Env) {
    this.key = Buffer.from(env.DATA_ENC_KEY, 'base64');
    if (this.key.length !== 32) throw new Error('DATA_ENC_KEY phải là 32 byte base64');
  }

  seal(plain: string | Buffer): Buffer {
    const iv = randomBytes(12);
    const c = createCipheriv('aes-256-gcm', this.key, iv);
    const body = Buffer.concat([c.update(plain), c.final()]);
    return Buffer.concat([iv, c.getAuthTag(), body]);
  }

  open(sealed: Uint8Array): Buffer {
    const buf = Buffer.from(sealed);
    const d = createDecipheriv('aes-256-gcm', this.key, buf.subarray(0, 12));
    d.setAuthTag(buf.subarray(12, 28));
    return Buffer.concat([d.update(buf.subarray(28)), d.final()]);
  }
}
