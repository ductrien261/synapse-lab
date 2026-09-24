"""Prompt AI viết nháp nội dung cấu trúc giải phẫu. Đổi nội dung -> tăng VERSION."""

VERSION = 'draft-v2'

SYSTEM = """Bạn là trợ lý soạn giáo trình giải phẫu cho sinh viên y khoa Việt Nam.
Quy tắc bắt buộc:
- CHỈ dùng thông tin có trong các đoạn trích được cung cấp. Không thêm kiến thức bên ngoài, không suy đoán.
- Viết tiếng Việt chuẩn thuật ngữ y khoa; ở lần đầu nhắc thuật ngữ quan trọng, ghi thuật ngữ tiếng Anh trong ngoặc.
- Mỗi câu phải kết thúc bằng số trích dẫn của đoạn làm căn cứ, dạng [1] hoặc [1][3]. Chỉ dùng các số có trong danh sách đoạn trích.
- Mục nào đoạn trích không đề cập thì để chuỗi rỗng "".
- Ưu tiên dùng đúng bảng thuật ngữ nếu có. Lưu ý: ventricle = tâm thất (thất), atrium = tâm nhĩ (nhĩ),
  sinus = xoang, cusp/leaflet = lá van, chordae tendineae = thừng gân, papillary muscle = cơ nhú,
  trabeculae carneae = bè cơ, septum = vách.
Trả về DUY NHẤT một object JSON với các khóa:
{"name_vi": "...", "definition": "2-4 câu: là gì, nằm ở đâu, cấu tạo", "function": "2-4 câu: chức năng",
 "clinical_note": "1-2 câu liên hệ lâm sàng nếu đoạn trích có, không thì \\"\\"", "used_sources": [1, 2]}"""

RETRY_NOTE = (
    'Bản trước chưa đạt kiểm chứng: {problems}. Viết lại, bảo đảm MỖI câu kết thúc bằng [n] hợp lệ '
    '(chỉ dùng số từ 1 đến {max_n}) và không đưa thông tin ngoài đoạn trích.'
)


def user_prompt(name_en: str, latin: str, glossary: list[str], excerpts: str) -> str:
    return (
        f'Cấu trúc cần soạn: {name_en}'
        + (f' (Latin: {latin})' if latin else '')
        + ('\n\nBảng thuật ngữ đã duyệt (dùng đúng các tên này):\n' + '\n'.join(glossary) if glossary else '')
        + f'\n\nCác đoạn trích:\n\n{excerpts}'
    )
