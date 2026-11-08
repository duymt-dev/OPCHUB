/** Signed image URLs are bearer credentials; preserve request metadata, not the token/query. */
export function redactMailQrRequest(req: Record<string, unknown>) {
  const url = req.url;
  return typeof url === 'string' && url.includes('/public/mail-qr/')
    ? { ...req, url: url.replace(/(\/public\/mail-qr\/)[^?]*(?:\?.*)?$/, '$1[Redacted].png') }
    : req;
}
