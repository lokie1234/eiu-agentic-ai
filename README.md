# TRIỂN KHAI EIU APPLIED AGENTIC AI LÊN CLOUDFLARE PAGES + WORKERS

Bộ mã này chuyển giao diện Google Apps Script sang Cloudflare Pages, nhưng vẫn giữ Google Apps Script làm backend để:

- ghi dữ liệu vào Google Sheets;
- kiểm tra đăng ký trùng;
- phân biệt email EIU và học phí;
- tạo/kiểm tra mã chuyển khoản `EIUAAxxxx`;
- gửi email xác nhận;
- trả dữ liệu cho giao diện tạo VietQR.

Giao diện, tài khoản BIDV và nghiệp vụ chính được giữ nguyên. Học phí được cập nhật: giá gốc 2.000.000 đồng; Early Bird 1.000.000 đồng trước 26/10/2026 (giờ Việt Nam); email @eiu.edu.vn giảm thêm 50%. Nội dung đồ ăn chỉ còn Lunch break. Phần triển khai Cloudflare, đường dẫn và API được giữ nguyên.

---

## 1. CẤU TRÚC THƯ MỤC

```text
eiu-cloudflare-webapp/
├─ apps-script/
│  └─ Code.gs
├─ public/
│  ├─ _worker.js
│  ├─ index.html
│  ├─ register/
│  │  └─ index.html
│  ├─ demo/
│  │  ├─ leave/index.html
│  │  ├─ time/index.html
│  │  ├─ meeting/index.html
│  │  └─ overtime/index.html
│  └─ assets/
│     └─ logo-eiu.png
├─ .gitignore
└─ README.md
```

Cloudflare chỉ xuất bản thư mục `public`.

Thư mục `apps-script` không được đưa ra website; nó chỉ chứa bản `Code.gs` để bạn copy vào Google Apps Script.

---

# PHẦN A — CHUẨN BỊ TỪ BƯỚC 0

## Bước 0.1 — Sao lưu hệ thống hiện tại

Trước khi sửa:

1. Mở dự án Google Apps Script hiện tại.
2. Chọn **Project Settings** và ghi lại Script ID nếu cần.
3. Copy toàn bộ 4 file hiện tại sang một thư mục dự phòng.
4. Mở Google Sheets và xác nhận dữ liệu hiện tại vẫn còn đủ các cột.
5. Ghi lại URL Web App hiện tại kết thúc bằng `/exec`.

Không xóa deployment cũ cho đến khi Cloudflare chạy ổn định.

## Bước 0.2 — Chuẩn bị tài khoản

Bạn cần:

- một tài khoản Google đang sở hữu Apps Script và Google Sheet;
- một tài khoản GitHub;
- một tài khoản Cloudflare;
- tên miền riêng nếu muốn dùng URL riêng.

Bạn vẫn có thể chạy miễn phí trước bằng địa chỉ:

```text
https://ten-du-an.pages.dev
```

Tên miền riêng có thể gắn sau.

---

# PHẦN B — CẬP NHẬT GOOGLE APPS SCRIPT

## Bước 1 — Thay Code.gs

1. Mở dự án Apps Script hiện tại.
2. Mở file `Code.gs`.
3. Copy toàn bộ nội dung trong:

```text
apps-script/Code.gs
```

4. Dán đè vào `Code.gs` hiện tại.
5. Nhấn **Save**.

Ba file HTML cũ trong Apps Script có thể giữ nguyên. Cloudflare không còn dùng chúng cho giao diện chính, nhưng giữ lại sẽ giúp URL Apps Script cũ vẫn hoạt động.

Bản Code.gs mới chỉ bổ sung các phần sau:

- `doPost(e)` nhận dữ liệu từ Cloudflare;
- `createCloudflareApiKey()` tạo khóa bí mật;
- hàm đọc JSON và trả JSON;
- hàm so sánh khóa kết nối.

Các hàm lưu Sheet, gửi email, kiểm tra trùng và tạo mã chuyển khoản vẫn được giữ.

## Bước 2 — Chuẩn hóa Google Sheet

Trong danh sách hàm Apps Script:

1. Chọn `setupRegistrationSheet`.
2. Nhấn **Run**.
3. Cấp quyền nếu Google yêu cầu.
4. Kiểm tra Execution log báo:

```text
Đã chuẩn hóa Sheet đăng ký.
```

