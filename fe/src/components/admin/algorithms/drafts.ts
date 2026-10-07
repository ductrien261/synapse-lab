import { useEffect, useState } from 'react';
import { request } from '@/lib/api';
import type { AlgorithmCodeLesson, AlgorithmLessonBlock } from '@/lib/algorithm-api';
import { invalidateAlgoCatalog } from '@/lib/algo-catalog';

export const LESSON_FIELDS = [
  { key: 'title', label: 'Tên bài tiếng Việt', hint: 'Ví dụ: Bài toán N quân hậu', short: true },
  { key: 'summary', label: 'Tóm tắt', hint: 'Bài toán giải quyết điều gì? Người học sẽ hiểu được gì?' },
  { key: 'objectives', label: 'Mục tiêu & kiến thức nền', hint: 'Mục tiêu học tập, kiến thức cần biết trước khi bắt đầu.' },
  { key: 'problem', label: 'Phát biểu bài toán', hint: 'Mô tả yêu cầu, ràng buộc và điều kiện áp dụng.' },
  { key: 'inputOutput', label: 'Đầu vào & đầu ra', hint: 'Dữ liệu đầu vào hợp lệ và kết quả cần trả về.' },
  { key: 'example', label: 'Ví dụ minh họa', hint: 'Một ví dụ nhỏ, kết quả mong đợi và cách giải thích kết quả.' },
  { key: 'theory', label: 'Ý tưởng & cách giải', hint: 'Giải thích cách tiếp cận, các bước và lý do thuật toán đúng.' },
  { key: 'pseudocode', label: 'Mã giả', hint: 'Mô tả các bước độc lập với ngôn ngữ lập trình.' },
  { key: 'complexity', label: 'Độ phức tạp', hint: 'Thời gian tốt nhất / trung bình / xấu nhất, bộ nhớ và giả thiết.' },
  { key: 'applications', label: 'Ứng dụng & lưu ý', hint: 'Ứng dụng thực tế, giới hạn và lỗi người học thường gặp.' },
  { key: 'references', label: 'Nguồn tham khảo', hint: 'Tên tài liệu, tác giả, chương/mục, URL hoặc số trang, giấy phép.' },
] as const;
export type LessonField = typeof LESSON_FIELDS[number]['key'];
export type LessonDraft = Record<LessonField, string> & { updatedAt: string; blocks?: AlgorithmLessonBlock[]; codeLesson?: AlgorithmCodeLesson | Record<string, never>; status?: 'draft' | 'published' };
export type Drafts = Record<string, LessonDraft>;
export const EMPTY_DRAFT: LessonDraft = { title: '', summary: '', objectives: '', problem: '', inputOutput: '', example: '', theory: '', pseudocode: '', complexity: '', applications: '', references: '', updatedAt: '' };
interface StoredContent { code_lesson?: AlgorithmCodeLesson | Record<string, never>; lesson_blocks?: AlgorithmLessonBlock[]; lesson_fields: Record<LessonField, string>; updated_at: string; status: 'draft' | 'published' }
export function useDrafts(userId: string, reload = 0): { drafts: Drafts; loading: boolean; error: string } {
  const [result, setResult] = useState<{ drafts: Drafts; error: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    request<Record<string, StoredContent>>('/algorithms/admin-drafts/').then((contents) => {
      const drafts: Drafts = {};
      for (const [path, content] of Object.entries(contents)) {
        const fields = Object.fromEntries(LESSON_FIELDS.map(({ key }) => [key,
          typeof content.lesson_fields?.[key] === 'string' ? content.lesson_fields[key] : '',
        ])) as Record<LessonField, string>;
        drafts[path] = { ...fields, blocks: content.lesson_blocks ?? [], codeLesson: content.code_lesson, updatedAt: content.updated_at, status: content.status };
      }
      if (!cancelled) setResult({ drafts, error: '' });
    }).catch((error: unknown) => {
      if (!cancelled) setResult({ drafts: {}, error: error instanceof Error ? error.message : 'Không tải được nội dung bài học.' });
    });
    return () => { cancelled = true; };
  }, [userId, reload]);
  return { drafts: result?.drafts ?? {}, loading: !result, error: result?.error ?? '' };
}
export async function saveDraft(path: string, draft: LessonDraft, status: 'draft' | 'published' = 'draft'): Promise<LessonDraft> {
  const fields = Object.fromEntries(LESSON_FIELDS.map(({ key }) => [key, draft[key]]));
  const content = await request<StoredContent>(`/algorithms/${path}/`, {
    method: 'PUT', body: JSON.stringify({ lesson_fields: fields, lesson_blocks: draft.blocks ?? [], summary: draft.summary, theory: draft.theory, status }),
  });
  invalidateAlgoCatalog();
  return { ...content.lesson_fields, blocks: content.lesson_blocks ?? [], codeLesson: content.code_lesson, updatedAt: content.updated_at, status: content.status };
}
export function completion(draft?: LessonDraft): number { return draft ? LESSON_FIELDS.filter(({ key }) => draft[key].trim()).length : 0; }
