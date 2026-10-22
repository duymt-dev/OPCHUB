/** Email-safe palette matching packages/ui/src/theme/tokens.ts; no React/UI runtime in workers. */
const BRAND = {
  primary: '#1677FF',
  navy: '#0B1F4D',
  background: '#F3F8FF',
  border: '#E6EEF9',
  highlight: '#E6F4FF',
  text: '#14171F',
  muted: '#595959',
  white: '#FFFFFF',
} as const;

const FONT = "Arial,'Helvetica Neue',sans-serif";
const ESC: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Only the body accepts trusted, already escaped/sanitized HTML. */
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c] ?? c);

/** Table layout and inline styles keep the core design when a mail client strips head styles. */
export function layout(title: string, body: string): string {
  return (
    `<!doctype html><html lang="vi"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>${esc(title)}</title>` +
    `<style>@media only screen and (max-width:480px){` +
    `.mail-outer{padding:16px 8px!important}.mail-content{padding:24px 20px!important}` +
    `.mail-title{font-size:24px!important}}` +
    `.mail-content a{color:${BRAND.primary}}.mail-content img{max-width:100%;height:auto}` +
    `.mail-content p{margin:0 0 16px}.mail-content li{margin-bottom:8px}</style></head>` +
    `<body style="margin:0;padding:0;background-color:${BRAND.background};color:${BRAND.text};` +
    `font-family:${FONT};-webkit-text-size-adjust:100%">` +
    `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;` +
    `opacity:0;overflow:hidden;mso-hide:all">${esc(title)} — OPC Hub Community</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ` +
    `bgcolor="${BRAND.background}"><tr><td class="mail-outer" align="center" style="padding:40px 12px">` +
    `<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" ` +
    `border="0"><tr><td><![endif]-->` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ` +
    `style="max-width:600px;border:1px solid ${BRAND.border};border-radius:16px;` +
    `border-spacing:0;background-color:${BRAND.white}">` +
    `<tr><td bgcolor="${BRAND.navy}" style="padding:28px 32px;border-radius:16px 16px 0 0;` +
    `border-top:4px solid ${BRAND.primary};font-family:${FONT}">` +
    `<p style="margin:0;color:${BRAND.white};font-size:28px;font-weight:700;letter-spacing:-1px">` +
    `OPC <span style="color:#91CAFF">Hub</span></p>` +
    `<p style="margin:6px 0 0;color:${BRAND.highlight};font-size:12px;letter-spacing:2px">COMMUNITY</p>` +
    `</td></tr><tr><td class="mail-content" style="padding:32px;font-family:${FONT};` +
    `font-size:16px;line-height:1.7;color:${BRAND.text};overflow-wrap:anywhere;word-break:break-word">` +
    `<h1 class="mail-title" style="margin:0 0 24px;color:${BRAND.navy};font-size:28px;` +
    `line-height:1.3;font-weight:700">${esc(title)}</h1>${body}</td></tr>` +
    `<tr><td style="padding:20px 32px;border-top:1px solid ${BRAND.border};` +
    `font-family:${FONT};font-size:12px;line-height:1.6;color:${BRAND.muted}">` +
    `<p style="margin:0;font-weight:700;color:${BRAND.navy}">OPC Hub Community</p>` +
    `</td></tr></table><!--[if mso]></td></tr></table><![endif]-->` +
    `</td></tr></table></body></html>`
  );
}

/** Border-based button remains clickable without images or external CSS. */
export function actionButton(label: string, url: string): string {
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0">` +
    `<tr><td bgcolor="${BRAND.primary}" style="border-radius:8px;text-align:center">` +
    `<a href="${esc(url)}" style="display:inline-block;background-color:${BRAND.primary};` +
    `border:12px solid ${BRAND.primary};border-left-width:24px;border-right-width:24px;` +
    `border-radius:8px;color:${BRAND.white};font-size:16px;font-weight:700;line-height:24px;` +
    `text-decoration:none;text-align:center">${esc(label)}</a></td></tr></table>`
  );
}

export function otpPanel(code: string): string {
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ` +
    `style="margin:20px 0"><tr><td align="center" bgcolor="${BRAND.highlight}" ` +
    `style="padding:24px 12px;border:1px solid ${BRAND.border};border-radius:12px;` +
    `color:${BRAND.navy};font-family:Consolas,monospace;font-size:32px;font-weight:700;` +
    `letter-spacing:6px;line-height:1.4">${esc(code)}</td></tr></table>`
  );
}
