import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Một dòng `| METHOD | \`/path\` | Quyền | Nguồn | MSW |` của `coding-packs/plans/api-contract.md` */
export interface ContractRow {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  module: string;
  access: string;
}

const CONTRACT_MD = fileURLToPath(
  new URL('../../../../coding-packs/plans/api-contract.md', import.meta.url),
);

/** Parse bảng endpoint theo mục `## \`module\` (N)` — nguồn sự thật của TIP-B61 */
export function loadContract(): ContractRow[] {
  const rows: ContractRow[] = [];
  let module = '';
  for (const line of readFileSync(CONTRACT_MD, 'utf8').split(/\r?\n/)) {
    const h = /^## `([a-z-]+)`/.exec(line);
    if (h?.[1]) module = h[1];
    const m = /^\| (GET|POST|PUT|PATCH|DELETE) \| `([^`]+)` \| ([^|]+)\|/.exec(line);
    if (m?.[1] && m[2] && m[3]) {
      rows.push({
        method: m[1] as ContractRow['method'],
        path: m[2],
        module,
        access: m[3].trim(),
      });
    }
  }
  return rows;
}

export const keyOf = (method: string, path: string) => `${method} ${path}`;
