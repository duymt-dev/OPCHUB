# Code structure

## Giới hạn dòng (cứng)

| Loại file | Tối ưu | Trần |
|---|---|---|
| Backend (`apps/api`, `apps/socket`, `apps/worker`, `packages/*`) | 200–400 | **600**. Chạm 500 thì tách thành thư mục con theo domain |
| Frontend (`apps/portal`, `apps/admin`, `packages/ui`) | 150–250 | **400** |

- Page/screen chỉ ghép component và hook. Modal, drawer, popover, sub-view phải tách vào `components/`; hook vào `hooks/`; type vào `types.ts`.
- Một file một trách nhiệm. Không gộp domain khác nhau (vd. phí + nhóm) vào cùng file.

## Đặt tên

| Thứ | Quy ước | Ví dụ |
|---|---|---|
| File, thư mục | kebab-case | `membership-fee.service.ts`, `paywall-modal.tsx` |
| Class, React component, type, interface | PascalCase | `MembershipService`, `PaywallModal` |
| Biến, hàm | camelCase, động từ cho hàm | `getActiveMembers`, `isExpired` |
| Hằng số module | UPPER_SNAKE | `OTP_TTL_SECONDS` |
| Bảng, cột DB | snake_case (Prisma `@@map`/`@map`) | `group_members.decided_by` |
| Giá trị enum | snake_case tiếng Anh | `pending_payment`, `in_review` |

Tên nghiệp vụ theo [domain-glossary](domain-glossary.md).

## TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`.
- Cấm `any`, `@ts-ignore`, `@ts-expect-error` (trừ test có ghi lý do). Dữ liệu chưa rõ kiểu dùng `unknown` rồi parse bằng zod.
- Cấm non-null `!` ngoài test.
- Type suy ra từ zod schema (`z.infer`), không khai báo song song hai lần.
- Không default export, trừ file Next.js bắt buộc (`page`, `layout`, `route`, …).

## Import

- Package nội bộ: `@opchub/shared`, `@opchub/db`, `@opchub/ui`, `@opchub/integrations`.
- Trong app dùng alias `@/`. Không dùng `../../..` quá 2 cấp.
- Không import chéo giữa các app. Code dùng chung phải đưa vào `packages/`.

## Comment

- Comment giải thích **vì sao**, không giải thích code đang làm gì.
- Trích mã quy tắc khi code hiện thực một rule: `// BR-05: gia hạn nối tiếp ngày hết hạn hiện tại`.
- `TODO` phải kèm mã: `// TODO(OQ-06): chờ chốt nhà cung cấp webhook`.
- Không để code đã comment out.

## Lỗi và log

- Không nuốt lỗi (`catch {}`). Hoặc xử lý có chủ đích, hoặc ném tiếp kèm ngữ cảnh.
- Lỗi nghiệp vụ dùng class lỗi có `code` thuộc enum error code trong `packages/shared`.
- Cấm `console.*`. Backend dùng `nestjs-pino`, frontend dùng `logger` của app.
- Log có `requestId`, `userId`. Không log: mật khẩu, OTP, token, secret, nội dung chuyển khoản đầy đủ, CCCD. SĐT/email phải che (`09****678`).
