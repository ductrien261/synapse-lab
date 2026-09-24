# SYNAPSE-LAB AI service

"Bộ não" AI của SYNAPSE-LAB: FastAPI + LangChain + LangGraph, theo dõi bằng Langfuse.

```
trình duyệt ──► be (Django: đăng nhập, hạn mức, ghi nhật ký, CSDL) ──► ai (service này) ──► Groq / Gemini
                                                                        │
                                                   kho giáo trình (Neon, CHỈ ĐỌC)
```

- Chỉ `be` gọi vào service này (header `X-Internal-Token`), trình duyệt không gọi trực tiếp.
- Service **không ghi** CSDL: mọi phản hồi trả kèm `meta.usage` (token từng lần gọi model) để `be` ghi nhật ký, tính tiền, trừ hạn mức.
- Cache (dịch câu hỏi...) nằm trong Redis.

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `app/llm/` | gọi LLM qua LangChain (Groq), ghi token, trace Langfuse |
| `app/tools/` | tìm kiếm lai trong giáo trình, embedding, dịch, cache |
| `app/graphs/` | các quy trình LangGraph (viết nháp; sắp có: gia sư, ra đề, chấm bài, hồ sơ học tập) |
| `app/prompts/` | prompt có `VERSION` — đổi prompt thì tăng version để so sánh trên Langfuse |
| `app/verify/` | kiểm chứng bằng quy tắc (trích dẫn...) |

## API (nội bộ)

| Method | Đường dẫn | Việc |
|---|---|---|
| GET | `/health` | tình trạng cấu hình |
| POST | `/v1/translate` | dịch đoạn văn |
| POST | `/v1/search` | tìm lai trong giáo trình |
| POST | `/v1/draft/structure` | AI viết nháp nội dung cấu trúc giải phẫu |

## Chạy & kiểm thử

Chạy cùng cả hệ thống: `docker compose up -d --build ai` (cổng 8100, xem `/docs`).

Kiểm thử (không cần mạng/DB):

```bash
cd ai
uv sync
uv run pytest
```

## Langfuse

Thêm `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY` (và `LANGFUSE_HOST` nếu không dùng cloud mặc định) vào `.env` gốc.
Không có key thì mọi thứ vẫn chạy, chỉ không có trace.
