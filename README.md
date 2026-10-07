# Quản lý sách trên MongoDB Atlas

Trần Thành Hậu — **23IT069**.

- Database: `DB_23IT069`
- Tiền tố mã sách: `069` (giữ nguyên số 0 đầu)
- VAT: `(9 + 5)% = 14%`
- Node.js 24; Express; Handlebars; MongoDB Atlas.

## Chạy trên máy

```powershell
npm ci
Copy-Item .env.example .env
# Điền hai URI và SESSION_SECRET trong .env, không đưa file này lên Git.
npm start
```

Mở http://localhost:3000. Cấu hình Atlas được ghi trong `docs/ATLAS.md`.

## Lịch sử phát triển

Hai nhánh `feature/database` và `feature/session` được merge bằng `--no-ff` để giữ merge node.

```powershell
git log --graph --oneline --all --decorate
```
