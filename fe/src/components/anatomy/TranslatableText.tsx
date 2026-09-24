'use client';

import { useState } from 'react';
import { Translate } from 'react-bootstrap-icons';
import { translateApi } from '@/lib/api';

// Bản dịch đã lấy trong phiên này (tránh gọi lại khi bấm qua lại)
const sessionCache = new Map<string, string>();

/** Đoạn văn tiếng Anh kèm nút gạt English ⇄ Tiếng Việt (dịch tự động). */
export function TranslatableText({ text, className = '' }: { text: string; className?: string }) {
  const [showVi, setShowVi] = useState(false);
  const [translated, setTranslated] = useState<string | null>(sessionCache.get(text) ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggle = async () => {
    if (showVi) {
      setShowVi(false);
      return;
    }
    setError('');
    if (translated) {
      setShowVi(true);
      return;
    }
    setLoading(true);
    try {
      const { translated: result } = await translateApi.translate(text, 'vi');
      sessionCache.set(text, result);
      setTranslated(result);
      setShowVi(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không dịch được');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-stone-400">
          {showVi ? 'Dịch tự động' : 'Bản gốc (English)'}
        </span>
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-stone-200 text-[11px] font-bold text-stone-600 hover:border-[#1E3F82]/40 hover:text-[#1E3F82] disabled:opacity-60 cursor-pointer transition-colors"
        >
          <Translate className={`w-3 h-3 ${loading ? 'animate-pulse' : ''}`} />
          {loading ? 'Đang dịch...' : showVi ? 'English' : 'Tiếng Việt'}
        </button>
      </div>
      <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">{showVi && translated ? translated : text}</p>
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
