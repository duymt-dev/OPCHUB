export const redactMailQrPath = (path: string) =>
  path.replace(/(\/public\/mail-qr\/)[^?]*(?:\?.*)?$/i, '$1[Redacted].png');

/** Pino's standard request serializer copies credentials into params/query too. */
export function redactMailQrRequest(req: Record<string, unknown>) {
  if (typeof req.url !== 'string' || !/\/public\/mail-qr\//i.test(req.url)) return req;
  return {
    ...req,
    url: redactMailQrPath(req.url),
    params: '[Redacted]',
    query: '[Redacted]',
    ...(typeof req.originalUrl === 'string'
      ? { originalUrl: redactMailQrPath(req.originalUrl) }
      : {}),
  };
}
