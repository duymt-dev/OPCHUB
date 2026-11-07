import { Global, Logger, Module } from '@nestjs/common';
import {
  type BankWebhookProvider,
  BrevoMailProvider,
  ChainTaxProvider,
  DlplTaxProvider,
  EsgooTaxProvider,
  FakeBankProvider,
  FakeMailProvider,
  FakeSsoProvider,
  FakeTaxProvider,
  GoogleSsoProvider,
  LocalStorageProvider,
  type MailProvider,
  S3StorageProvider,
  SepayBankProvider,
  SmtpMailProvider,
  type SsoProvider,
  type StorageProvider,
  type TaxLookupProvider,
  VietqrTaxProvider,
  FakePushProvider,
  WebPushProvider,
  type PushProvider,
} from '@opchub/integrations';
import { ENV, type Env } from '../config';

/** Token DI cho adapter (adapters.md): domain chỉ phụ thuộc interface, provider chọn theo env */
export const MAIL = Symbol('MAIL_PROVIDER');
export const BANK = Symbol('BANK_PROVIDER');
export const TAX_LOOKUP = Symbol('TAX_LOOKUP_PROVIDER');
export const STORAGE = Symbol('STORAGE_PROVIDER');
export const SSO = Symbol('SSO_PROVIDER');
export const LLM = Symbol('LLM_PROVIDER');
export const PUSH = Symbol('PUSH_PROVIDER');

const logger = new Logger('Integrations');

function mail(env: Env): MailProvider {
  const brevoKey = env.EMAIL_API_KEY ?? env.BREVO_API_KEY;
  if ((env.MAIL_PROVIDER === 'brevo' || env.EMAIL_PROVIDER === 'brevo' || brevoKey) && brevoKey) {
    const fromName = env.EMAIL_FROM_NAME ?? env.MAIL_FROM_NAME;
    const fromEmail = env.EMAIL_FROM ?? env.MAIL_FROM_EMAIL;
    return new BrevoMailProvider({
      apiKey: brevoKey,
      defaultFrom: { name: fromName, email: fromEmail },
    });
  }
  if (env.MAIL_PROVIDER === 'smtp' && env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD) {
    return new SmtpMailProvider({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      encryption: 'tls',
      username: env.SMTP_USER,
      password: env.SMTP_PASSWORD,
      fromName: env.MAIL_FROM_NAME,
      fromEmail: env.MAIL_FROM_EMAIL,
    });
  }
  // TD-035: chỉ dev/e2e ghi thư ra thư mục (env schema cấm FAKE_MAIL_DIR ở production)
  const outDir = env.NODE_ENV !== 'production' ? env.FAKE_MAIL_DIR : undefined;
  return new FakeMailProvider(outDir ? { outDir } : {});
}

function bank(env: Env): BankWebhookProvider {
  if (env.BANK_PROVIDER === 'sepay' && env.SEPAY_API_TOKEN) {
    return new SepayBankProvider({
      webhookSecret: env.BANK_WEBHOOK_SECRET,
      apiToken: env.SEPAY_API_TOKEN,
      accountNumber: env.BANK_ACCOUNT_NO,
    });
  }
  return new FakeBankProvider(env.BANK_WEBHOOK_SECRET);
}

/** D-65: DLPL (có key) → ESGOO → VietQR; thiếu key thì bỏ DLPL, không chặn khởi động */
function tax(env: Env): TaxLookupProvider {
  const dlpl = env.DLPL_API_KEY
    ? new DlplTaxProvider({ apiKey: env.DLPL_API_KEY, baseUrl: env.DLPL_BASE_URL })
    : null;
  if (env.TAX_LOOKUP_PROVIDER === 'dlpl' && dlpl) return dlpl;
  if (env.TAX_LOOKUP_PROVIDER === 'chain') {
    if (!dlpl) logger.warn('DLPL_API_KEY trống — tra MST chỉ dùng ESGOO/VietQR');
    const sources = [new EsgooTaxProvider(), new VietqrTaxProvider()];
    return new ChainTaxProvider(dlpl ? [dlpl, ...sources] : sources, (p, err) =>
      logger.warn({ provider: p, err }, 'Tra MST lỗi, thử nguồn sau'),
    );
  }
  return new FakeTaxProvider();
}

function storage(env: Env): StorageProvider {
  if (env.STORAGE_PROVIDER === 'local' && env.LOCAL_STORAGE_DIR) {
    return new LocalStorageProvider({
      root: env.LOCAL_STORAGE_DIR,
      baseUrl: `${env.PORTAL_URL}/v1/uploads`,
      signingKey: env.DATA_ENC_KEY,
    });
  }
  return new S3StorageProvider({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    bucket: env.S3_BUCKET,
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
    publicBaseUrl: env.S3_PUBLIC_URL ?? `${env.S3_ENDPOINT}/${env.S3_BUCKET}`,
  });
}

/** D-64: Google OIDC thật khi cấu hình (env bắt buộc ở production); dev/test dùng fake */
function sso(env: Env): SsoProvider {
  if (env.SSO_PROVIDER === 'google' && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    logger.log('SSO: Google');
    return new GoogleSsoProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    });
  }
  return new FakeSsoProvider();
}

function push(env: Env): PushProvider {
  if (
    env.PUSH_PROVIDER === 'webpush' &&
    env.VAPID_PUBLIC_KEY &&
    env.VAPID_PRIVATE_KEY &&
    env.VAPID_SUBJECT
  ) {
    return new WebPushProvider({
      publicKey: env.VAPID_PUBLIC_KEY,
      privateKey: env.VAPID_PRIVATE_KEY,
      subject: env.VAPID_SUBJECT,
    });
  }
  return new FakePushProvider();
}

@Global()
@Module({
  providers: [
    { provide: MAIL, inject: [ENV], useFactory: mail },
    { provide: BANK, inject: [ENV], useFactory: bank },
    { provide: TAX_LOOKUP, inject: [ENV], useFactory: tax },
    { provide: STORAGE, inject: [ENV], useFactory: storage },
    { provide: SSO, inject: [ENV], useFactory: sso },
    { provide: PUSH, inject: [ENV], useFactory: push },
  ],
  exports: [MAIL, BANK, TAX_LOOKUP, STORAGE, SSO, PUSH],
})
export class IntegrationsModule {}
