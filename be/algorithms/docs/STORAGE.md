# Ảnh bài học trên Cloudflare R2

Dùng Cloudflare R2 qua API tương thích S3, giữ tên biến `S3_*` để dùng chung
backend storage hiện có cho cả ảnh và tài liệu. Không cần tài khoản AWS.
Bucket giữ private; API tạo link có chữ ký, hiệu lực một giờ, khi đọc bài học.
`image` trong DB/seed vẫn là `/lesson-assets/openstax/<file>`; `image_url` chỉ
có trong phản hồi API và bị bỏ qua khi lưu. Tải lại bài để nhận link mới khi
link cũ hết hạn. Không cần migration hay ghi lại dữ liệu bài học.

## Cấu hình

Điền vào `.env` ở gốc repo nếu chạy Docker Compose:

```dotenv
S3_BUCKET=your-r2-bucket
S3_ENDPOINT_URL=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=your-r2-access-key
S3_SECRET_ACCESS_KEY=your-r2-secret-key
S3_REGION=auto
LESSON_ASSETS_ON_S3=False
```

Trong Cloudflare R2, tạo bucket rồi tạo API token quyền **Object Read & Write**,
giới hạn vào bucket đó. Lấy **Access Key ID** và **Secret Access Key** từ kết quả
tạo token; không dùng Cloudflare Global API Key. Sao chép S3 API endpoint từ
trang bucket, không dùng URL `r2.dev` làm endpoint. Không cần bật public bucket.

Hướng dẫn chính thức: [tạo key R2](https://developers.cloudflare.com/r2/api/tokens/)
và [endpoint, region cùng link có chữ ký](https://developers.cloudflare.com/r2/examples/aws/boto3/).

Cấu hình này cũng chuyển storage tài liệu sang R2. Nếu đã có PDF/file trên
bucket cũ, cần sao chép chúng sang R2 với nguyên object key trước khi đổi
cấu hình đang chạy. Lệnh bên dưới chỉ upload ảnh bài học local.

## Chuyển ảnh hiện có

Cấu trúc bucket dùng chung:

```text
documents/
  <UUID>.pdf           # Đường dẫn cũ của tài liệu Y và tài liệu chung
  cs/                  # Tài liệu khoa học máy tính mới
lesson-assets/
  openstax/            # Ảnh bài học OpenStax
```

Tài liệu CNTT upload mới vào `documents/cs/<UUID>.<đuôi-file>`.
Tài liệu Y và tài liệu chung giữ đường dẫn upload cũ `documents/<UUID>.<đuôi-file>`.
Đổi chuyên ngành sau khi upload không tự di chuyển file cũ; DB vẫn giữ key đã lưu.
R2 biểu diễn folder bằng prefix của object. Để folder trống cũng hiện trên dashboard:

```sh
docker compose run --rm --no-deps be python manage.py init_storage_folders --apply
```

Lệnh giữ nguyên folder marker có sẵn, tạo marker còn thiếu và xác nhận lại trên R2.

Chạy từ gốc repo, sau khi điền cấu hình:

```sh
docker compose run --rm --no-deps be python manage.py upload_lesson_assets
docker compose run --rm --no-deps be python manage.py upload_lesson_assets --apply
```

Lệnh đầu chỉ kiểm tra file local, không cần key hay gọi R2. Lệnh `--apply`
upload từ `algorithms/data/references/openstax-hamilton/assets`, giữ nguyên
tên object và bỏ qua object đã có. Nếu gián đoạn, chạy lại để upload phần còn
thiếu. Có thể dùng `--directory` và `--prefix` cho nhóm ảnh khác.

Sau khi upload thành công, đặt `LESSON_ASSETS_ON_S3=True`, rồi áp dụng cấu hình:

```sh
docker compose up -d --force-recreate be
```

Triển khai cả frontend mới để đọc `image_url`. Kiểm tra ảnh ở bài học và admin
preview trước khi bỏ bản local. Các bản ảnh local đã đối chiếu SHA-256 với R2
được dọn khỏi repo; giữ `LESSON_ASSETS_ON_S3=True` khi chạy ứng dụng.
Muốn chuyển cờ về `False`, phải tải lại ảnh vào `fe/public/lesson-assets/`
trước. Lệnh upload không tự xóa file local hoặc sửa DB; thư mục upload mặc định
cần được tải lại nếu muốn chạy lệnh này sau khi dọn ảnh.

## Các lần lấy nội dung tiếp theo

```sh
docker compose run --rm --no-deps be python algorithms/tools/import_openstax_hamilton.py
```

Khi cờ `LESSON_ASSETS_ON_S3` bật, script tải ảnh rồi upload trực tiếp lên R2 qua
API S3, không tạo thêm bản
ảnh local. JSON và HTML tham khảo vẫn được lưu trong `data/references/`.
Khi cờ tắt, script giữ chế độ tải ảnh local như trước; ảnh cần được đưa vào
`fe/public/lesson-assets/openstax/` để frontend phục vụ.

Tài liệu cấu hình thư viện: [django-storages S3](https://django-storages.readthedocs.io/en/stable/backends/amazon-S3.html).
