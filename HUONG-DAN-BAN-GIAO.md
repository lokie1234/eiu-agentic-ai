# TÀI LIỆU HƯỚNG DẪN BÀN GIAO & DEPLOY HỆ THỐNG
## (Google Sheet + Google Apps Script + Cloudflare Pages/Worker)

Tài liệu này dành cho **người tiếp nhận mới** (sử dụng tài khoản Google / email mới) để thiết lập và vận hành độc lập toàn bộ hệ thống gồm:
1. **Google Sheets**: Nơi lưu trữ data đăng ký.
2. **Google Apps Script**: Backend xử lý nghiệp vụ, tính học phí, chống trùng, tạo mã EIUAA, gửi email xác nhận.
3. **Cloudflare Pages + Worker**: Frontend giao diện tĩnh kèm API reverse proxy bảo mật.

---

## TỔNG QUAN LUỒNG HOẠT ĐỘNG
```
[Trình duyệt người dùng]
         │ (POST dữ liệu đăng ký)
         ▼
[Cloudflare Pages / _worker.js]
         │ (Xác thực APPS_SCRIPT_API_KEY + chuyển tiếp)
         ▼
[Google Apps Script (Web App /exec)]
         ├─► Ghi dữ liệu vào [Google Sheet của Email mới]
         └─► Gửi email xác nhận từ [Hộp thư Gmail của Email mới]
```

---

## BƯỚC 1: TẠO GOOGLE SHEET (TRÊN EMAIL MỚI)

1. Đăng nhập vào tài khoản Google (email mới sẽ quản trị hệ thống).
2. Tạo một Google Sheet mới (hoặc tạo bản sao từ Google Sheet cũ):
   - Đặt tên file, ví dụ: `Đăng ký Khóa học EIU Agentic AI`.
   - Trang tính đầu tiên có thể để tên mặc định là `Sheet1` hoặc `Trang tính1` (chưa cần tạo cột, script sẽ tự động tạo cấu trúc).

---

## BƯỚC 2: CẤU HÌNH GOOGLE APPS SCRIPT (TỰ ĐỘNG LIÊN KẾT SHEET)

1. **Mở Apps Script từ Google Sheet**:
   - Trên thanh menu của Google Sheet vừa tạo, chọn **Tiện ích mở rộng (Extensions)** > **Apps Script**.
   - *(Lưu ý: Mở theo cách này thì Apps Script sẽ tự động gắn liền với Google Sheet, bạn không cần phải copy hay cấu hình ID Sheet nào cả).*
2. Đổi tên dự án Apps Script thành: `EIU Agentic AI Backend`.
3. Dán mã nguồn:
   - Mở file `Code.gs` trong dự án.
   - Xóa toàn bộ nội dung mặc định cũ.
   - Mở file `apps-script/Code.gs` trong thư mục bàn giao này, copy toàn bộ nội dung và dán vào.
4. Nhấn **Lưu (Save / Ctrl+S)**. *(Hoàn toàn không cần sửa code, hệ thống tự động nhận diện Sheet hiện tại).*

---

## BƯỚC 3: PHÂN QUYỀN VÀ KHỞI TẠO HỆ THỐNG

