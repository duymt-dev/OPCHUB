import { Module } from '@nestjs/common';
import { LoggerModule as PinoModule } from 'nestjs-pino';
import { ENV, type Env } from '../config';
import { assignRequestId } from './request-id';

/** Không log secret/PII (code-structure.md › Lỗi và log) */
export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.newPassword',
  '*.otp',
  '*.code',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.key',
];

@Module({
  imports: [
    PinoModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        pinoHttp: {
          level: env.LOG_LEVEL,
          genReqId: assignRequestId,
          redact: { paths: REDACT_PATHS, censor: '[Redacted]' },
          customProps: (req) => {
            const user = (req as { user?: { sub?: string } }).user;
            return user?.sub ? { userId: user.sub } : {};
          },
          ...(env.NODE_ENV === 'development'
            ? { transport: { target: 'pino-pretty', options: { singleLine: true } } }
            : {}),
        },
      }),
    }),
  ],
})
export class LoggerModule {}
