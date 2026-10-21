# Trạng thái bản dịch Portal (D-65, TIP-V2-117)

Nguồn: `vi/`. Các bộ khác do **AI dịch**, cần người bản xứ soát trước khi coi là chính thức.
`en-SG` dùng `en/`, `ms-BN` dùng `ms/` (theo `LANGS.dict`). Khoá thiếu khi chạy → rơi về tiếng Việt.
Kiểm tự động: `apps/portal/src/i18n/messages.spec.ts` (đủ khoá, giữ biến `{x}` + thẻ, ICU hợp lệ, không rỗng, không quên dịch).

| Bộ    | Ngôn ngữ         | Người dịch | Đã soát | Độ tin cậy máy dịch |
| ----- | ---------------- | ---------- | ------- | ------------------- |
| `en`  | English          | AI         | chưa    | cao                 |
| `id`  | Bahasa Indonesia | AI         | chưa    | cao                 |
| `ms`  | Bahasa Melayu    | AI         | chưa    | cao                 |
| `th`  | ภาษาไทย          | AI         | chưa    | trung bình          |
| `zh`  | 简体中文         | AI         | chưa    | cao                 |
| `fil` | Filipino         | AI         | chưa    | trung bình          |
| `km`  | ភាសាខ្មែរ        | AI         | chưa    | **thấp**            |
| `lo`  | ພາສາລາວ          | AI         | chưa    | **thấp**            |
| `my`  | မြန်မာဘာသာ       | AI         | chưa    | **thấp**            |

## Thuật ngữ nguồn

| Tiếng Việt                              | Ghi chú                                                                                                                 |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Thành viên, Phí thành viên, Gói dịch vụ | member, membership fee, service package                                                                                 |
| Cộng đồng, Nhóm, Chủ nhóm, Chat nhóm    | community, group, group owner, group chat                                                                               |
| Sự kiện, Dự án OPC, Nhà đầu tư, Gọi vốn | event, OPC project, investor, fundraising                                                                               |
| Hoa hồng, Mã giới thiệu                 | commission, referral code                                                                                               |
| Không dịch                              | OPC Hub, OPCHUB, OPC, Google, ChatGPT, Gemini, DeepSeek, Facebook, LinkedIn, Zalo, SePay, Vietcombank, ASEAN, VND, ₫, đ |

Khi soát xong một bộ: đổi cột "Đã soát" thành tên người soát + ngày.
