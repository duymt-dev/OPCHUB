import { Module } from '@nestjs/common';
import { MailCoreModule } from '@/modules/mail';
import { AuthController } from './controllers/auth.controller';
import { MeController } from './controllers/me.controller';
import { PublicController } from './controllers/public.controller';
import { RegisterController } from './controllers/register.controller';
import { SsoController } from './controllers/sso.controller';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { RegistrationRepository } from './repositories/registration.repository';
import { UserRepository } from './repositories/user.repository';
import { AuthService } from './services/auth.service';
import { BizLookupService } from './services/biz-lookup.service';
import { LoginLockService } from './services/login-lock.service';
import { MeService } from './services/me.service';
import { OtpService } from './services/otp.service';
import { PasswordService } from './services/password.service';
import { PublicInfoService } from './services/public-info.service';
import { RegisterService } from './services/register.service';
import { SsoService } from './services/sso.service';
import { TokenService } from './services/token.service';

const providers = [
  UserRepository,
  RefreshTokenRepository,
  RegistrationRepository,
  PasswordService,
  LoginLockService,
  TokenService,
  AuthService,
  MeService,
  OtpService,
  BizLookupService,
  RegisterService,
  SsoService,
  PublicInfoService,
];

/** Service + repository — cho socket/worker (không controller) */
@Module({ imports: [MailCoreModule], providers, exports: providers })
export class AccountCoreModule {}

/** Process api: thêm controller */
@Module({
  imports: [AccountCoreModule],
  controllers: [AuthController, MeController, RegisterController, SsoController, PublicController],
})
export class AccountHttpModule {}
