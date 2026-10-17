// §14.2 "Duyệt danh sách Admin": 100 phiên Admin, p95 < 400ms.
// Mỗi VU = một phiên Admin duyệt các danh sách có phân trang (deferred join / keyset) như màn thật.
// ADMIN_EMAIL / ADMIN_PASSWORD: tài khoản admin của môi trường đo (dev: tài khoản demo prototype).
import http from 'k6/http';
import { check, sleep } from 'k6';
import { API, auth, login, requireEnv } from './lib.js';

const VUS = Number(__ENV.VUS || 100);

export const options = {
  scenarios: {
    admins: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: VUS },
        { duration: __ENV.DURATION || '2m', target: VUS },
        { duration: '15s', target: 0 },
      ],
    },
  },
  thresholds: {
    'http_req_duration{kind:list}': ['p(95)<400'],
    'checks{kind:list}': ['rate>0.99'],
  },
};

const PAGES = [
  '/admin/users?page=1&size=10',
  '/admin/users?page=3&size=10',
  '/admin/fees?page=1&size=10',
  '/admin/fees/transactions?size=20',
  '/admin/groups?page=1&size=10',
  '/admin/projects?page=1&size=10',
  '/admin/events?page=1&size=10',
  '/admin/audit-logs?size=20',
  '/admin/reports?status=open&page=1&size=10',
  '/admin/overview',
  '/admin/badges',
];

export function setup() {
  return { token: login(requireEnv('ADMIN_EMAIL'), requireEnv('ADMIN_PASSWORD')) };
}

export default function (data) {
  for (const p of PAGES) {
    const r = http.get(`${API}${p}`, {
      ...auth(data.token),
      tags: { name: p.split('?')[0], kind: 'list' },
    });
    check(r, { 'list 200': (x) => x.status === 200 }, { kind: 'list' });
    sleep(0.5 + Math.random());
  }
}
