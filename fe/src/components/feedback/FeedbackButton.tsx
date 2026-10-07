'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useId, useState, useSyncExternalStore } from 'react';
import { ChatSquareText, CheckCircleFill, XLg } from 'react-bootstrap-icons';
import { getAccessToken } from '@/lib/api';
import { track } from '@/lib/analytics';
import { FEEDBACK_KINDS, feedbackApi, type FeedbackKind } from '@/lib/feedback';

const noop = () => () => {};

/** Nút Góp ý nổi ở góc màn hình: gửi kèm trang đang xem để đội ngũ dễ tái hiện. */
export function FeedbackButton() {
  const pathname = usePathname();
  const signedIn = useSyncExternalStore(noop, () => Boolean(getAccessToken()), () => false);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>('bug');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const close = () => {
    setOpen(false);
    if (sent) {
      setSent(false);
      setMessage('');
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 5) {
      setError('Vui lòng mô tả chi tiết hơn một chút.');
      return;
    }
    setSending(true);
    setError('');
    try {
      await feedbackApi.submit({
        kind,
        message: message.trim(),
        email: signedIn ? undefined : email.trim() || undefined,
        page_url: `${pathname}${typeof window !== 'undefined' ? window.location.search : ''}`,
      });
      track('feedback_sent', { kind });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chưa gửi được, vui lòng thử lại.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls={id}
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-[#0F2258] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_-8px_rgba(15,34,88,0.5)] transition-transform hover:-translate-y-0.5 print:hidden"
      >
        {open ? <XLg className="h-4 w-4" /> : <ChatSquareText className="h-4 w-4" />}
        <span className="hidden sm:inline">Góp ý</span>
        <span className="sr-only sm:hidden">Góp ý</span>
      </button>

      {open && (
        <div
          id={id}
          role="dialog"
          aria-label="Gửi góp ý"
          className="fixed bottom-20 right-5 z-50 w-[min(380px,calc(100vw-40px))] rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_64px_-16px_rgba(15,34,88,0.35)]"
        >
          {sent ? (
            <div className="py-6 text-center">
              <CheckCircleFill className="mx-auto h-10 w-10 text-emerald-600" />
              <p className="mt-4 font-semibold text-[#0F2258]">Cảm ơn bạn đã góp ý!</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">Đội ngũ Synapse Lab sẽ xem xét và cải thiện sớm nhất có thể.</p>
              <button type="button" onClick={close} className="mt-5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[#0F2258] hover:border-[#1E3F82]">
                Đóng
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div>
                <p className="font-semibold text-[#0F2258]">Góp ý cho Synapse Lab</p>
                <p className="mt-1 text-xs text-slate-500">Trang bạn đang xem sẽ được gửi kèm để chúng tôi xử lý nhanh hơn.</p>
              </div>
              <fieldset>
                <legend className="sr-only">Loại góp ý</legend>
                <div className="flex flex-wrap gap-2">
                  {FEEDBACK_KINDS.map((k) => (
                    <button
                      key={k.key}
                      type="button"
                      onClick={() => setKind(k.key)}
                      aria-pressed={kind === k.key}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        kind === k.key ? 'border-[#1E3F82] bg-[#1E3F82] text-white' : 'border-slate-200 text-slate-600 hover:border-[#1E3F82]'
                      }`}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Nội dung
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={3000}
                  placeholder="Mô tả vấn đề hoặc đề xuất của bạn..."
                  className="resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] font-normal focus:border-[#1E3F82] focus:outline-none focus:ring-2 focus:ring-[#1E3F82]/10"
                />
              </label>
              {!signedIn && (
                <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                  Email để nhận phản hồi <span className="font-normal text-slate-400">(không bắt buộc)</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] font-normal focus:border-[#1E3F82] focus:outline-none focus:ring-2 focus:ring-[#1E3F82]/10"
                  />
                </label>
              )}
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <button
                type="submit"
                disabled={sending}
                className="rounded-lg bg-[#1E3F82] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#163070] disabled:opacity-60"
              >
                {sending ? 'Đang gửi...' : 'Gửi góp ý'}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
