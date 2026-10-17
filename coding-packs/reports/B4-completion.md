# B4 — Upload, sự kiện, dự án, nhà đầu tư, dashboard (TIP-B30 → B34) — DONE

- Nhánh: `main` (agent chính làm tuần tự)
- SHA cuối của code pha: `c381db8` (cổng B4 + báo cáo commit sau, SHA ở commit message)
- Ngày: 17/10/2026

## TIP

| TIP | Nội dung | Commit |
|---|---|---|
| — | Schema event / project / investor + covering / partial index | `4201e08` |
| — | TIP-B30 → B34 | `2eb9bd1` |
| B30 | `UPLOAD_KINDS` thêm `project-cover`, `team-avatar`, `event-cover`; `ImageRefService`: data URL ảnh (FE hiện tại) hoặc object storage của chính người gửi, kiểm `head` (MIME + 5MB), gọi ngoài transaction | `2e8d61f` |
| B31 | Lịch `/events` (day/time giờ VN, `registeredByMe` 1 query), đăng ký khoá `events FOR UPDATE` + `registrationOpen` (Q-G5a-5) + đăng ký lại sau huỷ, outbox `event.registered` → thông báo; Admin CRUD + check-in + xuất CSV, audit `content` | `ab2de90` |
| B32 | Khám phá BR-08 (404 khi không thấy), deferred join, sort new/follow/name, lọc lĩnh vực/giai đoạn/gọi vốn/q; lưu D-18 (sanitize HTML bằng DOMPurify+jsdom); theo dõi/góp ý/like/trả lời/xử lý/repo/chia sẻ (qua `MessageService`); Admin duyệt `WHERE status=<from>`, bulk, xoá mềm, nổi bật (UQ partial), counts | `55b8309`, `d5701b9` |
| B33 | Quan tâm đầu tư Idempotency-Key + UQ (BR-09), D-14 (Nhà đầu tư không cần phí), trao đổi + `sent → in_discussion`; Admin gom theo người trên `investor_summaries`, đổi trạng thái, ghi chú, xuất CSV, audit `project` | `5ce25f1`, `7550ce7` |
| B34 | `/dashboard/live`: số thật (nhóm, thành viên, online ZCOUNT Redis, tin hôm nay, chỗ sự kiện) + phần mô phỏng dùng chung MSW; cache Redis 10s | `c381db8` |

Dependency mới (server): `dompurify`, `jsdom` — đã có trong catalog (dùng ở `packages/ui` / test FE), cần để sanitize HTML mô tả dự án phía server. Kiểu tối thiểu cho jsdom ở `src/types/jsdom.d.ts` (không thêm `@types/jsdom`).

## Cổng kiểm B4

| Mục | Kết quả |
|---|---|
| `pnpm lint` | 8/8 task (FE còn 12 warning cũ, 0 error) |
| `pnpm typecheck` | 8/8 task |
| `pnpm test` (unit) | 6/6 task; server **52**, shared 73, admin 108, portal 84, ui 22, integrations **21/21** (S3 thật RustFS khi nạp `s3.env` + endpoint local) |
| `pnpm --filter @opchub/server test:int` | **155/155** (32 file) trên `opchub_test` + Redis db 2 |
| `pnpm depcheck` | 0 vi phạm (FE+packages 1036 module; server 408 module) |
| `pnpm build` | 3/3 task |
| **Cổng B4 đầu-cuối** | `test/gates/b4-events-projects-investors.int.spec.ts`: đăng ký sự kiện → đăng dự án gọi vốn (chờ duyệt, NĐT 404) → Admin duyệt + nổi bật → `/projects/stats.featured` → NĐT quan tâm 2 lần cùng key = 1 bản ghi → `myInterest` → chủ dự án thấy → Admin thấy nhà đầu tư đã gom |

### Test mới (31 tích hợp + 6 unit)

| Nhóm | Số test |
|---|---|
| uploads `ImageRefService` (unit) | 4 |
| sanitize HTML (unit) | 2 |
| event: Portal 5 · Admin 5 | 10 |
| project: Portal 6 · tương tác 4 · Admin 4 | 14 |
| investor | 4 |
| dashboard | 2 |
| cổng B4 | 1 |

## EXPLAIN — `reports/explain/` (dữ liệu tổng hợp trong transaction rồi ROLLBACK)

