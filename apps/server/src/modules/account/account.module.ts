import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { MeController } from './controllers/me.controller';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { UserRepository } from './repositories/user.repository';
import { AuthService } from './services/auth.service';
import { LoginLockService } from './services/login-lock.service';
import { MeService } from './services/me.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';

const providers = [
  UserRepository,
  RefreshTokenRepository,
  PasswordService,
  LoginLockService,
  TokenService,
  AuthService,
  MeService,
];

/** Service + repository — cho socket/worker (không controller) */
@Module({ providers, exports: providers })
export class AccountCoreModule {}

/** Process api: thêm controller */
@Module({
  imports: [AccountCoreModule],
  controllers: [AuthController, MeController],
})
export class AccountHttpModule {}