Nếu Sheet đã đúng cấu trúc, bước này không làm mất dữ liệu.

## Bước 3 — Tạo khóa bí mật kết nối Cloudflare

1. Chọn hàm `createCloudflareApiKey`.
2. Nhấn **Run**.
3. Cấp quyền nếu được hỏi.
4. Mở **Executions** hoặc xem kết quả chạy.
5. Copy chuỗi được trả về, ví dụ:

```text
xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-...
```

Giữ chuỗi này kín. Không dán vào HTML, GitHub hoặc gửi cho người đăng ký.

Cloudflare sẽ lưu chuỗi này dưới tên:

```text
APPS_SCRIPT_API_KEY
```

Lưu ý: mỗi lần chạy lại `createCloudflareApiKey`, khóa cũ sẽ hết hiệu lực. Khi đó phải cập nhật lại Secret trên Cloudflare.

## Bước 4 — Deploy Apps Script thành Web App

### Trường hợp đã có deployment

1. Chọn **Deploy**.
2. Chọn **Manage deployments**.
3. Chọn deployment Web App hiện tại.
4. Nhấn biểu tượng sửa.
5. Chọn **New version**.
6. Nhấn **Deploy**.

### Trường hợp tạo deployment mới

1. Chọn **Deploy**.
2. Chọn **New deployment**.
3. Chọn loại **Web app**.
4. Thiết lập:
   - **Execute as:** Me.
   - **Who has access:** Anyone.
5. Nhấn **Deploy**.
6. Copy URL kết thúc bằng:

```text
/exec
```

Không dùng URL `/dev`, vì `/dev` chỉ dành cho thử nghiệm và yêu cầu quyền chỉnh sửa dự án.

URL `/exec` này sẽ được lưu trên Cloudflare dưới tên:

```text
APPS_SCRIPT_URL
```

---

# PHẦN C — ĐƯA MÃ LÊN GITHUB

## Bước 5 — Tạo repository GitHub

1. Đăng nhập GitHub.
2. Chọn **New repository**.
3. Đặt tên, ví dụ:

```text
eiu-agentic-ai-webapp
```

4. Có thể chọn **Private**.
5. Tạo repository.
6. Chọn **Add file > Upload files**.
7. Giải nén file ZIP của bộ mã này.
8. Upload toàn bộ nội dung bên trong thư mục `eiu-cloudflare-webapp`, gồm:
   - `public`;
   - `apps-script`;
   - `README.md`;
   - các file còn lại.
9. Commit vào nhánh `main`.

Không upload một file ZIP duy nhất vào repository. Phải upload các thư mục và file đã giải nén.

---

# PHẦN D — TẠO CLOUDFLARE PAGES + WORKER

## Bước 6 — Kết nối Cloudflare với GitHub

1. Đăng nhập Cloudflare.
2. Mở **Workers & Pages**.
3. Chọn **Create application**.
4. Chọn **Pages**.
5. Chọn **Connect to Git**.
6. Kết nối tài khoản GitHub.
7. Chọn repository `eiu-agentic-ai-webapp`.
8. Chọn nhánh production:

```text
main
```

## Bước 7 — Cấu hình build

Thiết lập:

```text
Framework preset: None
Build command: để trống
Build output directory: public
Root directory: để trống
```

Sau đó chọn **Save and Deploy**.

File `public/_worker.js` sẽ được Cloudflare nhận là Pages Function ở Advanced Mode. Worker này xử lý `/api/register`; các đường dẫn còn lại được chuyển sang hệ thống file tĩnh của Pages.

Sau deployment đầu tiên, website sẽ có địa chỉ tương tự:

```text
https://eiu-agentic-ai-webapp.pages.dev
```

Giao diện có thể mở được ngay, nhưng form chưa gửi được cho đến khi cấu hình hai biến ở bước tiếp theo.

## Bước 8 — Cấu hình Variables and Secrets

Trong dự án Pages:

1. Mở **Settings**.
2. Mở **Variables and Secrets**.
3. Thêm biến thứ nhất:

```text
Name: APPS_SCRIPT_URL
Value: URL Apps Script kết thúc bằng /exec
Type: Variable hoặc Secret
Environment: Production
```

4. Thêm biến thứ hai:

```text
Name: APPS_SCRIPT_API_KEY
Value: khóa tạo ở hàm createCloudflareApiKey()
Type: Secret / Encrypt
Environment: Production
```

