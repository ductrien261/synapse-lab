'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Archive,
  ArrowRight,
  BoxArrowInRight,
  Broadcast,
  CheckCircleFill,
  Clipboard,
  ClockHistory,
  ExclamationTriangleFill,
  FileEarmarkText,
  LightningChargeFill,
  PeopleFill,
  PencilSquare,
  PlusLg,
  ThreeDots,
  X,
} from 'react-bootstrap-icons';
import { CreateSpaceDialog } from './CreateSpaceDialog';
import { classroomApi, type ClassroomDto } from './classroom-api';
import { SPACE_TEMPLATES, type SpacePurpose } from './space-data';

export function SpacesHub() {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [purpose, setPurpose] = useState<SpacePurpose>('group');
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [spaces, setSpaces] = useState<ClassroomDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let active = true;
    const loadSpaces = (initial = false) => {
      classroomApi.list()
        .then((result) => {
          if (active) setSpaces(result);
        })
        .catch((reason: unknown) => {
          if (active && initial) setError(reason instanceof Error ? reason.message : 'Không thể tải danh sách không gian.');
        })
        .finally(() => {
          if (active && initial) setLoading(false);
        });
    };
    loadSpaces(true);
    const timer = window.setInterval(() => loadSpaces(), 8000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const openCreate = (selectedPurpose: SpacePurpose = 'group') => {
    setPurpose(selectedPurpose);
    setDialogOpen(true);
  };

  const joinSpace = async (event: FormEvent) => {
    event.preventDefault();
    const code = joinCode.trim().replace(/\s/g, '').toUpperCase();
    if (code.length < 4) {
      setJoinError('Nhập mã phòng gồm ít nhất 4 ký tự.');
      return;
    }
    try {
      const classroom = await classroomApi.joinClassroom(code);
      router.push(`/spaces/${encodeURIComponent(classroom.code)}`);
    } catch (reason) {
      setJoinError(reason instanceof Error ? reason.message : 'Không thể tham gia không gian.');
    }
  };

  const createSpace = async (name: string, selectedPurpose: SpacePurpose) => {
    try {
      const classroom = await classroomApi.create({ name, purpose: selectedPurpose });
      setDialogOpen(false);
      router.push(`/spaces/${encodeURIComponent(classroom.code)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tạo không gian.');
    }
  };

  const renameSpace = async (space: ClassroomDto, name: string) => {
    const updated = await classroomApi.update(space.code, { name });
    setSpaces((current) => current.map((item) => item.id === updated.id ? updated : item));
    setNotice({ tone: 'success', message: `Đã đổi tên lớp thành “${updated.name}”.` });
  };

  const archiveSpace = async (space: ClassroomDto) => {
    await classroomApi.update(space.code, { is_archived: true });
    setSpaces((current) => current.filter((item) => item.id !== space.id));
    setNotice({ tone: 'success', message: `Đã lưu trữ “${space.name}”.` });
  };

  const copySpaceCode = async (space: ClassroomDto) => {
    if (!navigator.clipboard) throw new Error('Trình duyệt không hỗ trợ sao chép tự động.');
    await navigator.clipboard.writeText(space.code);
    setNotice({ tone: 'success', message: `Đã sao chép mã lớp ${space.code}.` });
  };

  const showActionError = (reason: unknown) => {
    setNotice({ tone: 'error', message: reason instanceof Error ? reason.message : 'Không thể thực hiện thao tác.' });
  };

  return (
    <div className="flex flex-col gap-7 pb-12">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F2258] via-[#163070] to-[#254B96] p-4 text-white shadow-sm sm:p-6 md:rounded-3xl md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-28 h-96 w-96 rounded-full bg-[#5B8FD8]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative z-10 grid items-end gap-7 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#E8F0FB]">
                <LightningChargeFill className="h-3 w-3 text-amber-300" /> Học · Chia sẻ · Thực hành cùng nhau
              </span>
            </div>
            <h1 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight md:text-[36px]">Một không gian cho mọi cách bạn muốn học và làm việc</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75">Tạo phòng để tự ôn bài, học nhóm, tập thuyết trình hoặc tổ chức một buổi hướng dẫn tương tác.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => openCreate()} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-[#1E3F82] shadow-lg shadow-black/10 transition-transform hover:-translate-y-0.5">
                <PlusLg className="h-4 w-4" /> Tạo không gian
              </button>
              <a href="#join-space" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/15">
                <BoxArrowInRight className="h-4 w-4" /> Tham gia bằng mã
              </a>
            </div>
          </div>

          <form id="join-space" onSubmit={joinSpace} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 text-sm font-bold"><Broadcast className="h-4 w-4 text-emerald-300" /> Có mã phòng?</div>
            <p className="mt-1 text-xs text-white/65">Nhập mã được chia sẻ để vào không gian ngay.</p>
            <div className="mt-3 flex gap-2">
              <input value={joinCode} onChange={(event) => { setJoinCode(event.target.value); setJoinError(''); }} aria-label="Mã phòng" placeholder="VD: BFS204" className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white px-4 py-3 text-sm font-extrabold uppercase tracking-[0.12em] text-[#0F2258] outline-none placeholder:font-medium placeholder:tracking-normal placeholder:text-stone-400 focus:ring-2 focus:ring-[#8CB4ED]" />
              <button type="submit" aria-label="Tham gia phòng" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#5B8FD8] text-white transition-colors hover:bg-[#4A7DC8]"><ArrowRight className="h-4 w-4" /></button>
            </div>
            {joinError && <p className="mt-2 text-[11px] font-semibold text-amber-200">{joinError}</p>}
          </form>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5B8FD8]">Bắt đầu nhanh</p>
            <h2 className="mt-1 text-xl font-extrabold text-stone-900">Bạn muốn tạo không gian nào?</h2>
          </div>
          <p className="hidden text-xs text-stone-400 md:block">Mọi mẫu đều có thể tùy chỉnh sau khi tạo</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {SPACE_TEMPLATES.map((template) => {
            const Icon = template.icon;
            return (
              <button type="button" key={template.id} onClick={() => openCreate(template.id)} className={`group flex min-h-44 flex-col rounded-2xl border p-4 text-left transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-[#1E3F82]/8 ${template.tone}`}>
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${template.iconTone}`}><Icon className="h-5 w-5" /></span>
                <h3 className="mt-4 text-sm font-extrabold text-stone-900">{template.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-500">{template.description}</p>
                <span className="mt-auto flex items-center gap-1 pt-3 text-[11px] font-bold text-[#1E3F82]">Dùng mẫu này <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" /></span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5B8FD8]">Của bạn</p>
            <h2 className="mt-1 text-xl font-extrabold text-stone-900">Không gian gần đây</h2>
          </div>
          <button type="button" className="text-xs font-bold text-[#1E3F82] hover:underline">Xem tất cả</button>
        </div>
        {error && <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">{error}</p>}
        {loading ? (
          <p className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-500">Đang tải không gian...</p>
        ) : spaces.length ? (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {spaces.map((space) => (
              <SpaceCard
                key={space.id}
                space={space}
                onRename={(name) => renameSpace(space, name)}
                onArchive={() => archiveSpace(space)}
                onCopyCode={() => copySpaceCode(space)}
                onError={showActionError}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">Bạn chưa có không gian nào. Hãy tạo phòng đầu tiên hoặc tham gia bằng mã.</p>
        )}
      </section>

      {dialogOpen && <CreateSpaceDialog open initialPurpose={purpose} onClose={() => setDialogOpen(false)} onCreate={createSpace} />}
      {notice && (
        <div role="status" className={`fixed bottom-6 right-6 z-[80] flex max-w-sm items-center gap-3 rounded-xl border bg-white px-4 py-3 text-sm font-semibold shadow-xl ${notice.tone === 'success' ? 'border-emerald-200 text-emerald-800' : 'border-rose-200 text-rose-700'}`}>
          {notice.tone === 'success' ? <CheckCircleFill className="h-4 w-4 shrink-0 text-emerald-500" /> : <ExclamationTriangleFill className="h-4 w-4 shrink-0 text-rose-500" />}
          <span>{notice.message}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Đóng thông báo" className="ml-1 rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"><X className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}

interface SpaceCardProps {
  space: ClassroomDto;
  onRename: (name: string) => Promise<void>;
  onArchive: () => Promise<void>;
  onCopyCode: () => Promise<void>;
  onError: (reason: unknown) => void;
}

function SpaceCard({ space, onRename, onArchive, onCopyCode, onError }: SpaceCardProps) {
  const template = SPACE_TEMPLATES.find((item) => item.id === space.purpose) ?? SPACE_TEMPLATES[0];
  const Icon = template.icon;
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [name, setName] = useState(space.name);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const closeMenu = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', closeMenu);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeMenu);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  const submitRename = async (event: FormEvent) => {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName || nextName === space.name) {
      if (nextName === space.name) setRenameOpen(false);
      return;
    }
    setSaving(true);
    try {
      await onRename(nextName);
      setRenameOpen(false);
    } catch (reason) {
      onError(reason);
    } finally {
      setSaving(false);
    }
  };

  const confirmArchive = async () => {
    setSaving(true);
    try {
      await onArchive();
      setArchiveOpen(false);
    } catch (reason) {
      onError(reason);
    } finally {
      setSaving(false);
    }
  };

  const copyCode = async () => {
    setMenuOpen(false);
    try {
      await onCopyCode();
    } catch (reason) {
      onError(reason);
    }
  };

  return (
    <>
    <article className="group relative rounded-2xl border border-stone-200/90 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all hover:border-[#5B8FD8]/50 hover:shadow-lg hover:shadow-[#1E3F82]/6">
      <div className="flex items-start justify-between p-4 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${template.iconTone}`}><Icon className="h-4 w-4" /></span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-extrabold text-stone-900">{space.name}</h3>
              {space.active_session && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-rose-600"><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />Live</span>}
            </div>
            <p className="mt-0.5 text-[11px] font-medium text-stone-400">{template.title} · {space.code}</p>
          </div>
        </div>
        <div ref={menuRef} className="relative">
          <button type="button" aria-label={`Tùy chọn cho ${space.name}`} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700"><ThreeDots className="h-4 w-4" /></button>
          {menuOpen && (
            <div className="absolute right-0 top-9 z-30 w-48 rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl shadow-stone-900/10">
              {space.is_owner && (
                <button type="button" onClick={() => { setName(space.name); setRenameOpen(true); setMenuOpen(false); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-stone-700 hover:bg-stone-50">
                  <PencilSquare className="h-3.5 w-3.5 text-stone-400" /> Đổi tên lớp
                </button>
              )}
              <button type="button" onClick={copyCode} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-stone-700 hover:bg-stone-50">
                <Clipboard className="h-3.5 w-3.5 text-stone-400" /> Sao chép mã lớp
              </button>
              {space.is_owner && (
                <>
                  <div className="my-1 border-t border-stone-100" />
                  <button type="button" onClick={() => { setArchiveOpen(true); setMenuOpen(false); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50">
                    <Archive className="h-3.5 w-3.5" /> Lưu trữ lớp
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className="mt-3 flex items-center gap-4 text-[11px] text-stone-500">
          <span className="flex items-center gap-1.5"><PeopleFill className="h-3 w-3" /> {space.member_count} thành viên</span>
          <span className="flex items-center gap-1.5"><FileEarmarkText className="h-3 w-3" /> {space.is_owner ? 'Chủ phòng' : 'Thành viên'}</span>
          <span className="ml-auto flex items-center gap-1.5"><ClockHistory className="h-3 w-3" /> {formatUpdatedAt(space.updated_at)}</span>
        </div>
      </div>
      <Link href={`/spaces/${space.code}`} className="flex items-center justify-between rounded-b-2xl border-t border-stone-100 px-4 py-3 text-xs font-bold text-[#1E3F82] transition-colors group-hover:bg-[#F8FAFF]">
        {space.active_session ? 'Vào phòng đang diễn ra' : 'Mở không gian'} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </article>
    {renameOpen && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-950/40 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby={`rename-${space.id}`}>
        <form onSubmit={submitRename} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div><h2 id={`rename-${space.id}`} className="text-lg font-extrabold text-stone-900">Đổi tên lớp</h2><p className="mt-1 text-xs text-stone-500">Tên mới sẽ hiển thị cho tất cả thành viên.</p></div>
            <button type="button" onClick={() => setRenameOpen(false)} aria-label="Đóng" className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100"><X className="h-5 w-5" /></button>
          </div>
          <label className="mt-5 block text-xs font-bold text-stone-700" htmlFor={`space-name-${space.id}`}>Tên lớp</label>
          <input id={`space-name-${space.id}`} autoFocus maxLength={200} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-900 outline-none focus:border-[#5B8FD8] focus:ring-2 focus:ring-[#5B8FD8]/15" />
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" disabled={saving} onClick={() => setRenameOpen(false)} className="rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-bold text-stone-600 hover:bg-stone-50">Hủy</button>
            <button type="submit" disabled={saving || !name.trim()} className="rounded-xl bg-[#1E3F82] px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu tên mới'}</button>
          </div>
        </form>
      </div>
    )}
    {archiveOpen && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-950/40 p-4 backdrop-blur-[2px]" role="alertdialog" aria-modal="true" aria-labelledby={`archive-${space.id}`}>
        <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><Archive className="h-5 w-5" /></span>
          <h2 id={`archive-${space.id}`} className="mt-4 text-lg font-extrabold text-stone-900">Lưu trữ “{space.name}”?</h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">Lớp sẽ được ẩn khỏi danh sách gần đây. Tài liệu và lịch sử buổi học vẫn được giữ lại.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" disabled={saving} onClick={() => setArchiveOpen(false)} className="rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-bold text-stone-600 hover:bg-stone-50">Hủy</button>
            <button type="button" disabled={saving} onClick={confirmArchive} className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Đang lưu trữ...' : 'Lưu trữ lớp'}</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(value));
}
