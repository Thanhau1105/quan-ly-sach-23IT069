# Quản lý sách trên MongoDB Atlas

Trần Thành Hậu — **23IT069**.

- Database: `DB_23IT069`
- Tiền tố mã sách: `069` (giữ nguyên số 0 đầu)
- VAT: `(9 + 6)% = 15%`
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

## Chức năng

- Đọc collection `Books` bằng tài khoản chỉ đọc; thêm sách bằng tài khoản chỉ ghi.
- Từ chối mã không bắt đầu bằng `069`. VAT 15% tính ở server, giá sau thuế làm tròn đến đồng.
- Handlebars hiển thị giá trước/sau thuế và footer Trần Thành Hậu / 23IT069 / VAT 15%.
- Session lưu trong Atlas bằng custom store: get dùng readDb; set/touch/destroy dùng writeDb.
- Cookie chỉ giữ ID phiên; không dùng MemoryStore trong ứng dụng. CSRF token bảo vệ biểu mẫu.
- Trang này là bài demo chức năng, chưa có đăng nhập người dùng; người truy cập có thể thêm sách.

## Kiểm tra

`npm test`: chạy test local với database giả lập, không kết nối hoặc thay đổi Atlas. Kiểm tra tiền tố, VAT, dữ liệu sai, CSRF, trùng mã, escape HTML, hết hạn và dùng chung phiên giữa hai app.

`npm run check:atlas`: kiểm tra kết nối thật và quyền đọc Books. Không chứng minh quyền ghi hoặc quyền bị cấm.

`npm run check:permissions`: xác nhận tài khoản đọc bị chặn khi insert và tài khoản ghi bị chặn khi find. Bản ghi kiểm tra tạm trong sessions được dọn tự động nếu thao tác insert ngoài ý muốn thành công.

Kiểm tra thủ công trên trình duyệt:
1. Chạy `npm start`, mở http://localhost:3000.
2. Thêm một mã mới bắt đầu bằng `069`, giá `100000`: VAT 15%, sau thuế 115000 đồng.
3. Thử `123-S001`: bị từ chối; thử mã đã có: báo trùng.
4. Mở Thông tin kiểm tra phiên, ghi lại mã; Ctrl+C rồi npm start, refresh cùng trình duyệt: mã giữ nguyên.
5. Kiểm tra tài liệu sách và sessions trên Atlas.

## Triển khai (chưa thực hiện)

- GitHub repository Private; mời đúng tài khoản giảng viên.
- Render Web Service: branch main; build `npm ci`; start `npm start`; health `/health`.
- Environment: STUDENT_NAME, STUDENT_ID, MONGODB_READ_URI, MONGODB_WRITE_URI, SESSION_SECRET, NODE_ENV=production.
- Mọi instance dùng chung SESSION_SECRET và kho Atlas. Chọn dịch vụ không ngủ nếu yêu cầu 24/7.
- Không đưa `.env`, ảnh mật khẩu hoặc URI thật vào repository.
