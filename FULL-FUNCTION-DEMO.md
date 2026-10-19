# Demo tương tác đầy đủ

Bản này giữ nguyên nội dung và bố cục chính, đồng thời kích hoạt toàn bộ menu trong 4 demo bằng dữ liệu mô phỏng lưu trên trình duyệt (`localStorage`). Không có dữ liệu demo nào được gửi đến Google Sheets hoặc máy chủ.

## Chức năng đã bổ sung

- **Nghỉ phép:** tạo đơn, xem chi tiết, hủy, duyệt, từ chối, lọc trạng thái, xem lịch sử và xuất CSV.
- **Thời gian làm việc:** ghi nhận báo cáo ngày, check-in/check-out, thêm/xóa/hoàn tất công việc, tính tiến độ và xuất báo cáo CSV.
- **Cuộc họp:** tạo lịch, xem lịch họp, mở chi tiết, mô phỏng tham gia, sao chép thông tin, quản lý thành viên, lưu và xuất biên bản TXT.
- **Tăng ca:** tạo đề nghị, xem chi tiết, hủy, duyệt, từ chối, tổng hợp số giờ và xuất CSV.
- Hỗ trợ bàn phím, thông báo xác nhận, cửa sổ chi tiết và giao diện responsive cho máy tính/điện thoại.

## File đã thay đổi

- `public/assets/demo-interactive.js`: phát sự kiện sau khi gửi form để đồng bộ dữ liệu sang các màn hình con.
- `public/demo/leave/index.html`
- `public/demo/time/index.html`
- `public/demo/meeting/index.html`
- `public/demo/overtime/index.html`

## File mới

- `public/assets/demo-full-functions.js`
- `public/assets/demo-full-functions.css`

## Triển khai

Giữ nguyên cấu trúc thư mục và cấu hình thư mục đầu ra của Cloudflare Pages là `public`.
