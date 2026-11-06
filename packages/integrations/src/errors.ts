/** Lỗi chung của adapter — domain không thấy lỗi SDK (adapters.md › Rule) */
export class IntegrationError extends Error {
  readonly reason?: 'not_configured';
  constructor(
    readonly provider: string,
    message: string,
    readonly retryable: boolean,
    options?: { cause?: unknown; reason?: 'not_configured' },
  ) {
    super(`[${provider}] ${message}`, options);
    this.name = 'IntegrationError';
    if (options?.reason) this.reason = options.reason;
  }
}
