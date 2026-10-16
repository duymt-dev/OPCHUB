# Code structure

## Giới hạn dòng (cứng, ESLint `max-lines` chặn)

| Loại file | Tối ưu | Trần |
|---|---|---|
| Backend (`apps/server`, `packages/*` trừ `ui`) | 200–400 | **600**. Chạm 500 thì tách thư mục con theo domain |
| Frontend (`apps/portal`, `apps/admin`, `packages/ui`) | 150–250 | **400** |
| Hàm | ≤ 80 dòng | |

- Page/screen chỉ ghép component và hook. Modal, drawer, popover, sub-view tách vào `components/`; hook vào `hooks/`; type vào `types.ts`.
- Một file một trách nhiệm. Không gộp domain khác nhau vào cùng file.
- Prisma schema và file dịch next-intl cũng tách theo domain, không để một file khổng lồ.

## Ranh giới (ép bằng `pnpm depcheck`)

```
apps/portal, apps/admin  ──►  packages/ui, packages/shared
apps/server              ──►  packages/db, packages/shared, packages/integrations
packages/*               ──✗  apps/*
apps/X                   ──✗  apps/Y
modules/A                ──►  modules/B/index.ts  (chỉ public API)
features/A (FE)          ──✗  features/B/** nội bộ
```

## Đặt tên

| Thứ | Quy ước | Ví dụ |
|---|---|---|
| File, thư mục | kebab-case | `membership-fee.service.ts`, `paywall-modal.tsx` |
| Class, React component, type | PascalCase | `MembershipFeeService`, `PaywallModal` |
| Biến, hàm | camelCase, động từ cho hàm | `getActiveMembers`, `isExpired` |
| Hook | `use` + PascalCase, file `use-xxx.ts` | `useRoomMessages` |
| Hằng số module | UPPER_SNAKE | `OTP_TTL_SECONDS` |
| Bảng, cột DB | snake_case, bảng số nhiều | `group_members.decided_by` |
| Giá trị enum | snake_case tiếng Anh | `pending_payment` |
| Hậu tố file NestJS | `.module` `.controller` `.service` `.repository` `.gateway` `.processor` `.guard` `.dto` `.state` | |

Tên nghiệp vụ theo [domain-glossary](domain-glossary.md).

## TypeScript

- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`.
- Cấm `any`, `@ts-ignore`, non-null `!` (test được dùng `@ts-expect-error` kèm lý do).
- Type suy từ zod (`z.infer`), không khai báo song song.
- Không default export, trừ file Next.js bắt buộc (`page`, `layout`, `route`, `error`, `loading`, `not-found`).
- Mỗi module/feature có `index.ts` export public API; bên ngoài chỉ import qua đó.

## Import

- Package nội bộ: `@opchub/shared`, `@opchub/db`, `@opchub/ui`, `@opchub/integrations`.
- Trong app dùng alias `@/`. Không `../` quá 2 cấp.
- Thứ tự: thư viện ngoài → `@opchub/*` → `@/` → tương đối (eslint tự sắp).

## Comment

- Comment giải thích **vì sao**, không giải thích code làm gì.
- Trích mã rule khi hiện thực: `// BR-05: gia hạn nối tiếp ngày hết hạn hiện tại`.
- `TODO` phải kèm mã: `// TODO(OQ-06): chờ chốt nhà cung cấp webhook`.
- Không để code comment out.

## Lỗi và log

- Không nuốt lỗi (`catch {}`). Xử lý có chủ đích, hoặc ném tiếp kèm ngữ cảnh.
- Lỗi nghiệp vụ là class có `code` thuộc enum error code trong `packages/shared`.
- Cấm `console.*`. Backend `nestjs-pino`; frontend `logger` của app.
- Log có `requestId`, `userId`. Không log mật khẩu, OTP, token, secret, nội dung chuyển khoản đầy đủ; SĐT/email phải che (`09****678`).
