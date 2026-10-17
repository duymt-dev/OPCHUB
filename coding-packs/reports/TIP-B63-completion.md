# TIP-B63 — Parity 205 màn trên server thật (hoàn thành, có deviation đã chốt)

## Kết quả (18/10/2026, build `ad52790`, MSW tắt)

```
cd e2e && PARITY_IDS='*' pnpm e2e:server --project parity
  345 passed · 33 failed (ảnh > 3%) · 20 skipped (unreachable) — 37.7m
```

Kết quả ghi riêng ở `reports/ui-parity/server/` (baseline MSW G6 ở `ui-parity/results.json` giữ nguyên — Q-B63-2).

| Khu | Màn | Đạt | Deviation | Unreachable | G6 (MSW) |
|---|---|---|---|---|---|
| Auth (A) | 30 | 27 | 0 | 3 | 27 / 0 / 3 |
| Portal (P) | 95 | 89 | 3 (P-05, P-67, P-68) | 3 | 91 / 1 / 3 |
| Admin (D) | 80 | 54 | 22 | 4 | 64 / 12 / 4 |
| **Tổng** | **205** | **170** | **25** | **10** | 182 / 13 / 10 |

`scripts/area-summary.ts` không báo màn nào lệch mà chưa có dòng deviation.

## So với G6: 12 màn lệch thêm, đều đã ghi deviation

**Chủ nhà chốt ngày 18/10/2026 (Q-B63-7):** giữ đúng hành vi của server, không đổi API hay schema cho giống mảng mẫu
của prototype. Vì vậy, ở chế độ server, mốc parity được hiểu là "không tụt thêm ngoài các deviation đã ghi".

| Deviation | Màn | % chênh server (MSW) | Nguyên nhân |
|---|---|---|---|
| DV-B63-1 | P-67, P-68 | 3,3–7,8 (≤ 0,5) | Liên hệ thật của chủ dự án là TK cá nhân, không bịa địa chỉ / SĐT |
| DV-B63-2 | D-07, D-08, D-10, D-11, D-13, D-14, D-15 | 3,1–5,0 (≤ 0,4) | Thành viên xếp `created_at DESC` (keyset/deferred join), prototype xếp theo mảng |
| DV-B63-3 | D-21 | 4,1 (0,15) | Bảng phí xếp `updated_at DESC` |
| DV-B63-4 | D-41 | 6,0 (0,9) | Hội thoại bot xếp `created_at DESC` |
| DV-B63-5 | D-46 | 5,1 (0,01) | Không có trường "tổ chức" cho TK cá nhân |
| DV-B63-6 | D-75 | 95 / 94 (0,2 / 11) | `audit_logs` chỉ INSERT, nên giữ cả dòng do các lượt e2e trước tạo ra |

13 deviation có từ G6 (P-05, D-32, D-65 → D-74) cho cùng con số như MSW, chênh nhau không quá ±0,2 điểm.

## Đã sửa trong B63 (trước đó lệch, nay đạt)

| Màn | Sửa | Commit |
|---|---|---|
| Tổng quan Admin (sparkline, biểu đồ) | Seed `stats_daily` 7 tháng từ `OVERVIEW_FIXTURE` dùng chung — Q-B63-1 | `4f58cd2` |
| Ảnh bị lẫn dữ liệu lượt trước, chụp trước khi API trả về | Parity reset dữ liệu mỗi test; `settle()` đợi `networkidle` — Q-B63-3 | `4f58cd2` |
| P-27, P-47 (chủ nhóm rời nhóm), P-05 (TK chưa đóng phí) | Thêm bước server: chuyển chủ nhóm, CK ngân hàng giả rồi đợi outbox | `f139e4b` |
| D-31 (số thành viên trong hộp xuất) | Đếm thành viên thật bằng `GROUP BY` — Q-B63-4 | `a7e835e` |
| P-62 → P-66, P-69, P-71, P-72 (liên hệ dự án DN) | Seed địa chỉ hồ sơ DN theo prototype | `a2a3a12` |

## Chưa làm

- Muốn khớp 182 trên server thì phải đổi thứ tự API, thêm trường tổ chức / địa chỉ cho TK cá nhân. Hướng này không
  làm theo quyết định Q-B63-7.