### 3.1. Chạy hàm chuẩn hóa Google Sheet
1. Trên thanh công cụ của Apps Script, tại menu chọn hàm cần chạy: chọn `setupRegistrationSheet`.
2. Bấm nút **Chạy (Run)**.
3. Hộp thoại **"Yêu cầu cấp quyền" (Authorization Required)** sẽ xuất hiện:
   - Bấm **Xem lại quyền (Review Permissions)**.
   - Chọn tài khoản Google (email mới) của bạn.
   - Google có thể hiện cảnh báo "Google chưa xác minh ứng dụng này" (Google hasn't verified this app) -> Bấm **Nâng cao (Advanced)** -> Bấm **Đi tới EIU Agentic AI Backend (không an toàn)**.
   - Nhấn **Cho phép (Allow)** để cấp quyền ghi Sheet và gửi email qua Gmail.
4. Sau khi chạy xong, Execution log sẽ hiển thị: `Đã chuẩn hóa Sheet đăng ký.`
   - Kiểm tra Google Sheet: Các cột tiêu đề, định dạng, độ rộng cột đã được tạo tự động chuẩn 100%.

### 3.2. Tạo Khóa bí mật (API Key) kết nối Cloudflare
1. Tại menu chọn hàm: chọn `createCloudflareApiKey`.
2. Bấm nút **Chạy (Run)**.
3. Mở tab **Nhật ký thực thi (Execution log)** ở phía dưới màn hình.
4. Bạn sẽ thấy một chuỗi khóa bí mật dài được in ra (dạng UUID), ví dụ:
   ```text
   a1b2c3d4-e5f6-7890-abcd-ef1234567890-...
   ```
5. **Copy và lưu lại chuỗi này**. Đây chính là `APPS_SCRIPT_API_KEY`.
   *(Lưu ý: Không chia sẻ khóa này ra ngoài. Mỗi lần chạy lại hàm này, khóa cũ sẽ bị hủy và bạn phải cập nhật lại trên Cloudflare).*

---

## BƯỚC 4: TRIỂN KHAI APPS SCRIPT THÀNH WEB APP

1. Ở góc trên bên phải màn hình Apps Script, bấm nút **Triển khai (Deploy)** > chọn **Triển khai mới (New deployment)**.
2. Bấm vào biểu tượng bánh răng **Chọn loại** > chọn **Ứng dụng web (Web app)**.
3. Điền thông tin cấu hình:
   - **Mô tả (Description)**: `Backend v1`
   - **Thực thi dưới dạng (Execute as)**: **Tôi (Me / email của bạn)**
   - **Ai có quyền truy cập (Who has access)**: **Bất kỳ ai (Anyone)** *(CỰC KỲ QUAN TRỌNG: Bắt buộc chọn "Anyone" để Cloudflare có thể gửi POST data đến. Nếu chọn "Chỉ mình tôi" hệ thống sẽ lỗi 401/403).*
4. Bấm **Triển khai (Deploy)**.
5. Cấp quyền nếu có yêu cầu thêm.
6. Màn hình sẽ hiển thị **URL ứng dụng web (Web App URL)** kết thúc bằng `/exec`:
   ```text
   https://script.google.com/macros/s/AKfycbx.../exec
   ```
7. **Copy URL này**. Đây chính là `APPS_SCRIPT_URL`.

---

## BƯỚC 5: TRIỂN KHAI CLOUDFLARE PAGES

Người tiếp nhận có thể dùng tài khoản Cloudflare riêng của mình (miễn phí):

### 5.1. Đưa mã nguồn lên GitHub
1. Đăng nhập GitHub bằng tài khoản của người tiếp nhận.
2. Tạo một repository mới (ví dụ `eiu-agentic-ai`).
3. Đẩy toàn bộ thư mục mã nguồn này lên nhánh `main` (lưu ý: cấu trúc phải có thư mục `public` chứa `_worker.js`, `index.html`, `register`, `assets`...).

### 5.2. Kết nối với Cloudflare Pages
1. Đăng nhập vào trang quản trị Cloudflare: `https://dash.cloudflare.com/`.
2. Chọn menu **Workers & Pages** (hoặc Compute).
3. Chọn **Create application** > chọn tab **Pages** > chọn **Connect to Git**.
4. Chọn tài khoản GitHub và chọn repository `eiu-agentic-ai`.
5. Cấu hình triển khai:
   - **Production branch**: `main`
   - **Framework preset**: `None`
   - **Build command**: *(Để trống)*
   - **Build output directory**: `public`
   - **Root directory**: *(Để trống)*
6. Bấm **Save and Deploy**. Chờ Cloudflare triển khai xong lần đầu.

### 5.3. Cài đặt Biến môi trường & Khóa bảo mật (Variables & Secrets)
1. Trong giao diện dự án Pages vừa tạo trên Cloudflare, vào mục **Settings** > **Variables and Secrets**.
2. Tại mục **Production**, bấm **Add variable**:
   - Biến 1:
     - **Variable name**: `APPS_SCRIPT_URL`
     - **Value**: Dán Web App URL kết thúc bằng `/exec` lấy ở Bước 4.
   - Biến 2:
     - **Variable name**: `APPS_SCRIPT_API_KEY`
     - **Value**: Dán Khóa bí mật lấy ở Bước 3.2.
     - **Type**: Chọn **Secret / Encrypt** (Khóa bảo mật).
3. Bấm **Save**.
4. *(Nếu có dùng môi trường Preview cho các nhánh khác, hãy thêm cả 2 biến này vào mục Preview).*
5. **KÍCH HOẠT LẠI DEPLOYMENT (QUAN TRỌNG)**:
   - Vào tab **Deployments**.
   - Bấm vào dấu `...` ở bản deployment gần nhất > chọn **Retry deployment** (hoặc commit 1 file nhỏ lên GitHub).
   - *(Bước này bắt buộc để Cloudflare nạp 2 biến bí mật vừa thêm vào worker).*

---

## BƯỚC 6: KIỂM TRA NGHIỆM THU (TEST TOÀN DIỆN)

1. **Kiểm tra giao diện web**:
   - Truy cập địa chỉ `https://<ten-du-an>.pages.dev/`.
   - Kiểm tra trang chủ tải đầy đủ hiệu ứng, hình ảnh logo, các tab Demo hoạt động bình thường.
2. **Kiểm tra đăng ký thử**:
   - Bấm "Đăng ký ngay" hoặc vào `https://<ten-du-an>.pages.dev/register/`.
   - Điền thông tin thử nghiệm:
     - Họ tên: `Nguyễn Văn Test`
     - Email: Điền email cá nhân đang mở được hòm thư để test nhận email.
     - Số điện thoại: `0901234567`
     - Đơn vị, nhu cầu...
   - Bấm **Xác nhận đăng ký**:
     - ✅ Modal bật lên thành công, hiển thị mã thanh toán dạng `EIUAAxxxx`.
     - ✅ Ảnh VietQR hiển thị đúng số tiền và nội dung chuyển khoản.
3. **Kiểm tra Google Sheet**:
   - Mở Google Sheet ở Bước 1:
     - ✅ Xuất hiện 1 dòng dữ liệu mới với thông tin vừa đăng ký.
     - ✅ Cột `Trạng thái`, `Mã chuyển khoản`, `Học phí áp dụng` hiển thị chính xác.
4. **Kiểm tra Gmail**:
   - Người đăng ký: Hòm thư nhận được email xác nhận đăng ký định dạng đẹp mắt gửi từ chính Gmail của bạn.
   - Thử đăng ký lại lần 2 với cùng email/SĐT: Hệ thống phải báo thông tin đã tồn tại hoặc cập nhật thông minh, không sinh dòng rác trùng lặp.

---

## THÔNG TIN CẦN LƯU Ý KHI VẬN HÀNH

1. **Đổi thông tin tài khoản ngân hàng nhận tiền (VietQR)**:
   - Thông tin STK BIDV nhận học phí đang được đặt tại file `public/register/index.html` (dòng ~2230):
     - `PAYMENT_BANK_ID = '970418'` (Mã BIN BIDV)
     - `PAYMENT_BANK_NAME = 'BIDV'`
     - `PAYMENT_ACCOUNT = '65010000556422'`
   - Nếu bạn muốn đổi số tài khoản nhận tiền sang tài khoản khác, hãy chỉnh sửa các thông số này trong file `public/register/index.html` và commit lên GitHub.
2. **Hạn mức gửi Email tự động của Google**:
   - Tài khoản Gmail cá nhân (`@gmail.com`): Tối đa **100 email / ngày**.
   - Tài khoản Google Workspace doanh nghiệp/trường học (ví dụ `@eiu.edu.vn`): Tối đa **1.500 email / ngày**.
3. **Cập nhật mã nguồn Apps Script trong tương lai**:
   - Nếu sau này có sửa code trong `Code.gs`, bạn **phải** vào: **Deploy** > **Manage deployments** > Bấm biểu tượng cây bút (Chỉnh sửa) > Chọn **New version** > Nhấn **Deploy**.
   - Tuyệt đối không tạo URL mới nếu không muốn phải cấu hình lại biến trên Cloudflare.

