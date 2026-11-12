export class AdminIntlResourceError extends Error {
  override readonly name = 'AdminIntlResourceError';
  readonly locale: string;

  constructor(locale: string, cause: unknown) {
    super('Admin Intl resources unavailable', { cause });
    this.locale = locale;
  }
}
