/**
 * Aho–Corasick (S-08): một lần duyệt văn bản tìm mọi từ khoá — O(n + số lần khớp), không phụ thuộc
 * số từ khoá. So khớp không phân biệt hoa thường; trả từ khoá đầu tiên khớp (đoạn để tô đậm).
 */
interface Node {
  next: Map<string, number>;
  fail: number;
  /** Độ dài từ khoá dài nhất kết thúc tại đây (0 = không có) */
  out: number;
  word: string;
}

const normalize = (s: string) => s.toLocaleLowerCase('vi').normalize('NFC');

export class KeywordMatcher {
  private readonly nodes: Node[] = [{ next: new Map(), fail: 0, out: 0, word: '' }];

  constructor(words: readonly string[]) {
    for (const w of words) this.insert(normalize(w.trim()));
    this.build();
  }

  get size(): number {
    return this.nodes.length - 1;
  }

  private insert(word: string): void {
    if (!word) return;
    let cur = 0;
    for (const ch of word) {
      const node = this.nodes[cur];
      if (!node) return;
      let nxt = node.next.get(ch);
      if (nxt === undefined) {
        nxt = this.nodes.length;
        this.nodes.push({ next: new Map(), fail: 0, out: 0, word: '' });
        node.next.set(ch, nxt);
      }
      cur = nxt;
    }
    const end = this.nodes[cur];
    if (end) {
      end.out = [...word].length;
      end.word = word;
    }
  }

  private build(): void {
    const queue: number[] = [];
    for (const child of this.nodes[0]?.next.values() ?? []) queue.push(child);
    while (queue.length) {
      const id = queue.shift() ?? 0;
      const node = this.nodes[id];
      if (!node) continue;
      for (const [ch, child] of node.next) {
        let f = node.fail;
        while (f && !this.nodes[f]?.next.has(ch)) f = this.nodes[f]?.fail ?? 0;
        const target = this.nodes[f]?.next.get(ch);
        const fail = target !== undefined && target !== child ? target : 0;
        const c = this.nodes[child];
        if (!c) continue;
        c.fail = fail;
        // Kế thừa đầu ra từ liên kết lỗi (từ khoá là hậu tố)
        const fn = this.nodes[fail];
        if (!c.out && fn?.out) {
          c.out = fn.out;
          c.word = fn.word;
        }
        queue.push(child);
      }
    }
  }

  /** Đoạn gốc trong `text` khớp từ khoá đầu tiên, hoặc null */
  firstHit(text: string): string | null {
    const chars = [...normalize(text)];
    const orig = [...text.normalize('NFC')];
    let cur = 0;
    for (let i = 0; i < chars.length; i += 1) {
      const ch = chars[i] ?? '';
      while (cur && !this.nodes[cur]?.next.has(ch)) cur = this.nodes[cur]?.fail ?? 0;
      cur = this.nodes[cur]?.next.get(ch) ?? 0;
      const out = this.nodes[cur]?.out ?? 0;
      if (out) return orig.slice(i - out + 1, i + 1).join('');
    }
    return null;
  }
}
