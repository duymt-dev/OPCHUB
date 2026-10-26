# V4-P5 — Parity v4 + Nghiệm thu §27 — completion

- TIP của pha: V4-615 (parity v4), V4-616 (nghiệm thu §27). Cả hai có completion + SHA + PR (xem `V4-progress.md`).
- PR xếp chồng, chưa merge: #31 (615) → #32 (616).
- HEAD đo pha: nhánh `feature/TIP-V4-616-acceptance-27`, SHA `8aa8d8d8`.

## Chạy toàn bộ một lần (số thật, 26/10/2026)

| Bộ | Kết quả | Thời gian |
|---|---|---|
| `pnpm test:int` (turbo, concurrency 1) | server 141 file / **1386/1386**; db 16 file / **51/51**; 0 failed | 14,8 phút |
| `pnpm e2e` MSW (`--project=behavior`, build MSW Portal + Admin tại HEAD, cổng 3020 / 3021, 5 worker) | 309 test: **305 passed · 0 failed · 4 skipped** | 12,4 phút |
| `e2e:server --project behavior` (server dev thật, `V4-acceptance.md`) | lần 1: 291 passed · 9 failed · 9 skipped; lần 2 (8 file lỗi, sau khi sửa): **37/37 passed** | 53,8 + 3,9 phút |

- 4 skip của MSW là `tax-lookup-dlpl.spec.ts` (stub DLPL chỉ có ở server + `@live`), có từ trước V4.
- 9 skip của server đều có bằng chứng int thay thế (bảng trong `V4-acceptance.md`).
- Không dùng retries / fixme, không nới timeout hay assertion.

## Lỗi lan và cách sửa

- MSW: không có lỗi lan.
- Server dev, lần 1 lỗi 9 test:
  - 1 lỗi code thật: đăng ký không lưu `opcIntent`. Sửa ở `17d6173c`, có test int.
  - 1 lỗi hướng dẫn build (cờ tài khoản dùng thử). Sửa ở `f5cc81ff`.
  - 4 kịch bản chưa theo luật server thật (402 chưa đóng phí, 409 sự kiện đã kết thúc, bot tự động, secret HMAC). Sửa ở `8aa8d8d8`, không nới assertion.
  - 1 lỗi do khởi động lại API giữa test.
  - Lần 2 pass hết.

## Cổng kiểm pha P5

**1. Parity v4 toàn bộ — Đạt (V4-615, có DV chờ duyệt)**

- `results.md` đo lại toàn bộ trên prototype v4 tại `8a5fa5e6` (+ Admin `d73b4a90`):
  - 234/434 ảnh đạt;
  - 98/223 màn đạt cả hai khung;
  - 43 màn unreachable, có lý do.
- Mọi màn > 3% có DV-V4-615-1..12, chờ owner duyệt.

**2. Nghiệm thu §27 100% trên server dev — Đạt (V4-616)**

- 14 UP + 12 AD (+ AD-08b) + 9 F, mỗi mã có test hành vi pass trên server dev.
- AD-08 / F03 có thêm int Postgres thật.
- Chi tiết ở `V4-acceptance.md`.

**3. Cổng chung — Đạt** (HEAD `8aa8d8d8`)

- lint 0 lỗi, typecheck sạch, depcheck sạch (1947 + 852 module).
- Unit: ui 49 · admin 453 · server 225 · portal 397 · integrations 86 (+2 skip) · shared 395.
- Build: server, Portal + Admin (MSW và `.next-server`).

**4. Native HOLD**

- Sau khi đo đã chạy lại `seed:demo` + `flush:dev-cache` trên `opchub_dev` / Redis db 1.

## Chờ owner

- Duyệt DV-V4-615-1..12; Q-V4-615-1..5; Q-V4-616-1..2.
- Merge chuỗi PR #17 → #32.
