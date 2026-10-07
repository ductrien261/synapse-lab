# Seed bốn thuật toán quay lui

`backtracking.json` chứa nội dung được nạp vào `AlgorithmContent` bằng natural
keys. Dữ liệu ban đầu được xuất từ bài đang soạn; phiên bản ngày 03/10/2026 đã
bổ sung nội dung theo yêu cầu, không còn là snapshot nguyên trạng.

| Bài | Mục nội dung | Blocks | Hướng dẫn code | Mẫu mô phỏng | Ứng dụng |
| --- | --- | ---: | ---: | ---: | ---: |
| Hamilton | 11/11 | 119 | 33 bước | 2 | 4 |
| Mã đi tuần | 11/11 | 14 | 15 bước | 1 | 4 |
| N-Queen | 11/11 | 14 | 5 phần | 3 | 4 |
| Tổng tập con | 11/11 | 14 | 5 phần | 3 | 4 |

Cả bốn bài có trạng thái nội dung `published`. Mỗi bài có sáu mục lý thuyết
cùng khung: bài toán/input/output; ý tưởng; các bước; trace trạng thái ↔ code;
độ phức tạp/tính đúng/giới hạn; ứng dụng/biến thể/so sánh. Nội dung từng mục
đối chiếu với mã C++ của chính bài đó. Hamilton giữ các bài tập và hình từ tài
liệu gốc. Ba bài còn lại có tám bài luyện tập có sơ đồ, gợi ý và lời giải cho
mỗi bài. Phần tiếng Anh cũ
của Mã đi tuần được giữ trong kho tham khảo, không nằm trong bài học xuất bản.
Sơ đồ của ba bài nằm trong `fe/public/lesson-assets/algorithms/backtracking/`
và được frontend phục vụ trực tiếp kể cả khi ảnh tài liệu gốc dùng S3.

## Nạp bài mới hoặc cập nhật bài đang có

Chạy tại thư mục gốc repo. Backend phải dùng code mới, gồm migrations 0002–0007.
Seed không tự migrate. Các lệnh này dành cho Ngân tự nạp vào DB đang cấu hình;
việc phát triển chỉ chạy kiểm thử trên DB riêng.

```sh
docker compose exec -T be python manage.py migrate
docker compose exec -T be python manage.py seed_backtracking --dry-run --update-existing
docker compose exec -T be python manage.py seed_backtracking --apply --update-existing
```

`--dry-run --update-existing` chỉ đọc và liệt kê trường khác biệt.
`--apply --update-existing` thay nội dung khác biệt của **bốn bài trong seed**,
bao gồm trạng thái xuất bản; các chỉnh sửa nội dung mới hơn seed cũng sẽ được
thay thế. Giữ ID, metadata danh mục/thuật toán, `updated_by`, nguồn tham khảo
liên kết và bài ngoài seed. Chạy lại khi dữ liệu giống nhau không đổi timestamp.
Nếu thuật toán có sẵn đang bị ẩn (`is_published=false`), seed giữ cờ đó.

Không có `--update-existing`, lệnh chỉ thêm bản ghi thiếu và hủy toàn bộ khi
nội dung có sẵn khác seed. Mặc định không có `--apply` là preview.
Hỗ trợ `--database ALIAS`. Không dùng `loaddata`: file không phải Django fixture.
Toàn bộ lần nạp nằm trong transaction; PostgreSQL khóa các bảng thuật toán
khi áp dụng, timeout 5 giây. Không gọi AI hay dịch vụ mô phỏng khi nạp.

## Trợ giảng thuật toán

