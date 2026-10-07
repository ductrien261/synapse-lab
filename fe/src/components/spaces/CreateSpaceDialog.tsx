'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Check2, X } from 'react-bootstrap-icons';
import { SPACE_TEMPLATES, type SpacePurpose } from './space-data';

interface Props {
  open: boolean;
  initialPurpose?: SpacePurpose;
  onClose: () => void;
  onCreate: (name: string, purpose: SpacePurpose) => void;
}

export function CreateSpaceDialog({ open, initialPurpose = 'group', onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState<SpacePurpose>(initialPurpose);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onCreate(trimmedName, purpose);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="create-space-title">
      <button type="button" aria-label="Đóng hộp thoại" onClick={onClose} className="absolute inset-0 bg-[#0F2258]/45 backdrop-blur-[2px]" />
      <form onSubmit={submit} className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-[#0F2258]/25">
        <div className="flex items-start justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#5B8FD8]">Không gian mới</p>
            <h2 id="create-space-title" className="mt-1 text-xl font-extrabold text-stone-900">Bạn muốn làm gì hôm nay?</h2>
            <p className="mt-1 text-xs text-stone-500">Mục đích chỉ giúp chuẩn bị bố cục ban đầu. Bạn có thể đổi mọi thứ sau đó.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <fieldset>
            <legend className="mb-2 text-xs font-bold text-stone-700">Chọn mục đích</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SPACE_TEMPLATES.map((template) => {
                const Icon = template.icon;
                const selected = purpose === template.id;
                return (
                  <button
                    type="button"
                    key={template.id}
                    onClick={() => setPurpose(template.id)}
                    className={`relative flex items-center gap-3 rounded-2xl border p-3 text-left transition-all ${selected ? 'border-[#1E3F82] bg-[#F4F7FC] ring-2 ring-[#1E3F82]/10' : 'border-stone-200 hover:border-[#5B8FD8]/60 hover:bg-stone-50'}`}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${template.iconTone}`}><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-stone-800">{template.title}</span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-stone-500">{template.description}</span>
                    </span>
                    {selected && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#1E3F82] text-white"><Check2 className="h-3 w-3" /></span>}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="block">
            <span className="mb-2 block text-xs font-bold text-stone-700">Tên không gian</span>
            <input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Ví dụ: Mock present đồ án cuối kỳ" className="w-full rounded-xl border border-stone-200 bg-[#F9FBFF] px-4 py-3 text-sm outline-none transition-all placeholder:text-stone-400 focus:border-[#5B8FD8] focus:ring-2 focus:ring-[#5B8FD8]/15" />
          </label>
        </div>

        <div className="flex items-center justify-between border-t border-stone-100 bg-stone-50/70 px-6 py-4">
          <p className="hidden text-[11px] text-stone-500 sm:block">Bạn sẽ là chủ phòng và có thể mời thêm người sau.</p>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-bold text-stone-600 hover:bg-stone-50">Hủy</button>
            <button type="submit" disabled={!name.trim()} className="rounded-xl bg-[#1E3F82] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#163070] disabled:cursor-not-allowed disabled:opacity-40">Tạo không gian</button>
          </div>
        </div>
      </form>
    </div>
  );
}
