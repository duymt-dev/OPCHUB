/** Tiện ích kiểm bản dịch (dùng trong messages.spec) — so từng chuỗi với bản tiếng Việt */

export type Leaves = Map<string, string>;

export function leaves(tree: unknown, prefix = '', out: Leaves = new Map()): Leaves {
  if (tree && typeof tree === 'object') {
    for (const [k, v] of Object.entries(tree)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'string') out.set(key, v);
      else leaves(v, key, out);
    }
  }
  return out;
}

/** Biến `{name}` và thẻ rich text `<b>` / `</b>` / `<br>` — phải giữ nguyên khi dịch */
export function tokens(s: string): string[] {
  const vars = [...s.matchAll(/\{\s*([a-zA-Z0-9_]+)/g)].map((m) => `{${m[1] ?? ''}}`);
  const tags = [...s.matchAll(/<\/?[a-zA-Z]+\s*\/?>/g)].map((m) => m[0].replace(/\s/g, ''));
  return [...vars, ...tags].sort();
}

/** Chuỗi có dấu tiếng Việt (để bắt chỗ quên dịch) */
export const hasVietnamese = (s: string) =>
  /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i.test(s);

/** Ngoặc nhọn cân bằng (ICU hỏng thường do mất `}`) */
export function balanced(s: string): boolean {
  let d = 0;
  for (const c of s) {
    if (c === '{') d += 1;
    else if (c === '}') d -= 1;
    if (d < 0) return false;
  }
  return d === 0;
}
