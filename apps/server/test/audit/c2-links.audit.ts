/**
 * Kiểm 2 — Link do server sinh → đích có thật.
 * Nguồn link: `${env.PORTAL_URL}/…` (mail, SSO, storage), `link:` của thông báo, hàm dựng link (roomLink),
 * URL trong seed mail chào mừng. Đích: page/route Next (`apps/portal|admin/src/app/**`) hoặc route REST server.
 * Chạy: packages/db/node_modules/.bin/tsx apps/server/test/audit/c2-links.audit.ts
 */
import {
  abs,
  type CheckResult,
  controllerRoutes,
  type Finding,
  isMain,
  isProdTs,
  lines,
  printResult,
  read,
  rel,
  routeRegex,
  walk,
} from './lib.audit';

type App = 'portal' | 'admin';

interface FeRoute {
  app: App;
  pattern: string;
  re: RegExp;
}

/** `(group)` bỏ, `[id]` một đoạn, `[...x]` ≥1 đoạn, `[[...x]]` ≥0 đoạn */
function feRoutes(app: App): FeRoute[] {
  const base = abs(`apps/${app}/src/app`);
  return walk(`apps/${app}/src/app`, (f) => /[\\/](page|route)\.tsx?$/.test(f)).map((f) => {
    const segs = rel(f)
      .slice(rel(base).length + 1)
      .split('/')
      .slice(0, -1)
      .filter((s) => !/^\(.*\)$/.test(s));
    let re = '';
    for (const s of segs) {
      if (/^\[\[\.\.\..+\]\]$/.test(s)) re += '(?:/.*)?';
      else if (/^\[\.\.\..+\]$/.test(s)) re += '/.+';
      else if (/^\[.+\]$/.test(s)) re += '/[^/]+';
      else re += '/' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    return { app, pattern: '/' + segs.join('/'), re: new RegExp(`^${re || '/'}$`) };
  });
}

interface Link {
  where: string;
  raw: string;
  /** Đường dẫn chuẩn hoá: `${…}` → `X`, bỏ query */
  path: string;
  /** Mở ở đâu */
  target: App | 'api';
  ctx: string;
}

const norm = (s: string): string => {
  const p = s.replace(/\$\{[^}]*\}/g, 'X').split(/[?#]/)[0] ?? '';
  return p.replace(/\/+$/, '') || '/';
};

function collectLinks(): Link[] {
  const files = walk('apps/server/src', isProdTs);
  const out: Link[] = [];
  for (const f of files) {
    const ls = lines(f);
    ls.forEach((l, i) => {
      if (/^\s*(\*|\/\/)/.test(l)) return;
      const where = `${rel(f)}:${i + 1}`;
      for (const m of l.matchAll(/\$\{(?:this\.)?env\.PORTAL_URL\}(\/[^`'"\s]*)/g)) {
        const raw = m[1] ?? '';
        const api = raw.startsWith('/v1/');
        out.push({
          where,
          raw,
          path: norm(raw),
          target: api ? 'api' : 'portal',
          ctx: 'PORTAL_URL + path',
        });
      }
      for (const m of l.matchAll(/\blink:\s*[`'](\/[^`']*)[`']/g)) {
        const raw = m[1] ?? '';
        out.push({ where, raw, path: norm(raw), target: 'portal', ctx: 'notification.link' });
      }
      // link: approved ? `/a` : '/b'
      const tern = l.match(/\blink:\s*[^,]*\?\s*[`'](\/[^`']*)[`']\s*:\s*[`'](\/[^`']*)[`']/);
      if (tern) {
        for (const raw of [tern[1] ?? '', tern[2] ?? '']) {
          out.push({ where, raw, path: norm(raw), target: 'portal', ctx: 'notification.link' });
        }
      }
      // Hàm dựng link: const xLink = (…) => … `/chat/${…}`
      if (/const \w*[Ll]ink\s*=/.test(l)) {
        const win = ls.slice(i, i + 3).join(' ');
        for (const m of win.matchAll(/`(\/[^`]*)`/g)) {
          const raw = m[1] ?? '';
          out.push({
            where,
            raw,
            path: norm(raw),
            target: 'portal',
            ctx: 'hàm dựng notification.link',
          });
        }
      }
    });
  }
  // URL mặc định của mail chào mừng (seed / fixtures)
  const seed = abs('packages/shared/src/fixtures/prototype-seed.json');
  lines(seed).forEach((l, i) => {
    const m = l.match(/"(loginUrl|guideUrl)":\s*"https?:\/\/(?:www\.)?opchub\.community([^"]*)"/);
    if (m) {
      out.push({
        where: `${rel(seed)}:${i + 1}`,
        raw: m[2] ?? '',
        path: norm(m[2] || '/'),
        target: 'portal',
        ctx: `mail chào mừng ${m[1] ?? ''}`,
      });
    }
  });
  return out;
}

export function runC2(): CheckResult {
  const fe = [...feRoutes('portal'), ...feRoutes('admin')];
  const api = controllerRoutes();
  const links = collectLinks();
  const fail: Finding[] = [];
  const notes: string[] = [];
  let pass = 0;

  // Thông báo dành cho nhân sự Admin (comment "link sang màn Admin")
  const handler = 'apps/server/src/modules/notification/services/notification-events.handler.ts';
  const adminNote = read(abs(handler)).match(/link sang màn Admin[\s\S]*?link:\s*`([^`]*)`/);
  const adminLinks = new Set(adminNote?.[1] ? [norm(adminNote[1])] : []);

  const adminRequests = walk('apps/admin/src/features/requests', isProdTs).map(read).join('\n');
  const seen = new Set<string>();
  for (const k of links) {
    const key = `${k.where}|${k.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const target: App | 'api' = adminLinks.has(k.path) ? 'admin' : k.target;
    // `baseUrl: …/v1/uploads` là tiền tố — publicUrl = base + key
    const [wf = '', wl = '0'] = k.where.split(':');
    const isBase = /baseUrl:/.test(lines(abs(wf))[Number(wl) - 1] ?? '');
    const probe = k.path.replace(/X/g, 'x1') + (isBase ? '/x1/x2.png' : '');
    const ok =
      target === 'api'
        ? api.some((r) => r.method === 'GET' && routeRegex(r.path).test(probe))
        : fe.some((r) => r.app === target && r.re.test(probe));
    const label = `${k.ctx}: \`${k.raw}\` → ${target}`;
    const adminRead = target === 'admin' && /\?code=/.test(k.raw);
    if (ok && adminRead && !/get\('code'\)/.test(adminRequests)) {
      fail.push({
        where: k.where,
        what: `${label}: trang /requests có nhưng Admin không đọc \`?code=\` (không mở phiếu) và hook thông báo Admin không điều hướng; mở ở Portal thì 404`,
        sev: 'S3',
      });
      continue;
    }
    if (ok) {
      pass++;
      notes.push(`đạt — ${k.where} ${label}`);
      continue;
    }
    const other = fe
      .filter((r) => r.app !== target && r.re.test(probe))
      .map((r) => `${r.app}${r.pattern}`);
    let sev = 'S3';
    let what = `${label}: không có page/route khớp`;
    if (k.path === '/reset-password') {
      sev = 'S1';
      what +=
        ' — mail quên mật khẩu dẫn tới 404, người dùng không đặt lại được mật khẩu (POST /v1/auth/password/reset có nhưng không có màn gọi)';
    }
    if (k.path === '/membership') what += ' — Portal chỉ có /membership/pay';
    if (other.length) what += ` (chỉ có ở ${other.join(', ')})`;
    fail.push({ where: k.where, what, sev });
  }

  // Ghi chú ngữ cảnh — không đếm vào đạt/không đạt
  const adminNotif = read(abs('apps/admin/src/features/shell/hooks/use-notifications.ts'));
  if (!/router\.push/.test(adminNotif)) {
    notes.push(
      'apps/admin/src/features/shell/hooks/use-notifications.ts: Admin mở thông báo chỉ đánh dấu đã đọc, không điều hướng → mọi notification.link nhận ở Admin là link chết',
    );
  }
  const adminForgot = read(abs('apps/admin/src/features/auth/api.ts'));
  if (/password\/forgot/.test(adminForgot)) {
    notes.push(
      'apps/admin/src/features/auth/api.ts: Admin dùng chung /auth/password/forgot → link mail cũng trỏ PORTAL_URL/reset-password (Portal từ chối đăng nhập TK quản trị)',
    );
  }
  const sso = read(abs('apps/portal/src/features/auth/components/sso-complete-screen.tsx'));
  if (/params\.get\('provider'\)/.test(sso)) {
    notes.push(
      'sso.service.ts redirectUri = PORTAL_URL/sso/callback (không mang provider); màn callback cần `?provider=` — chỉ FakeSsoProvider tự gắn. Provider thật sẽ không gắn tham số này (xem Câu hỏi)',
    );
  }
  return { id: 2, title: 'Link do server sinh → đích có thật', pass, fail, notes };
}

if (isMain('c2-links.audit.ts')) printResult(runC2());
