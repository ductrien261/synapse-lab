# BigBlueButton cho Synapse Lab

Synapse Lab chạy `fe` và `be` trên Windows bằng Docker Desktop. Trong lúc phát triển, module lớp học mặc định dùng chế độ mock nên không cần cài BigBlueButton trên máy Windows.

## Chạy chế độ mock trên Windows

Giữ cấu hình sau trong `.env` ở gốc dự án:

```dotenv
BBB_ENABLED=false
```

Khởi động dự án và áp dụng migration:

```powershell
docker compose up -d --build
docker compose exec be python manage.py migrate
```

Sau đó mở `http://localhost:3100/spaces`. Có thể tạo không gian, tham gia bằng mã, bắt đầu và kết thúc một phiên mô phỏng mà không cần server media.

## Chạy BBB thật trên Windows để phát triển

Môi trường local dùng BBB 3.0 trong distro WSL `Ubuntu-22.04`. Đây chỉ là môi
trường phát triển trên một máy, không thay thế server production. Các script
dưới đây giữ shared secret ngoài repository và nối backend Docker tới BBB qua
hostname HTTPS `bbb.synapse.test`.

Sau khi đã chạy `install-wsl-dev.sh` một lần, mỗi lần khởi động lại Windows hãy
mở PowerShell trong thư mục dự án và chạy:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup\bbb\start-wsl-dev.ps1
powershell -ExecutionPolicy Bypass -File .\setup\bbb\connect-wsl-dev.ps1
```

Lệnh đầu giữ WSL và các dịch vụ BBB chạy nền, cập nhật Windows TCP proxy/hosts
theo IP WSL hiện tại và có thể yêu cầu UAC. Lệnh thứ hai lấy shared secret trực
tiếp từ WSL, tạo lại container `be` ở chế độ live và kiểm tra API; secret không
được ghi vào file trong repository.

Các thiết lập hệ thống local cần thiết:

- CA phát triển `Synapse BBB Dev CA` nằm trong Trusted Root của Windows.
- TCP `80/443` và UDP `16384-32768` được mở riêng cho WSL.
- Redis Docker publish ở host port `6380`; các container vẫn dùng `redis:6379`.
- Backend dùng `BBB_SSL_VERIFY=false` chỉ trong local vì CA nội bộ không được
  cài trong image backend. Production luôn phải dùng `BBB_SSL_VERIFY=true`.

Nếu Docker tạo lại container `be` bằng một lệnh khác, chạy lại
`connect-wsl-dev.ps1` để đưa cấu hình live và secret trở lại container.

## Cài server thật

BigBlueButton 3.0 cần một máy Ubuntu 22.04 x86_64 riêng, domain HTTPS và các cổng media. Chuẩn bị DNS cho một hostname như `bbb.example.com`, sau đó chép repo hoặc riêng script `install-ubuntu.sh` lên server.

Chạy trên Ubuntu bằng quyền root, thay các giá trị mẫu:

```bash
sudo env \
  BBB_HOST=bbb.example.com \
  BBB_EMAIL=admin@example.com \
  bash setup/bbb/install-ubuntu.sh
