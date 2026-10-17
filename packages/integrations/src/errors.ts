/** Lỗi chung của adapter — domain không thấy lỗi SDK (adapters.md › Rule) */
export class IntegrationError extends Error {
  constructor(
    readonly provider: string,
    message: string,
    readonly retryable: boolean,
    options?: { cause?: unknown },
  ) {
    super(`[${provider}] ${message}`, options);
    this.name = 'IntegrationError';
  }
}
