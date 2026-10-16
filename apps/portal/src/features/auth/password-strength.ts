/** Độ mạnh mật khẩu 0–4: đủ 8 ký tự, có chữ hoa, có số, có ký tự đặc biệt */
export function passwordStrength(pwd: string): number {
  if (!pwd) return 0;
  return [pwd.length >= 8, /[A-Z]/.test(pwd), /\d/.test(pwd), /[^A-Za-z0-9]/.test(pwd)].filter(
    Boolean,
  ).length;
}
