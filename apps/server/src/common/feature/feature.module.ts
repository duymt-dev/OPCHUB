import { type DynamicModule, Module, type Type } from '@nestjs/common';
import { type Env, loadEnv } from '../config';

type Flag = Extract<keyof Env, `FEATURE_${string}`>;

/**
 * Đăng ký module theo cờ tính năng (D-05): cờ tắt → không import → route không tồn tại (404).
 * Mỗi lần gọi dựng một class riêng để Nest không gộp các DynamicModule cùng `module`.
 */
export function whenFeature(flag: Flag, mod: Type): DynamicModule {
  @Module({})
  class FeatureGate {}
  Object.defineProperty(FeatureGate, 'name', { value: `Feature_${flag}` });
  return { module: FeatureGate, imports: loadEnv()[flag] ? [mod] : [] };
}
