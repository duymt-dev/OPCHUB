import { parseEnv, type Env } from './env.schema';

let cached: Env | undefined;

/** Nơi DUY NHẤT đọc process.env (code-structure: env qua zod) */
export function loadEnv(): Env {
  // eslint-disable-next-line no-restricted-syntax -- điểm đọc env duy nhất của server
  cached ??= parseEnv(process.env);
  return cached;
}