`POST /api/algorithms/<category>/<algorithm>/tutor/` nhận `action` là `ask`,
`quiz`, `scenario`, `summary` hoặc `hint`, cùng `question` tùy chọn và trạng thái
`frame` của bước mô phỏng. Cần đăng nhập; chỉ bài đã xuất bản có lý thuyết mới
được gọi AI. Backend lấy tên, lý thuyết, mã giả, code và độ phức tạp trực tiếp
từ `AlgorithmContent`; dữ liệu do trình duyệt gửi không thay được bài học.
Lượt gọi đi qua `ai_gateway` để áp dụng hạn mức và ghi token. AI service dùng
prompt riêng cho từng action và trả JSON. Với `quiz`, người học chọn `count`
(1–5), `difficulty` (`easy|medium|hard`), `focus` (`mixed|problem|principle|
trace|complexity|application`) và `topic` tùy chọn trước khi gọi AI. Service
kiểm tra trả đúng số câu; mỗi câu có bốn lựa chọn khác nhau, một đáp án đúng
và lời giải. Frontend chỉ hiện đáp án sau khi người học chọn từng câu, rồi
hiện tổng điểm. Bản xem trước trong admin không gọi AI.

Action `flashcards` không cần cấu hình: một lượt tạo đúng 5 thẻ hỏi–đáp từ toàn bộ
bài thuật toán đã xuất bản, không giới hạn vào bước mô phỏng đang xem. AI service
kiểm tra đủ hai mặt và không trùng câu hỏi;
frontend cho lật thẻ, đi trước/sau và theo dõi tiến độ trong bộ hiện tại.

Trong tab Code & Mã giả, chọn một hoặc nhiều dòng C++ sẽ hiện nút giải thích,
kể cả khi mã đang được đối chiếu với một bước mô phỏng. Mã theo bước có thể lấy
từ mẫu mô phỏng đã lưu, nên backend đối chiếu nguồn với các mẫu thuộc bài học.
Action `explain_code` chỉ nhận `code_selection` gồm `start_line`, `end_line`
(tối đa 30 dòng). Backend lấy lại đoạn mã từ `code_lesson.source` hoặc mẫu mô
phỏng đã xuất bản,
không tin nội dung code do trình duyệt gửi. AI giải thích vai trò của đoạn mã
dựa trên code và lý thuyết bài học; kết quả hiện ngay dưới khối code.

Ví dụ yêu cầu: `{"action":"hint","question":"Vì sao nhánh này bị loại?",
"frame":{"message":"Đang thử cột 2","code_line":15,"values":"row: 1"}}`.
Nếu AI service chưa cấu hình hoặc quá hạn mức, API trả lỗi rõ ràng; không tự
sinh câu trả lời giả. Prompt nằm ở `ai/app/prompts/algorithm_tutor.py`.

## Dữ liệu ứng dụng và mô phỏng

Migration 0007 thêm `application_scenarios` (JSON list, mặc định rỗng).
API bài học trả trường này theo quyền xem bài hiện tại. Frontend dùng một
component chung để hiển thị danh sách, mô tả, sơ đồ và phát từng bước;
không chọn nội dung bằng khóa thuật toán hay nhúng 16 tình huống vào frontend.
Bài cũ chưa có tình huống vẫn hiển thị văn bản ứng dụng cũ.
Admin preview dùng tình huống từ API; lưu các mục văn bản không xóa tình huống.

Mỗi tình huống có bài toán, mô hình, cách giải, kết quả, giới hạn, các điểm/cạnh
và chuỗi bước. Các bước ứng dụng là kịch bản minh họa đã biên soạn, không phải
công cụ tối ưu lộ trình thực tế. Hamilton tìm tuyến hợp lệ, không hứa tuyến ngắn
nhất. Ví dụ Mã đi tuần và N-Queen nêu rõ các ràng buộc mô phỏng giả định.

Mẫu mô phỏng bài học N-Queen và Tổng tập con được sinh bằng tìm kiếm thực sự,
có trường hợp có nghiệm, vô nghiệm và trường hợp biên. Có thể tái tạo phần này:

```sh
python3 be/algorithms/tools/build_backtracking_samples.py
```

Giữ `fe/public/lesson-assets/` khi triển khai để hình tài liệu gốc hiển thị.
Các file C++ nằm cùng thuật toán trong `packages/algo-viz/algorithms/Backtracking/`.
N-Queen C++ đặt theo hàng; JavaScript cũ đặt theo cột, là hai cách tương đương.
Sum of subsets C++ yêu cầu số nguyên dương, xuất nghiệm theo chỉ số.

