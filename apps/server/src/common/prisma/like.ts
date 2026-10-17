/** Mẫu `ILIKE '%…%'` an toàn: escape ký tự đại diện `\ % _` do người dùng gõ */
export const containsPattern = (term: string): string =>
  `%${term.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
