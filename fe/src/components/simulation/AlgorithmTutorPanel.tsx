'use client';

import { SimulationExplanation } from './SimulationExplanation';
import { useState } from 'react';
import { CardText, Cpu, JournalText, Lightbulb, QuestionCircle, SendFill } from 'react-bootstrap-icons';
import { algorithmTutorApi } from '@/lib/algorithm-api';
import type { AlgorithmCodeLesson, AlgorithmFlashcardOptions, AlgorithmLessonBlock, AlgorithmQuizOptions, AlgorithmScenarioOptions, AlgorithmTutorAction, AlgorithmTutorResult } from '@/lib/algorithm-api';
import type { SimulationFrame } from '@/lib/simulation';
import { AlgorithmQuizForm } from './AlgorithmQuizForm';
import { AlgorithmQuizResult } from './AlgorithmQuizResult';
import { AlgorithmFlashcards } from './AlgorithmFlashcards';
import { AlgorithmFlashcardForm } from './AlgorithmFlashcardForm';
import { AlgorithmScenarioForm } from './AlgorithmScenarioForm';

interface Props {
  algorithmPath: string;
  algorithmTitle: string;
  enabled: boolean;
  frame: SimulationFrame | null;
  codeLesson?: AlgorithmCodeLesson | Record<string, never>;
  blocks: AlgorithmLessonBlock[];
}

const tutorActions = [
  { key: 'quiz', label: 'Tạo bài tập trắc nghiệm', icon: QuestionCircle },
  { key: 'scenario', label: 'Tạo tình huống', icon: Lightbulb },
  { key: 'summary', label: 'Tóm tắt thuật toán', icon: JournalText },
  { key: 'flashcards', label: 'Tạo flashcard', icon: CardText },
] as const;