```

Kiểm tra và lấy thông tin kết nối:

```bash
sudo bbb-conf --check
sudo bbb-conf --secret
```

Trên máy Windows, cập nhật `.env` của Synapse Lab:

```dotenv
BBB_ENABLED=true
BBB_URL=https://bbb.example.com/bigbluebutton/api
BBB_SECRET=<SHARED_SECRET_TU_BBB_CONF>
BBB_CHECKSUM_ALGORITHM=sha256
BBB_SSL_VERIFY=true
BBB_CONNECT_TIMEOUT=5
BBB_TIMEOUT=15
SYNAPSE_LAB_URL=https://app.example.com
```

Không đặt `BBB_SECRET` trong biến `NEXT_PUBLIC_*` và không commit `.env`.

Khởi động lại backend sau khi đổi cấu hình:

```powershell
docker compose up -d --build be
```

Trang `/spaces` hiển thị một trong ba trạng thái:

- `BBB mô phỏng`: phát triển trên Windows, không có media thật.
- `BBB sẵn sàng`: backend đã ký và gọi được API BBB.
- `BBB mất kết nối`: kiểm tra URL, secret, HTTPS và firewall.

Trong phòng, frontend đồng bộ trạng thái mỗi 5 giây. Nếu phòng bị kết thúc trực tiếp từ giao diện BBB, Synapse Lab sẽ tự đóng phiên sau khi nhận thấy meeting không còn chạy. Phiên mới có khoảng chờ 3 phút để chủ phòng kịp tham gia trước khi bị xem là không hoạt động.

## Checklist kiểm thử lớp học tương tác

Chỉ thực hiện checklist này khi trang `/spaces` báo `BBB sẵn sàng`. Dùng hai
trình duyệt hoặc một cửa sổ thường và một cửa sổ riêng tư, đăng nhập hai tài
khoản khác nhau rồi mở cùng mã phòng.

1. Chủ phòng bấm **Bắt đầu** rồi **Vào phòng**; BBB phải nhận vai trò Moderator.
2. Thành viên bấm **Vào phòng**; BBB phải nhận vai trò Viewer.
3. Cả hai chọn **Microphone**, hoàn thành echo test và xác nhận nghe được nhau.
4. Cả hai bật webcam; kiểm tra hình ảnh xuất hiện ở cả hai trình duyệt.
5. Gửi tin nhắn public theo hai chiều, sau đó thử reply/reaction.
6. Trên bảng trắng, chủ phòng vẽ trước; thành viên phải vẽ được ngay vì phiên
   được tạo với `multiUserWhiteboardEnabled=true`.
7. Chủ phòng chia sẻ màn hình; thành viên phải xem được nội dung chia sẻ.
8. Thành viên rời phòng rồi vào lại; Synapse Lab phải cập nhật số người tham gia.
9. Chủ phòng bấm **Kết thúc**; cả hai được đưa về Synapse Lab.

Nếu mở được giao diện nhưng mic/camera thất bại, kiểm tra HTTPS hợp lệ, quyền
trình duyệt, UDP `16384-32768` và TURN trước khi sửa frontend.

## Luồng tích hợp

1. Chủ phòng tạo không gian và nhận mã tham gia.
2. Thành viên nhập mã để tham gia không gian.
3. Chủ phòng bắt đầu phiên học; Django gọi API `create` của BBB.
4. Django tạo URL `join` đã ký. Chủ phòng nhận vai trò `moderator`, thành viên nhận `viewer`.
5. Khi `BBB_ENABLED=false`, cùng luồng API chạy ở chế độ mock và giữ người dùng trong giao diện Synapse Lab.

### Quy tắc đồng bộ tài liệu

- Slide/PowerPoint đã render và PDF gốc đều được pre-upload để giáo viên thấy đủ
  trong danh sách presentation của BBB.
- BBB luôn tách PDF thành từng slide trong presentation viewer. Vì vậy Synapse cài
  thêm plugin `GenericLinkShare`: PDF đầu tiên được truyền qua join metadata và tự
  mở bằng reader HTML theo từng trang ảnh. Vị trí cuộn của giáo viên được phát qua
  data channel để học viên tự cuộn theo.
- Giáo viên dùng **Mở PDF dạng cuộn** trong menu hành động để mở PDF cho cả lớp,
  và **Trở lại slide BBB** để đóng reader. Khi giáo viên chọn một presentation
  khác trong BBB, reader cũng tự đóng đồng bộ trên mọi máy.
- Với PowerPoint, giáo viên điều khiển trang trong presentation viewer; học viên
  theo cùng trang nên không có nút tự chuyển slide riêng.
- Mô hình 3D, quiz và các hoạt động tương tác dùng lớp tích hợp riêng, không đi qua
  presentation viewer.

`SYNAPSE_LAB_URL` là địa chỉ frontend mà BBB chuyển người dùng về sau khi rời phòng. Ở máy local có thể giữ `http://localhost:3100`; khi triển khai phải đổi thành domain HTTPS thật của ứng dụng.

Tham khảo tài liệu chính thức:

- https://docs.bigbluebutton.org/administration/install/
- https://docs.bigbluebutton.org/administration/firewall-configuration/
- https://docs.bigbluebutton.org/development/api/
