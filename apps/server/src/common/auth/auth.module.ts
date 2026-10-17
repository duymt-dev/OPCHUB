import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AccessTokenService } from './access-token';
import { AuthStateService } from './auth-state.service';
import {
  AccountStatusGuard,
  GroupRoleGuard,
  JwtAuthGuard,
  MembershipFeeGuard,
  PermissionGuard,
} from './guards';

/** Token + trạng thái phiên — mọi process (socket handshake dùng AccessTokenService) */
@Global()
@Module({
  providers: [AccessTokenService, AuthStateService],
  exports: [AccessTokenService, AuthStateService],
})
export class AuthCoreModule {}

/**
 * Guard toàn cục cho process api. APP_GUARD chạy theo thứ tự khai báo.
 * `GROUP_ROLE_PORT` do CommunityCoreModule (Global) cung cấp — process api phải import nó.
 */
@Module({
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: AccountStatusGuard },
    { provide: APP_GUARD, useClass: MembershipFeeGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_GUARD, useClass: GroupRoleGuard },
  ],
})
export class AuthGuardsModule {}
