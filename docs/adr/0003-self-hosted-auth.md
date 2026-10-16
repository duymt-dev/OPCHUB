# ADR-0003: Auth tự viết trong NestJS, không Keycloak

- Status: Accepted
- Date: 2026-10-16

## Context
Luồng đăng ký có OTP email, tra MST, paywall, vai trò ngữ cảnh Chủ nhóm. Keycloak phải viết SPI/theme và thêm một service Java.

## Decision
passport (Google/Facebook/LinkedIn), JWT access 15 phút + refresh 7 ngày xoay vòng trong cookie httpOnly, argon2id, TOTP cho Admin.

## Consequences
Ít hạ tầng, kiểm soát toàn bộ luồng. Tự chịu trách nhiệm bảo mật auth → test bắt buộc và review kỹ.
