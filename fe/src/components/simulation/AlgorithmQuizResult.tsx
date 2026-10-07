'use client';

import { useState } from 'react';
import type { AlgorithmQuizQuestion, AlgorithmTutorSource } from '@/lib/algorithm-api';

export function AlgorithmQuizResult({ questions, sources = [] }: { questions: AlgorithmQuizQuestion[]; sources?: AlgorithmTutorSource[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const answered = Object.keys(answers).length;
  const correct = questions.filter((question, index) => answers[index] === question.correct_index).length;

  return <div className="space-y-4">
    {questions.map((question, questionIndex) => <section key={questionIndex} className="space-y-2 border-t border-stone-100 pt-3">
      <h4 className="font-semibold text-[#243355]">Câu {questionIndex + 1}. {question.content}</h4>
      {question.options.map((option, optionIndex) => <button
        key={optionIndex}
        type="button"
        disabled={answers[questionIndex] !== undefined}
        onClick={() => setAnswers(current => ({ ...current, [questionIndex]: optionIndex }))}
        className={`block w-full rounded-xl border p-2.5 text-left disabled:cursor-default ${answers[questionIndex] !== undefined && optionIndex === question.correct_index ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : answers[questionIndex] === optionIndex ? 'border-rose-300 bg-rose-50 text-rose-900' : 'border-stone-200 text-stone-700 hover:border-[#1E3F82]'}`}
      >{String.fromCharCode(65 + optionIndex)}. {option}</button>)}
      {answers[questionIndex] !== undefined && <p className="rounded-xl bg-stone-50 p-3 text-stone-700">{answers[questionIndex] === question.correct_index ? 'Đúng rồi. ' : 'Chưa đúng. '}{question.explanation}</p>}
      {answers[questionIndex] !== undefined && question.source_index && sources[question.source_index - 1] && <div className="rounded-lg border border-stone-200 bg-white p-2.5 text-[11px] text-stone-600">
        <span className="font-semibold text-[#1E3F82]">Nguồn: {sources[question.source_index - 1].title}</span>
        {question.source_quote && <p className="mt-1">“{question.source_quote}”</p>}
        {sources[question.source_index - 1].url && <a href={sources[question.source_index - 1].url} target="_blank" rel="noreferrer" className="mt-1 inline-block font-semibold text-[#1E3F82] hover:underline">Mở tài liệu ↗</a>}
      </div>}
    </section>)}
    {answered === questions.length && <p className="rounded-xl bg-[#E8F0FB] p-3 font-bold text-[#1E3F82]" role="status">Hoàn thành: {correct}/{questions.length} câu đúng.</p>}
  </div>;
}
