import { ExportCoreModule } from '@/modules/export';
import { Module } from '@nestjs/common';
import { MailCoreModule } from '@/modules/mail';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AuthController } from './controllers/auth.controller';
import { MeController } from './controllers/me.controller';
import { MembersController } from './controllers/members.controller';
import { PasswordController } from './controllers/password.controller';
import { PublicController } from './controllers/public.controller';
import { RegisterController } from './controllers/register.controller';
import { SsoController } from './controllers/sso.controller';
import { AdminUsersRepository } from './repositories/admin-users.repository';
import { CredentialRepository } from './repositories/credential.repository';
import { ProfileRepository } from './repositories/profile.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { RegistrationRepository } from './repositories/registration.repository';
import { UserRepository } from './repositories/user.repository';
import { AdminUsersService } from './services/admin-users.service';
import { AuthService } from './services/auth.service';
import { BizLookupService } from './services/biz-lookup.service';
import { EmailChangeService } from './services/email-change.service';
import { LockEffectsRegistry } from './services/lock-effects.registry';
import { LoginLockService } from './services/login-lock.service';
import { MemberDirectory } from './services/member-directory.service';
import { MeService } from './services/me.service';
import { OtpService } from './services/otp.service';
import { PasswordPolicyService } from './services/password-policy.service';
import { PasswordResetService } from './services/password-reset.service';
import { PasswordService } from './services/password.service';
import { PortalCredentials } from './services/portal-credentials.service';
import { ProfileStatsRegistry } from './services/profile-stats.registry';
import { ProfileService } from './services/profile.service';
import { PublicInfoService } from './services/public-info.service';
import { RegisterService } from './services/register.service';
import { SessionService } from './services/session.service';
import { SsoService } from './services/sso.service';
import { TokenService } from './services/token.service';
import { TotpService } from './services/totp.service';
import { UserLifecycleHandler } from './services/user-lifecycle.handler';
import { ConsentWriter } from './services/consent-writer.service';

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
  CredentialRepository,
  PasswordPolicyService,
  PasswordResetService,
  SessionService,
  TotpService,
  ProfileRepository,
  ProfileStatsRegistry,
  ProfileService,
  EmailChangeService,
  MemberDirectory,
  AdminUsersRepository,
  AdminUsersService,
  LockEffectsRegistry,
  UserLifecycleHandler,
  PortalCredentials,
  ConsentWriter,
];

/** Service + repository — cho socket/worker (không controller) */
@Module({ imports: [MailCoreModule], providers, exports: providers })
export class AccountCoreModule {}

/** Process api: thêm controller */
@Module({
  imports: [AccountCoreModule, ExportCoreModule],
  controllers: [
    AuthController,
    MeController,
    RegisterController,
    SsoController,
    PublicController,
    PasswordController,
    MembersController,
    AdminUsersController,
  ],
})
export class AccountHttpModule {}
