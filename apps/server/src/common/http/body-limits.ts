/**
 * Giới hạn thân request — một nguồn duy nhất (TD-015, V2Q-64).
 * Thứ tự: nginx `client_max_body_size 1m` > body-parser (dưới đây) > payload zod lớn nhất
 * (chiến dịch 100.000 ký tự tiếng Việt ≈ 300 kB UTF-8). Ảnh KHÔNG đi qua body (presign, NA-26).
 */
export const JSON_LIMIT = '768kb';
export const FORM_LIMIT = '64kb';
/** Byte tương ứng — dùng trong test / kiểm cơ học */
export const JSON_LIMIT_BYTES = 768 * 1024;
export const FORM_LIMIT_BYTES = 64 * 1024;