Nên thêm cả hai giá trị cho **Preview** nếu bạn muốn thử các branch hoặc preview deployment.

Sau khi lưu biến:

1. Mở **Deployments**.
2. Chọn deployment mới nhất.
3. Chọn **Retry deployment**, hoặc tạo một commit mới trên GitHub để Cloudflare deploy lại.

Secret phải được cấu hình trước deployment đang sử dụng nó.

---

# PHẦN E — KIỂM TRA WEBSITE

## Bước 9 — Kiểm tra trang chính

Mở:

```text
https://ten-du-an.pages.dev/
```

Kiểm tra:

- logo EIU hiển thị;
- hiệu ứng Agentic AI hoạt động;
- các thẻ Demo mở đúng;
- nút Đăng ký ngay mở `/register/`;
- giao diện điện thoại không bị tràn ngang.

## Bước 10 — Kiểm tra đăng ký thật

Mở:

```text
https://ten-du-an.pages.dev/register/
```

Thực hiện một đăng ký thử bằng email của bạn.

Sau khi gửi, kiểm tra:

1. Google Sheet có thêm một dòng.
2. Cột nội dung chuyển khoản có dạng:

```text
TEN HOC VIEN EIUAA1234
```

3. Email xác nhận được gửi.
4. QR hiển thị đúng số tiền.
5. Đăng ký lại cùng họ tên và số điện thoại phải báo đã đăng ký.
6. Trước 26/10/2026 (Asia/Ho_Chi_Minh): email `@eiu.edu.vn` hiện **500.000 đồng**, ngoài EIU **1.000.000 đồng**.
7. Từ 26/10/2026: email `@eiu.edu.vn` hiện **1.000.000 đồng**, ngoài EIU **2.000.000 đồng**.
8. QR phải khớp với `tuition` do backend trả về (Google Sheet/email), không tự hạ về 1.000.000 đồng.
9. Trang chủ và trang đăng ký phải chỉ hiển thị **Lunch break** (không còn Tea break).

Sau khi thử xong, có thể xóa dòng đăng ký thử trong Sheet.

---

# PHẦN F — GẮN TÊN MIỀN RIÊNG

Ví dụ tên miền mong muốn:

```text
https://dangky.tenmiencuaban.vn
```

## Bước 11 — Thêm custom domain trong Pages

1. Vào Cloudflare.
2. Mở **Workers & Pages**.
3. Chọn dự án Pages.
4. Chọn **Custom domains**.
5. Chọn **Set up a domain**.
6. Nhập:

```text
dangky.tenmiencuaban.vn
```

7. Chọn **Continue**.

Phải thêm domain trong màn hình Custom domains trước. Không chỉ tạo CNAME thủ công, vì domain có thể không được Pages kích hoạt đúng.

## Trường hợp 1 — Tên miền đang quản lý DNS trên Cloudflare

Cloudflare thường tự tạo bản ghi DNS cần thiết. Chờ trạng thái chuyển sang **Active**.

HTTPS được cấp tự động.

## Trường hợp 2 — Tên miền đang quản lý tại nhà cung cấp khác

Đối với subdomain như:

```text
dangky.tenmiencuaban.vn
```

Tại nơi đang quản lý DNS, tạo CNAME:

```text
Type: CNAME
Name/Host: dangky
Target/Content: ten-du-an.pages.dev
TTL: Auto
```

Sau đó quay lại Cloudflare Pages và chờ xác minh.

## Trường hợp 3 — Dùng tên miền gốc

Ví dụ:

```text
https://tenmiencuaban.vn
```

Tên miền gốc phải được thêm thành một Cloudflare Zone và nameserver của tên miền phải đổi sang nameserver Cloudflare cung cấp.

Nếu chưa muốn chuyển toàn bộ DNS sang Cloudflare, nên dùng subdomain như:

```text
dangky.tenmiencuaban.vn
```

## Bước 12 — Kiểm tra tên miền

Mở:

```text
https://dangky.tenmiencuaban.vn
```

Kiểm tra lại form đăng ký. Vì Worker dùng API cùng domain `/api/register`, bạn không phải sửa URL trong `register/index.html` khi đổi từ `pages.dev` sang tên miền riêng.

---

# PHẦN G — CÁCH CẬP NHẬT SAU NÀY

## Sửa giao diện

