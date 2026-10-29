-- TIP-V42-704 (D-113 F4): email biên nhận khi kích hoạt phí thành viên và khi thanh toán Gói Gọi vốn.
ALTER TYPE "mail_kind" ADD VALUE IF NOT EXISTS 'receipt';