| Query | Plan | Thời gian |
|---|---|---|
| `/events` trang 50 (20k sự kiện) | Index Scan `events_upcoming` (covering) | 0.18 ms |
| `/events?mode=online` | Index Scan `events_mode_starts_at_idx` | 0.03 ms |
| `registeredByMe` một trang | Index Scan PK `event_registrations` | 0.13 ms |
| Admin danh sách đăng ký (35k đăng ký) | Bitmap Index Scan `(event_id, status, created_at)` | 0.57 ms |
| Khám phá sort=new (20k dự án) | Index Scan `projects_published_recent` (partial) | 0.05 ms |
| Khám phá sort=follow | Index Scan `projects_published_follow` (partial) | 0.02 ms |
| Admin hàng duyệt | Index Only Scan `projects_admin` | 0.09 ms |
| Admin tab Tất cả | Index Only Scan `projects_live_recent` | 0.05 ms |
| Admin counts 6 trạng thái | 6 × Index Only Scan `projects_admin` (đã sửa từ GROUP BY Seq Scan) | 2.4 ms |
| Admin nhà đầu tư lọc loại (22k quan tâm) | Index Scan `investor_summaries (kind, last_at)` (đã sửa từ GROUP BY 3 Seq Scan 100 ms) | 0.19 ms |
| Admin nhà đầu tư tab Tất cả | Index Scan `investor_summaries (last_at)` | 0.29 ms |
| Mục quan tâm theo trang | Bitmap Index Scan `(investor_key, created_at)` | 0.25 ms |

## Soát CODING RULE 1–15

| # | Kết quả |
|---|---|
| 1 Kích thước | Nguồn lớn nhất mới `project.repository.ts` 218, `event.repository.ts` 187; không file > 400 |
| 2 Không dồn code | 4 module mới (`event`, `project`, `investor`, `dashboard`) tách `controllers/ services/ repositories/ domain/`; project tách đọc / ghi / tương tác / Admin |
| 3 Test riêng | `*.spec.ts` (unit) + `test/**/*.int.spec.ts` |
| 4 TS strict / zod | 0 `any`, 0 `@ts-ignore`, 0 non-null; body/query/header qua zod `@opchub/shared`; thân quan tâm parse sau kiểm header (đúng thứ tự lỗi hợp đồng); cache Redis parse lại bằng schema |
| 5 Ranh giới | project → chat/uploads/account qua `index.ts`; investor → project qua `index.ts` (`visibleTo`); 0 `forwardRef`; depcheck xanh |
| 6 Permission key | Sự kiện `e.edit` / `e.reg` (Q-B31-1); dự án + nhà đầu tư `p.pub`; D-14 qua `@AllowAccountTypes('investor')` |
| 7 Postgres | Deferred join (sự kiện, khám phá, Admin dự án, đăng ký); partial index (khám phá, Admin, nổi bật UQ); covering `events_upcoming`; bảng tổng hợp thay GROUP BY; không query trong vòng lặp (chia sẻ gửi tuần tự qua MessageService — mỗi nhóm là một lệnh gửi tin có quyền + idempotent); 0 `$queryRawUnsafe` |
| 8 Transition | Đăng ký/huỷ `WHERE status`, duyệt dự án `WHERE status=<from>` (0 dòng → 409), bulk → `skipped`, quan tâm `sent → in_discussion` có điều kiện |
| 9 Outbox / ngoài tx | `event.registered` cùng transaction; kiểm ảnh storage (`head`) trước transaction |
| 10 Tiền/thời gian | Tiền BIGINT số nguyên theo đơn vị; timestamptz UTC, `day/time` hiển thị giờ VN |
| 11 Audit | event.create/update/delete/check_in/check_in_undo/registrants_export; project.approve/request_changes/reject/hide/republish/delete/feature/unfeature; investor.status/comment/export — cùng transaction |
| 12 Adapter | Storage qua `STORAGE` (adapter B13); không dịch vụ ngoài mới |
| 13 Secret/env | Không biến env mới; 0 `console.*` |
| 14 Chat | Chia sẻ dự án đi đúng đường `MessageService.send` (S-12 idempotent, rate limit, phát realtime); DTO Portal không `isSimulated` |
| 15 Git | Commit Conventional từng bước, đường dẫn cụ thể, đã push, `git status` sạch |

## Câu hỏi đã ghi (questions.md › Backend)

Q-B30-1, Q-B31-1 → 2, Q-B32-1 → 4, Q-B33-1 → 2, Q-B34-1. Không có mục L3.

## Chưa làm / chuyển pha sau

- Mail xác nhận đăng ký sự kiện + mail thay đổi sự kiện — consumer `event.registered` thêm ở **B41**.
- FE chuyển ảnh bìa/đội từ data URL sang presign (kind mới đã có) — **B60**.
- Seed demo theo prototype cho e2e (sự kiện e1–e5 + 7 người đăng ký e1, dự án p1–p10, bình luận k1–k7, quan tâm INV_SEED, người dùng ngoài MEMBERS: Phạm Thu Hà, Vũ Đức Long, Nguyễn Hoàng Nam, Trần Thị Mai) — **B62**.
- Dashboard: thay phần mô phỏng bằng dữ liệu thật (bot/thread) — **B45**; `weekly_active` nhóm — **B44** (scheduler `stats_daily`).
