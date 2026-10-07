# Tài liệu cũ — không dùng cho Synapse Lab

Hướng dẫn này thuộc dự án Laravel cũ. Với Synapse Lab trên Windows, xem [bbb/README.md](bbb/README.md).

# Setup BBB bằng Docker để dùng với web local

Web Laravel và server BigBlueButton là hai phần riêng. Ngân chạy `vku_dt` trên Mac, còn BBB phải có môi trường chạy phù hợp rồi điền địa chỉ API vào `.env` của web.

## 1. Chọn môi trường

Bộ [bigbluebutton/docker](https://github.com/bigbluebutton/docker) do cộng đồng duy trì yêu cầu Linux, quyền root/host networking và ít nhất 4 GB RAM. Bản triển khai bằng image dựng sẵn yêu cầu IPv4 công khai; upstream ghi NAT còn hạn chế. Vì vậy hướng dẫn này không cam kết chạy trực tiếp trên Docker Desktop macOS.

Máy hiện tại là Mac ARM64. Hãy dùng máy Linux x86_64 riêng để dễ triển khai; nếu dùng máy ảo trên Mac, phải kiểm tra kiến trúc image và mạng trước. Máy ảo ARM64 không tự tương đương Linux x86_64, và máy ảo NAT không giải quyết sẵn đường truyền mic/camera.

- **Thử BBB trong mạng local trên Linux:** làm phần 2; cần build các thành phần.
- **Pull image sẵn, web vẫn chạy local:** làm phần 3 trên máy Linux có IP công khai và domain.

## 2. Chạy bản development local trên Linux

Cài Docker Engine và Compose plugin theo [hướng dẫn Docker cho Ubuntu](https://docs.docker.com/engine/install/ubuntu/). Chuẩn bị Git, rồi kiểm tra:

```bash
git --version
docker --version
docker compose version
docker run --rm hello-world
```

Trong một thư mục riêng trên **Linux**, chạy:

```bash
git clone --branch develop --recurse-submodules https://github.com/bigbluebutton/docker.git bbb-dev
cd bbb-dev
./scripts/dev
```

Theo [hướng dẫn development của upstream](https://github.com/bigbluebutton/docker/blob/develop/docs/development.md), đây là luồng build từ source. Lần đầu có thể tải và build nhiều thành phần; không chỉ `docker pull` một image.

[Script dev](https://github.com/bigbluebutton/docker/blob/develop/scripts/dev) tạo `.env`, chọn IP mạng local, sinh Compose, build rồi chạy ở foreground. Dùng URL được in ở terminal để mở BBB; máy mở trình duyệt phải truy cập được IP đó. Mở terminal khác trong `bbb-dev` để xem trạng thái:

```bash
docker compose ps
docker compose logs --tail=100
```

Bản dev dùng chứng chỉ tự ký. Cần xử lý tin cậy chứng chỉ ở trình duyệt/máy gọi API; upstream cũng ghi hạn chế callback recording của Greenlight ở chế độ này. Đây là môi trường thử nghiệm, chưa chứng minh hoạt động bản ghi của ứng dụng.

Script dùng secret mẫu của upstream. Không đưa các giá trị đó vào tài liệu này. Mở `bbb-dev/.env`, đặt `SHARED_SECRET` riêng và bảo đảm mọi thành phần dùng cùng giá trị, rồi áp dụng:

```bash
./scripts/generate-compose
docker compose up -d
```

Các URL thử được script in trước khi đổi secret có thể không còn hợp lệ. Tiếp tục kết nối Laravel ở phần 4 bằng secret mới.

## 3. Pull image sẵn trên máy Linux, kết nối từ web local

Chuẩn bị Linux có IPv4 công khai, domain trỏ đúng máy, HTTPS và mạng theo [yêu cầu upstream](https://github.com/bigbluebutton/docker#requirements). Cài Docker Engine và Compose plugin trước.

Chạy trong thư mục riêng trên máy Linux:

```bash
git clone --branch develop https://github.com/bigbluebutton/docker.git bbb-docker
cd bbb-docker
./scripts/setup
```

Theo [script setup](https://github.com/bigbluebutton/docker/blob/develop/scripts/setup), trình cài hỏi domain, IP, HTTPS, Greenlight và recording. Với lần thử đầu, chọn HTTPS tự động khi domain đã trỏ đúng; Greenlight tùy nhu cầu, recording có thể tắt. Script tạo `.env`, sinh các secret ngẫu nhiên và Compose. Giữ secret trong môi trường triển khai.

Sau khi setup hoàn tất:

```bash
docker compose pull
docker compose up -d --no-build
docker compose ps
docker compose logs --tail=100
```

`docker compose pull` tải các image của cả hệ thống theo file Compose đã sinh. Nếu sửa `.env` của BBB, chạy `./scripts/generate-compose` rồi `docker compose up -d --no-build` để áp dụng.

## 4. Nối BBB với `vku_dt` chạy local

Có hai file `.env` khác nhau:

| File | Vai trò |
| --- | --- |
| `bbb-dev/.env` hoặc `bbb-docker/.env` | Cấu hình server BBB, chứa `SHARED_SECRET`. |
| `vku_dt/.env` | Cấu hình Laravel, chứa `BBB_SECRET` bằng giá trị `SHARED_SECRET` của server. |

Trong **`vku_dt/.env`**, cập nhật các biến dưới đây; URL và secret cố ý để trống, Ngân phải điền trước khi dùng:

```dotenv
BBB_ENABLED=true
BBB_URL=
BBB_SECRET=
BBB_CHECKSUM_ALGORITHM=sha256
BBB_SSL_VERIFY=true
BBB_CONNECT_TIMEOUT=5
BBB_TIMEOUT=15
BBB_RECORDING_CALLBACK_SECRET=
```

- `BBB_URL`: `https://<domain-hoac-IP-BBB>/bigbluebutton/api`, phải truy cập được từ Laravel và trình duyệt.
- `BBB_SECRET`: lấy từ `SHARED_SECRET` trong `.env` của BBB; không lấy mật khẩu Greenlight.
- Với chứng chỉ tự ký của bản dev, ưu tiên cài CA tin cậy. Có thể tạm đặt `BBB_SSL_VERIFY=false` **chỉ trong môi trường local thử nghiệm** để Laravel gọi API; việc này không sửa lỗi chứng chỉ của trình duyệt, mic/camera hay mạng.
- `BBB_RECORDING_CALLBACK_SECRET` có thể để trống khi chưa thử bản ghi. Docker BBB không tự cung cấp callback bản ghi riêng của dự án; xem [README](README.md).

Trong terminal tại `vku_dt`, chạy:

```bash
php artisan config:clear
```

Mở web local đang chạy, tạo buổi học chọn BBB và thử vào phòng bằng tài khoản giảng viên/học viên. Kiểm tra cả mic, camera và kết thúc buổi học; container chạy chưa đủ để xác nhận mọi tính năng hoạt động.

Nếu cần callback kết thúc phòng hoặc tải tài liệu từ Laravel, `APP_URL` phải là địa chỉ server BBB truy cập được, ví dụ domain HTTPS của tunnel tới web local. `localhost` trên máy BBB trỏ về chính máy BBB, không phải Mac của Ngân. Tunnel HTTP tới Laravel cũng không thay thế cấu hình mạng media của BBB.

## 5. Dừng, chạy lại và xử lý lỗi

Chạy trong thư mục BBB đã chọn:

```bash
docker compose stop
docker compose start
```

| Lỗi | Kiểm tra |
| --- | --- |
| `no matching manifest` / `exec format error` | Kiến trúc image và host; đặc biệt ARM64 trên Mac. |
| Không mở được BBB | IP/domain, HTTPS, firewall và đường mạng từ Mac tới Linux. |
| Mở được web nhưng không có tiếng/video | Mạng media/UDP, NAT và TURN theo cấu hình upstream. |
| Laravel báo chưa cấu hình | Đã điền URL, secret, bật BBB và clear config chưa. |
| Checksum sai | `BBB_SECRET` có khớp `SHARED_SECRET`, thuật toán được server chấp nhận không. |
| Callback không tới web | `APP_URL` có truy cập được từ BBB không. |

Tài liệu được đối chiếu với repository upstream ngày 27/09/2026. Chưa cài hoặc chạy BBB trên máy này; cần kiểm thử thực tế theo môi trường đã chọn. Nhánh `develop` có thể thay đổi, nên lưu commit đã dùng khi dựng thành công.