export function AlgorithmTutorPanel({ algorithmPath, algorithmTitle, enabled, frame, codeLesson, blocks }: Props) {
  const [userChatInput, setUserChatInput] = useState('');
  const [selectedQuickQuestion, setSelectedQuickQuestion] = useState<number | null>(null);
  const [selectedAction, setSelectedAction] = useState<AlgorithmTutorAction | null>(null);
  const [formOpen, setFormOpen] = useState<'quiz' | 'scenario' | 'flashcards' | null>(null);
  const [result, setResult] = useState<AlgorithmTutorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const explanation = codeLesson?.steps?.find(step => frame?.code.language === 'cpp' && frame.code.source === codeLesson.source && step.start_line <= frame.step.codeLine && frame.step.codeLine <= step.end_line);
  const headline = frame?.step.message ?? 'Chọn một bước mô phỏng để xem giải thích.';
  const analysis = {
    title: frame?.step.context.title ?? 'TỔNG QUAN',
    greeting: explanation?.note ?? '',
    highlightTitle: frame ? 'Trạng thái hiện tại' : '',
    highlightContent: frame ? frame.step.context.values.map(value => `${value.label}: ${value.value}`).join('\n') : '',
    quickQuestions: blocks.filter(block => block.kind === 'theory').slice(0, 3).map(block => ({ q: block.title, a: block.text })),
  };
  const handleQuickQuestionClick = (index: number) => setSelectedQuickQuestion(selected => selected === index ? null : index);
  const generate = async (action: AlgorithmTutorAction, question = '', options?: {
    quiz_options?: AlgorithmQuizOptions;
    scenario_options?: AlgorithmScenarioOptions;
    flashcard_options?: AlgorithmFlashcardOptions;
  }) => {
    if (!enabled || loading || !algorithmPath) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await algorithmTutorApi.generate(algorithmPath, {
        action,
        question: question.trim(),
        ...options,
        frame: frame ? {
          message: frame.step.message,
          code_line: frame.step.codeLine,
          values: frame.step.context.values.map(value => `${value.label}: ${value.value}`).join('; '),
        } : null,
      });
      setResult(data);
      setFormOpen(null);
      setUserChatInput('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tạo được nội dung. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };
  return (
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-4">
                    {/* AI Status Banner */}
                    <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#1E3F82] text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                        <Cpu className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-xs font-bold text-stone-900">
                          <span>Synapse AI Tutor</span>
                        </div>
                        <p className="text-[11px] text-stone-500 font-mono">
                          Giải thích theo bước đang xem
                        </p>
                      </div>
                    </div>

                    {/* Active Step Analysis Box */}
                    <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-stone-200/80 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between text-xs font-mono font-bold text-stone-500">
                        <span className="text-[#1E3F82]">{analysis.title}</span>
                        <span className="text-[10px] text-stone-400 font-normal">bước hiện tại</span>
                      </div>

                      {frame?.step.narration ? <SimulationExplanation narration={frame.step.narration} /> : <>
                        <div className="p-2.5 rounded-xl bg-white border border-stone-200 text-xs font-bold text-stone-800">💡 {headline}</div>
                        <p className="text-xs text-stone-700 leading-relaxed">{analysis.greeting}</p>
                      </>}

                      {/* Highlight Box for Relaxation / Core Concept */}
                      {analysis.highlightTitle && (
                        <div className="p-3 rounded-xl bg-[#FAFBF2] border border-[#D9E69B] text-xs font-mono text-stone-800 leading-relaxed shadow-2xs">
                          <div className="font-bold text-[#243355] mb-1">
                            {analysis.highlightTitle}
                          </div>
                          <p className="text-[11px] text-stone-600 whitespace-pre-line">
                            {analysis.highlightContent}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Quick Suggested Questions */}
                    <div className="flex flex-col gap-2">
                      <div className="text-[11px] font-mono font-bold text-stone-400 uppercase tracking-wider">
                        Gợi ý câu hỏi nhanh:
                      </div>
                      {analysis.quickQuestions.map((q, qIdx) => (
                        <div key={qIdx} className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => handleQuickQuestionClick(qIdx)}
                            className="text-left text-xs font-medium text-stone-700 hover:text-[#1E3F82] bg-stone-50 hover:bg-[#E8F0FB]/30 p-2.5 rounded-xl border border-stone-200/70 transition-all flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <span className="leading-snug">{q.q}</span>
                            <span className="text-[#1E3F82] font-bold shrink-0">→</span>
                          </button>
                          {selectedQuickQuestion === qIdx && (
                            <div className="mt-1.5 p-3 rounded-xl bg-white border border-stone-200 text-xs text-stone-600 leading-relaxed animate-fadeIn">
                              <strong className="text-[#1E3F82]">Trả lời:</strong> {q.a}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>


                  </div>

                  <div role="group" className="mt-auto flex min-w-0 gap-2 overflow-x-auto pb-1" aria-label="Chọn kiểu hỗ trợ học tập">
                    {tutorActions.map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={selectedAction === key}
                        onClick={() => {
                          setSelectedAction(key);
                          if (key === 'quiz' || key === 'scenario' || key === 'flashcards') {
                            setFormOpen(key);
                            setResult(null);
                            setError('');
                          } else {
                            setFormOpen(null);
                            void generate(key, userChatInput);
                          }
                        }}
                        disabled={!enabled || loading}
                        className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 ${selectedAction === key && formOpen === key ? 'border-rose-300 bg-rose-100 text-rose-800 shadow-sm' : 'border-rose-100 bg-rose-50 text-rose-700 hover:border-rose-200 hover:bg-rose-100'}`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />{label}
                      </button>
                    ))}
                  </div>

                  {formOpen === 'quiz' && <AlgorithmQuizForm
                    initialTopic={algorithmTitle}
                    disabled={!enabled || loading}
                    onSubmit={options => { void generate('quiz', '', { quiz_options: options }); }}
                    onCancel={() => setFormOpen(null)}
                  />}
                  {formOpen === 'scenario' && <AlgorithmScenarioForm
                    initialTopic={algorithmTitle}
                    disabled={!enabled || loading}
                    onSubmit={options => { void generate('scenario', '', { scenario_options: options }); }}
                    onCancel={() => setFormOpen(null)}
                  />}
                  {formOpen === 'flashcards' && <AlgorithmFlashcardForm
                    initialTopic={algorithmTitle}
                    disabled={!enabled || loading}
                    onSubmit={options => { void generate('flashcards', '', { flashcard_options: options }); }}
                    onCancel={() => setFormOpen(null)}
                  />}

                  {(loading || error || result) && <div className="max-h-[420px] overflow-y-auto rounded-2xl border border-stone-200 bg-white p-4 text-xs leading-relaxed" aria-live="polite">
                    {loading && <p className="text-stone-500">AI đang chuẩn bị nội dung theo bài học…</p>}
                    {error && <p role="alert" className="text-rose-700">{error}</p>}
                    {result && <div className="space-y-3">
                      <h3 className="font-bold text-[#243355]">{result.title}</h3>
                      <p className="whitespace-pre-wrap text-stone-700">{result.content}</p>
                      {result.questions && <AlgorithmQuizResult questions={result.questions} sources={result.sources} />}
                      {result.cards && <AlgorithmFlashcards cards={result.cards} sources={result.sources} />}
                    </div>}
                  </div>}

                  {/* Tutor composer */}
                  <div className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
                    <form onSubmit={event => { event.preventDefault(); void generate('ask', userChatInput); }} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={userChatInput}
                        disabled={!enabled || loading}
                        onChange={(e) => setUserChatInput(e.target.value)}
                        placeholder="Hỏi AI về thuật toán hoặc bước đang xem..."
                        aria-label="Câu hỏi cho AI Tutor"
                        className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs outline-none transition-colors focus:border-[#1E3F82] focus:bg-white"
                      />
                      <button
                        type="submit"
                        disabled={!enabled || loading || !userChatInput.trim()}
                        aria-label="Gửi câu hỏi cho AI Tutor"
                        title="Gửi yêu cầu tới trợ giảng thuật toán"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#243355] text-[#E8F0FB] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <SendFill className="h-3.5 w-3.5" />
                      </button>
                    </form>
                    <p className="mt-2 text-[11px] text-stone-400">{enabled ? 'Trắc nghiệm có phần chọn số câu và độ khó; ô này dùng để hỏi trực tiếp.' : 'Bản xem trước chưa gọi AI; mở bài học đã xuất bản để sử dụng.'}</p>
                  </div>
                </div>
  );
}
