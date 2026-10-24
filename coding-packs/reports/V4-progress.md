# V4 — tiến độ (agent cập nhật sau mỗi TIP)

| # | TIP | Nhánh | SHA | PR | Test | Parity | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | V4-601 phí 3 gói | feature/TIP-V4-601-fee-3-plans (từ dev) | ac178a06 | [#17](https://github.com/duymt-dev/OPCHUB/pull/17) | int 131/131 · e2e 285/0/4 | 24/29 đạt; DV-V4-601-1..3 | P-81/82 đo lại sau V4-606 |
| 2 | V4-606 menu §27.3 + quyền | feature/TIP-V4-606-menu-perms (chồng 601) | ce1d52c5 | [#18](https://github.com/duymt-dev/OPCHUB/pull/18) | int 131/131 · e2e 285+fix | shell 7/7 đạt; DV-V4-606-1..5 | Marketing chỉ gỡ sidebar + lịch |
| 3 | V4-603 vào nhóm ngay | feature/TIP-V4-603-group-join-instant (chồng 606) | ce607561 | [#19](https://github.com/duymt-dev/OPCHUB/pull/19) | db 26/26 · srv 1304/1306→fix · e2e 286/1/4 | D-28/D-30 đạt; DV-V4-603-1..6 | Q-V4-603-4 nhóm ngành + NQ86 |
| 4 | V4-604 NĐT danh sách | feature/TIP-V4-604-investor-list (chồng 603) | 4b1a63b6 | [#20](https://github.com/duymt-dev/OPCHUB/pull/20) | db 29/29 · srv 1285/1286→fix 11/11 · e2e 285/0/4 | D-58/59/60 đạt; DV-V4-604-1..2 | P-69..72 đo lại ở V4-610 |
| 5 | V4-605 YC dịch vụ phiếu | feature/TIP-V4-605-service-tickets (chồng 604) | a32add38 | [#21](https://github.com/duymt-dev/OPCHUB/pull/21) | db 10/10 · srv phạm vi 745/748→fix 15/15, 67/67 · e2e phạm vi 37/37 | D-61/62/63/65, P-79/80/83 đạt; DV-V4-605-1..2 | Q-V4-605-1..4 |
| 6 | V4-602 hoa hồng phí thực trả | feature/TIP-V4-602-commission-actual-fee (chồng 605) | 955fabc0 | [#22](https://github.com/duymt-dev/OPCHUB/pull/22) | db 21/21 · srv phạm vi 189/189 · e2e phạm vi 79/79 (lần 1 78/79) | 34/38 đạt; DV-V4-602-1..3 | Q-V4-602-1..4; grep 600000 P1 đạt |
| 7 | V4-607 khai báo sau đăng nhập | feature/TIP-V4-607-declaration (chồng 602) | af5079fc | [#23](https://github.com/duymt-dev/OPCHUB/pull/23) | db 35/35 · srv phạm vi 141/141 + 97/97 · e2e phạm vi 97/0/4 | P-100..102 đạt; DV-V4-607-1..2 | Q-V4-607-1..5; màn auth đo lại V4-615 |
| 8 | V4-610 Gói Gọi vốn | feature/TIP-V4-610-fundraising-plan (chồng 607) | 26d08a1c | [#24](https://github.com/duymt-dev/OPCHUB/pull/24) | db 38/38 · srv phạm vi 183/183 · e2e phạm vi 66/66 | P-103/D-92 đạt, P-104 1440 đạt; DV-V4-610-1..4 | Q-V4-610-1..6; P-69..72 unreachable (lỗi prototype) |
| 9 | V4-608 Gian hàng địa phương | feature/TIP-V4-608-local-stores (chồng 610) | fc71382a | [#25](https://github.com/duymt-dev/OPCHUB/pull/25) | db 43/43 · srv phạm vi 59/59 · e2e phạm vi 64/64 | 11/14 đạt, P-110 unreachable; DV-V4-608-1..3 | Q-V4-608-1..7; `seed:demo --stores` đủ 17 gian hàng |