Sửa các file trong:

```text
public/
```

Sau đó commit lên nhánh `main`. Cloudflare tự deploy lại.

## Sửa nghiệp vụ Google Sheets hoặc email

1. Sửa `Code.gs` trong Apps Script.
2. Save.
3. Chọn **Deploy > Manage deployments**.
4. Sửa deployment.
5. Chọn **New version**.
6. Deploy.

Không cần deploy lại Cloudflare nếu chỉ sửa backend Apps Script.

## Đổi tài khoản ngân hàng

Tìm trong:

```text
public/register/index.html
```

Các hằng số:

```javascript
PAYMENT_BANK_ID
PAYMENT_BANK_NAME
PAYMENT_ACCOUNT
```

Sau đó commit lên GitHub.

## Đổi tên miền

Không cần sửa code. Chỉ thêm hoặc đổi trong:

```text
Cloudflare Pages > Custom domains
```

---

# PHẦN H — XỬ LÝ LỖI THƯỜNG GẶP

## Lỗi: “Máy chủ chưa được cấu hình đầy đủ”

Nguyên nhân:

- thiếu `APPS_SCRIPT_URL`;
- thiếu `APPS_SCRIPT_API_KEY`;
- biến chỉ được thêm cho Preview nhưng đang dùng Production;
- chưa redeploy sau khi thêm Secret.

## Lỗi: “Google Apps Script trả về dữ liệu không hợp lệ”

Kiểm tra:

- URL phải kết thúc bằng `/exec`;
- deployment phải là bản mới;
- quyền truy cập phải là **Anyone**;
- không dùng URL `/dev`;
- Apps Script có lỗi cú pháp hay không.

## Lỗi: “Yêu cầu không được phép”

Khóa Apps Script và khóa Cloudflare không giống nhau.

Cách sửa:

1. Chạy lại `createCloudflareApiKey`.
2. Copy khóa mới.
3. Cập nhật `APPS_SCRIPT_API_KEY` trên Cloudflare.
4. Redeploy Pages.

## Website mở được nhưng form không gửi

Mở Cloudflare:

```text
Workers & Pages > dự án > Functions/Logs
```

Xem lỗi của request `/api/register`.

Đồng thời mở Apps Script:

```text
Executions
```

để xem `doPost` và `saveRegistration`.

## Tên miền báo 522 hoặc chưa active

- Phải thêm domain từ **Pages > Custom domains** trước.
- Kiểm tra CNAME trỏ đúng `<ten-du-an>.pages.dev`.
- Với domain gốc, kiểm tra nameserver đã trỏ Cloudflare.
- Chờ DNS và chứng chỉ HTTPS hoàn tất.

## QR không tải được

Website vẫn hiển thị thông tin chuyển khoản thủ công. Kiểm tra thiết bị có chặn `img.vietqr.io` hay không.

---

# PHẦN I — NHỮNG THAY ĐỔI KỸ THUẬT ĐÃ THỰC HIỆN

1. Thay `google.script.run.saveRegistration()` bằng:

```javascript
fetch('/api/register', ...)
```

2. Thêm `public/_worker.js` để:

- nhận dữ liệu form;
- giữ khóa Apps Script ở phía máy chủ;
- chuyển request đến Apps Script;
- phục vụ file tĩnh;
- thêm security headers;
- giữ tương thích với link query cũ.

3. Thêm `doPost(e)` vào Code.gs.

4. Trích logo Base64 thành:

```text
public/assets/logo-eiu.png
```

5. Chuyển Demo template thành bốn trang tĩnh.

6. Giữ toàn bộ xử lý Google Sheet, email, QR, học phí và kiểm tra trùng.

---

# TÀI LIỆU CHÍNH THỨC THAM KHẢO

```text
Cloudflare Pages Git integration:
https://developers.cloudflare.com/pages/get-started/git-integration/

Cloudflare Pages Functions Advanced Mode:
https://developers.cloudflare.com/pages/functions/advanced-mode/

Cloudflare Pages Variables and Secrets:
https://developers.cloudflare.com/pages/functions/bindings/

Cloudflare Pages Custom Domains:
https://developers.cloudflare.com/pages/configuration/custom-domains/

Google Apps Script Web Apps:
https://developers.google.com/apps-script/guides/web

Google Apps Script Content Service:
https://developers.google.com/apps-script/guides/content
```
