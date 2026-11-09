import 'server-only';
/** Fixed event names only; never serialize API URLs, headers, credentials or exception payloads. */
export const serverLogger = {
  warn: (event: string) => {
    process.stderr.write(`${JSON.stringify({ level: 'warn', scope: 'portal-seo', event })}\n`);
  },
};
