// Lấy access token cho TK tải `load-<n>@load.opchub.test` (tạo bằng `pnpm --filter @opchub/db
// seed:load`) → in danh sách phân tách dấu phẩy để truyền vào socket-chat.js (-e TOKENS=...).
// Chạy: k6 run -q -e LOAD_USERS=500 -e LOAD_PASSWORD=... infra/k6/tokens.js 2>&1 \
//   | grep -o 'TOKENS=[^"]*' | sed 's/^TOKENS=//' > tokens.txt
// rồi socket-chat.js -e TOKENS_FILE=tokens.txt (1.000+ token vượt giới hạn dòng lệnh)
// Access token sống 15 phút (ACCESS_TTL_SEC) → chạy ngay trước kịch bản socket.
import http from 'k6/http';
import { fail } from 'k6';
import { API, jsonHeaders, requireEnv } from './lib.js';

export const options = { vus: 1, iterations: 1, thresholds: {} };

export default function () {
  const n = Number(__ENV.LOAD_USERS || 500);
  const password = requireEnv('LOAD_PASSWORD');
  const reqs = Array.from({ length: n }, (_, i) => [
    'POST',
    `${API}/auth/login`,
    JSON.stringify({ identifier: `load-${i + 1}@load.opchub.test`, password }),
    { headers: jsonHeaders(), tags: { name: 'setup_login' } },
  ]);
  const tokens = [];
  for (let i = 0; i < reqs.length; i += 50) {
    for (const r of http.batch(reqs.slice(i, i + 50))) {
      if (r.status === 200) tokens.push(r.json('accessToken'));
    }
  }
  // Thứ tự token = thứ tự TK (load-1, load-2, …) — socket-chat.js suy ra phòng theo vị trí
  if (tokens.length !== n) fail(`chỉ đăng nhập được ${tokens.length}/${n} TK tải`);
  console.log(`TOKENS=${tokens.join(',')}`);
}
