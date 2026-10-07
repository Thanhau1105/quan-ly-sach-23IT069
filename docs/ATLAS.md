# Cấu hình Atlas cho Trần Thành Hậu — 23IT069

Database `DB_23IT069`; collections `Books` (B hoa), `sessions` (chữ thường).

| User | Collection | Actions |
|---|---|---|
| read_23IT069 | Books | find |
| read_23IT069 | sessions | find |
| write_23IT069 | Books | insert |
| write_23IT069 | sessions | insert, update, remove |

Không gắn role readWrite hoặc admin cho hai user ứng dụng.

Index đã hướng dẫn tạo bằng Atlas:
- Books: `{code: 1}`, unique = true.
- sessions: `{expiresAt: 1}`, expireAfterSeconds = 0.

Atlas Network Access cần cho phép IP máy chạy ứng dụng. Khi deploy, thêm các dải outbound IP của dịch vụ hosting.

URI được đặt trong `.env` ở local và Environment trên hosting. Không commit mật khẩu. Password có ký tự đặc biệt cần percent-encode trong URI.
