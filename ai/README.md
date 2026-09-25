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
| `app/graphs/` | các quy trình LangGraph: viết nháp, gia sư, kiểm tra nhanh, ra đề ôn tập, chấm tự luận |
| `app/prompts/` | prompt có `VERSION` — đổi prompt thì tăng version để so sánh trên Langfuse |
| `app/verify/` | kiểm chứng bằng quy tắc (trích dẫn...) |

## API (nội bộ)

| Method | Đường dẫn | Việc |
|---|---|---|
| GET | `/health` | tình trạng cấu hình |
| POST | `/v1/translate` | dịch đoạn văn |
| POST | `/v1/search` | tìm lai trong giáo trình |
| POST | `/v1/draft/structure` | AI viết nháp nội dung cấu trúc giải phẫu |
| POST | `/v1/tutor/ask` | Gia sư Hỏi AI — trả lời dạng stream (SSE: status, token, replace, done, error) |
| POST | `/v1/tutor/quick-check` | 1 câu trắc nghiệm kiểm tra nhanh từ nguồn của câu trả lời |
| POST | `/v1/quiz/generate` | ra câu ôn tập (trắc nghiệm / tình huống / tự luận), nhắm vào hiểu nhầm của người học |
| POST | `/v1/quiz/grade` | chấm tự luận theo rubric, phát hiện hiểu nhầm |

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
