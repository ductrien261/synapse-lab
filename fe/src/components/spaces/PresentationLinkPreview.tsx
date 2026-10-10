'use client';

import { BoxArrowUpRight, Link45deg } from 'react-bootstrap-icons';
import { safePresentationUrl, youtubeEmbedUrl } from './presentation-links';

interface Props {
  title: string;
  url: string | null | undefined;
  fitStage?: boolean;
}

export function PresentationLinkPreview({ title, url, fitStage = false }: Props) {
  const safeUrl = safePresentationUrl(url);
  const embedUrl = youtubeEmbedUrl(url);

  if (!safeUrl) return <p className="m-auto rounded-xl bg-white p-5 text-sm text-slate-600">Liên kết này không hợp lệ hoặc không dùng HTTPS.</p>;

  if (embedUrl) return <div className={`m-auto flex w-full max-w-[1100px] flex-col gap-3 ${fitStage ? 'h-full min-h-0' : ''}`}>
    <div className={`${fitStage ? 'min-h-0 flex-1' : 'aspect-video'} w-full overflow-hidden rounded-xl bg-black shadow-md`}>
      <iframe src={embedUrl} title={title} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
    </div>
    <a href={safeUrl.toString()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 self-end text-xs font-semibold text-blue-800 hover:underline"><BoxArrowUpRight size={14} />Mở trên YouTube</a>
  </div>;

  return <div className="m-auto w-full max-w-[560px] rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-800"><Link45deg size={26} /></span>
    <h3 className="mt-4 break-words text-base font-bold text-slate-900">{title}</h3>
    <p className="mt-1 truncate text-xs text-slate-500">{safeUrl.hostname}</p>
    <a href={safeUrl.toString()} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#1E3F82] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#19356D]"><BoxArrowUpRight size={14} />Mở liên kết</a>
  </div>;
}
