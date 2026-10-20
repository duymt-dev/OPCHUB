# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: behavior\affiliate-concurrent.spec.ts >> REQ-308 REQ-410 concurrent tabs preserve both agent writes across origins and reload
- Location: behavior\affiliate-concurrent.spec.ts:16:1

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: locator.fill: Test timeout of 120000ms exceeded.
Call log:
  - waiting for getByPlaceholder('Tìm tên, mã giới thiệu, email...')

```

# Page snapshot

```yaml
- generic [active] [ref=f2e1]:
  - alert [ref=f2e2]: Chào mừng trở lại
  - generic [ref=f2e3]:
    - generic [ref=f2e4]:
      - generic [ref=f2e5]:
        - img "OPC HUB ASEAN – One Person Company Hub" [ref=f2e6]
        - generic [ref=f2e7]:
          - generic [ref=f2e9]: "0"
          - generic [ref=f2e10]: thành viên đang trực tuyến
      - generic [ref=f2e11]:
        - generic [ref=f2e12]: CỘNG ĐỒNG DOANH NGHIỆP MỘT NGƯỜI · ASEAN
        - generic [ref=f2e13]: Kết nối, học hỏi và cùng phát triển với founder khắp ASEAN.
        - generic [ref=f2e14]: "Một nền tảng cho founder, freelancer và chuyên gia từ 10 quốc gia: chat nội bộ theo nhóm, sự kiện hằng tuần và dự án công khai."
      - generic [ref=f2e20]:
        - generic [ref=f2e21]: "+22"
        - generic [ref=f2e22]: thành viên mới tháng này
      - generic [ref=f2e23]:
        - generic [ref=f2e24]:
          - generic [ref=f2e25]: "65"
          - generic [ref=f2e26]: Thành viên
        - generic [ref=f2e27]:
          - generic [ref=f2e28]: "34"
          - generic [ref=f2e29]: Cộng đồng
        - generic [ref=f2e30]:
          - generic [ref=f2e31]: "0"
          - generic [ref=f2e32]: Sự kiện mỗi năm
      - generic [ref=f2e34]:
        - generic [ref=f2e35]: “Nhờ OPC Hub, mình tìm được kế toán, cộng tác viên và cả khách hàng đầu tiên chỉ trong tháng đầu tham gia.”
        - generic [ref=f2e36]: Lê Minh Anh · Founder LeadPilot · Việt Nam
      - generic [ref=f2e37]:
        - generic [ref=f2e38]:
          - generic [ref=f2e39]: Có mặt tại
          - generic [ref=f2e40]:
            - img "VN" [ref=f2e41]
            - img "TH" [ref=f2e42]
            - img "ID" [ref=f2e43]
            - img "MY" [ref=f2e44]
            - img "PH" [ref=f2e45]
            - img "SG" [ref=f2e46]
            - img "MM" [ref=f2e47]
            - img "KH" [ref=f2e48]
            - img "LA" [ref=f2e49]
            - img "BN" [ref=f2e50]
        - generic [ref=f2e51]: © 2026 OPC Hub ASEAN
    - generic [ref=f2e52]:
      - generic [ref=f2e53]:
        - generic [ref=f2e54]:
          - text: Cần hỗ trợ?
          - link "Liên hệ" [ref=f2e55] [cursor=pointer]:
            - /url: "#"
        - button "Tiếng Việt" [ref=f2e57] [cursor=pointer]
      - generic [ref=f2e64]:
        - generic [ref=f2e65]:
          - heading "Chào mừng trở lại" [level=1] [ref=f2e66]
          - generic [ref=f2e67]: Đăng nhập để tiếp tục với cộng đồng OPC Hub ASEAN.
        - tablist [ref=f2e68]:
          - tab "Đăng nhập" [selected] [ref=f2e69] [cursor=pointer]
          - tab "Đăng ký" [ref=f2e70] [cursor=pointer]
        - generic [ref=f2e71]:
          - generic [ref=f2e72]:
            - text: Email
            - textbox "Email" [ref=f2e77]:
              - /placeholder: email@domain.com
          - generic [ref=f2e78]:
            - text: Mật khẩu
            - generic [ref=f2e79]:
              - textbox "Mật khẩu Hiện" [ref=f2e83]:
                - /placeholder: Mật khẩu
              - button "Hiện" [ref=f2e85] [cursor=pointer]
          - generic [ref=f2e86]:
            - generic [ref=f2e87] [cursor=pointer]:
              - checkbox "Ghi nhớ đăng nhập" [checked] [ref=f2e89]
              - generic [ref=f2e90]: Ghi nhớ đăng nhập
            - button "Quên mật khẩu?" [ref=f2e91] [cursor=pointer]
          - button "Đăng nhập" [ref=f2e92] [cursor=pointer]
        - generic [ref=f2e94]: hoặc tiếp tục với
        - generic [ref=f2e97]:
          - button "Google" [ref=f2e98] [cursor=pointer]
          - button "Facebook" [ref=f2e105] [cursor=pointer]
          - button "LinkedIn" [ref=f2e110] [cursor=pointer]
          - button "ChatGPT" [ref=f2e115] [cursor=pointer]
          - button "Gemini" [ref=f2e125] [cursor=pointer]
          - button "DeepSeek" [ref=f2e129] [cursor=pointer]
        - generic [ref=f2e134]:
          - generic [ref=f2e135]: Điều khoản
          - generic [ref=f2e136]: Bảo mật
```

# Test source

```ts
  1  | import { expect, type Page } from '../../server/test';
  2  | import { ADMIN_URL } from '../../urls';
  3  |
[REDACTED LINE]
  5  |   await page.goto(`${origin}/login`);
  6  |   await page.locator('input[type=email]').fill(email);
[REDACTED LINE]
  8  |   await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  9  |   await expect(page).not.toHaveURL(/\/login$/);
  10 |   await page.goto(`${origin}/affiliate`);
  11 | }
  12 |
  13 | export async function openAffiliateDetail(page: Page, code: string, name: string) {
  14 |   await page.goto(`${ADMIN_URL}/affiliate?tab=aff`);
> 15 |   await page.getByPlaceholder('Tìm tên, mã giới thiệu, email...').fill(code);
     |                                                                   ^ Error: locator.fill: Test timeout of 120000ms exceeded.
  16 |   await page.getByRole('link', { name, exact: true }).click();
  17 | }
  18 |
```