## Kiểm thử riêng

```sh
docker compose -p synapse-seed-check -f be/algorithms/data/seeds/compose.test.yml run --rm check python manage.py test algorithms --noinput --verbosity 1
docker compose -p synapse-seed-check -f be/algorithms/data/seeds/compose.test.yml run --rm check python manage.py makemigrations --check --dry-run
docker compose -p synapse-seed-check -f be/algorithms/data/seeds/compose.test.yml down
```

Cấu hình kiểm thử dùng PostgreSQL + pgvector riêng, không đọc `.env` hay dùng
volume DB đang chạy. Kiểm tra bao gồm preview không ghi, cập nhật có chủ đích,
chạy lại không đổi dữ liệu, rollback, bảo toàn metadata, migration từ schema cũ,
và tính hợp lệ toán học của kết quả minh họa cho cả bốn thuật toán.

## Cảnh ứng dụng phối cảnh

Cả 16 tình huống có `scene` gồm `kind`, `theme`, `title`; nhóm tổng tập con
thêm `values`, `target`, `unit`. Bốn kiểu chuyển động là thử tuyến đường,
đi tuần trên lưới, đặt vật theo ràng buộc và chọn/bỏ vật vào nhóm mục tiêu.
Mỗi tình huống có chủ đề hình riêng (nhà máy, mạch điện, khu phố, giao hàng,
robot, quân mã, kiểm thử, sân tập, cảm biến, lịch, trạm đo, quân hậu,
ngân sách, kiện hàng, thời gian, đối chiếu).

Frontend dựng SVG phối cảnh isometric với chuyển động theo bước, dùng chung
nút phát/dừng, thanh chọn bước và tốc độ hiện có. Đây là minh họa chiều sâu,
không phải mô hình WebGL có thể xoay camera. Dữ liệu cũ thiếu `scene` vẫn dùng
sơ đồ cũ. Cần cập nhật cả backend validator, frontend và seed; chỉ nạp JSON
với frontend cũ sẽ chưa thấy cảnh mới. Không cần migration mới ngoài 0007.


### Mỗi ví dụ có một mô phỏng riêng

`ApplicationScene` chọn renderer theo `scene.theme`: 16 renderer riêng trong
`ApplicationRouteScenes`, `ApplicationBoardScenes`, `ApplicationSubsetScenes`.
Chỉ chia sẻ vật thể và điều khiển; bố cục môi trường, thao tác và số liệu theo
ngữ cảnh của từng ví dụ. Kịch bản có thể có pha `plan`, `move`, `act`, `done`.
Nhà máy minh họa cả tìm tuyến/quay lui lẫn thực hiện tuyến đã tìm.

Ba ví dụ bảng mạch, việc vặt và giao hàng có `scene.alternatives`: một tuyến
ban đầu và một tuyến TSP được tính bằng xét hết hoán vị (tối đa sáu điểm ghé).
`scene.distance` ghi rõ metric, tỉ lệ và đơn vị; bảng mạch dùng Euclid, phố và
giao hàng dùng Manhattan. Frontend đi theo đường ngang/dọc cho hai cảnh phố.
Chọn tuyến khác đặt lại phát về bước đầu. Không đồng nhất Hamilton với TSP.

Dữ liệu Tổng tập con có tên đối tượng, giá trị, đơn vị và mục tiêu riêng;
kịch bản chọn/bỏ được sinh bằng DFS. Mã đi tuần có bốn tuyến hợp lệ đối xứng;
N-Queen sinh các bước đặt/gỡ thực sự theo ràng buộc cột và đường chéo.

Tái tạo riêng dữ liệu ứng dụng, không thay các phần bài học khác:

```sh
python3 be/algorithms/tools/build_application_scenes.py
```

Sau đó dùng lệnh `seed_backtracking --apply --update-existing` phía trên để
nạp cả bốn bài. File seed đầy đủ vẫn là nguồn của lệnh nạp này.
