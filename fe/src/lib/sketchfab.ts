// ============================================================
// SYNAPSE-LAB — Điều khiển mô hình Sketchfab qua Viewer API
// https://sketchfab.com/developers/viewer
// - Đọc danh sách chú thích (1), (2)... của mô hình
// - Biết người dùng vừa bấm chú thích nào (sự kiện annotationSelect)
// - Chủ động chuyển tới một chú thích (gotoAnnotation)
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';

const SCRIPT_URL = 'https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js';

export interface ViewerAnnotation {
  index: number;
  name: string;
  content: string;
}

interface RawAnnotation {
  name?: string;
  content?: { raw?: string } | string;
}

interface SketchfabApi {
  start: () => void;
  addEventListener: (event: string, cb: (...args: never[]) => void) => void;
  getAnnotationList: (cb: (err: unknown, list: RawAnnotation[]) => void) => void;
  gotoAnnotation: (index: number, options: Record<string, boolean>, cb?: (err: unknown) => void) => void;
  recenterCamera: (cb?: (err: unknown) => void) => void;
  hideAnnotationTooltips: (cb?: (err: unknown) => void) => void;
  showAnnotationTooltips: (cb?: (err: unknown) => void) => void;
}

interface SketchfabClient {
  init: (uid: string, options: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    Sketchfab?: new (version: string, iframe: HTMLIFrameElement) => SketchfabClient;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (window.Sketchfab) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const el = document.createElement('script');
      el.src = SCRIPT_URL;
      el.async = true;
      el.onload = () => resolve();
      el.onerror = () => {
        scriptPromise = null;
        reject(new Error('Không tải được Sketchfab Viewer API'));
      };
      document.head.appendChild(el);
    });
  }
  return scriptPromise;
}

export type ViewerStatus = 'loading' | 'ready' | 'error';

export function useSketchfabViewer(uid: string) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const apiRef = useRef<SketchfabApi | null>(null);
  const suppressNext = useRef(false);
  const [status, setStatus] = useState<ViewerStatus>('loading');
  const [annotations, setAnnotations] = useState<ViewerAnnotation[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  // Ai cần biết mỗi lần người dùng chọn chú thích (kể cả chọn lại số cũ) thì đăng ký ở đây
  const pickListeners = useRef(new Set<(index: number) => void>());

  useEffect(() => {
    let cancelled = false;

    loadScript()
      .then(() => {
        const iframe = iframeRef.current;
        if (cancelled || !iframe || !window.Sketchfab) return;
        const client = new window.Sketchfab('1.12.1', iframe);
        client.init(uid, {
          autostart: 1,
          preload: 1,
          ui_infos: 0,
          ui_hint: 0,
          ui_help: 0,
          ui_settings: 0,
          ui_vr: 0,
          ui_ar: 0,
          annotations_visible: 1,
          ui_annotations: 0, // tắt thanh tên chú thích ở đáy (đã có thanh bộ phận riêng, và để ôn tập không lộ tên)
          success: (api: SketchfabApi) => {
            apiRef.current = api;
            api.start();
            api.addEventListener('viewerready', () => {
              api.getAnnotationList((err, list) => {
                if (cancelled) return;
                if (!err && Array.isArray(list)) {
                  setAnnotations(
                    list.map((a, index) => ({
                      index,
                      name: a.name ?? `Chú thích ${index + 1}`,
                      content: typeof a.content === 'string' ? a.content : a.content?.raw ?? '',
                    })),
                  );
                }
                setStatus('ready');
              });
            });
            api.addEventListener('annotationSelect', ((index: number) => {
              if (cancelled) return;
              if (suppressNext.current) {
                suppressNext.current = false;
                return;
              }
              setSelected(index >= 0 ? index : null);
              if (index >= 0) pickListeners.current.forEach((fn) => fn(index));
            }) as (...args: never[]) => void);
          },
          error: () => {
            if (!cancelled) setStatus('error');
          },
        });
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
      apiRef.current = null;
    };
  }, [uid]);

  /** Chọn chú thích từ danh sách bên ngoài: xoay camera tới đó. */
  const select = useCallback((index: number) => {
    setSelected(index);
    pickListeners.current.forEach((fn) => fn(index));
    // Sketchfab cũng bắn annotationSelect cho lệnh này -> chặn để không đếm 2 lần
    suppressNext.current = true;
    apiRef.current?.gotoAnnotation(index, { preventCameraAnimation: false }, () => {
      setTimeout(() => {
        suppressNext.current = false;
      }, 50);
    });
  }, []);

  /** Bỏ trạng thái đang chọn ở giao diện Synapse mà không điều khiển camera. */
  const clearSelection = useCallback(() => {
    setSelected(null);
  }, []);

  /** Về góc nhìn ban đầu của mô hình. */
  const recenter = useCallback(() => {
    apiRef.current?.recenterCamera();
  }, []);

  /** Ẩn / hiện chữ tên của chú thích trên mô hình (số (1), (2)... vẫn bấm được). Dùng khi ôn tập. */
  const setLabelsVisible = useCallback((visible: boolean) => {
    const api = apiRef.current;
    if (!api) return;
    if (visible) api.showAnnotationTooltips();
    else api.hideAnnotationTooltips();
  }, []);

  /** Đăng ký nhận sự kiện "người dùng vừa chọn chú thích". Trả về hàm hủy đăng ký. */
  const onPick = useCallback((fn: (index: number) => void) => {
    pickListeners.current.add(fn);
    return () => {
      pickListeners.current.delete(fn);
    };
  }, []);

  return { iframeRef, status, annotations, selected, select, clearSelection, recenter, onPick, setLabelsVisible };
}

/**
 * Đọc danh sách chú thích của 1 mô hình trong một iframe tạm (dùng cho "Đồng bộ tất cả" ở trang admin).
 * Tự hủy nếu quá thời gian (mô hình nặng / lỗi mạng).
 */
export async function readModelAnnotations(uid: string, iframe: HTMLIFrameElement, timeoutMs = 60000): Promise<ViewerAnnotation[]> {
  await loadScript();
  if (!window.Sketchfab) throw new Error('Không tải được Sketchfab Viewer API');
  const Client = window.Sketchfab;
  return new Promise<ViewerAnnotation[]>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Quá thời gian tải mô hình')), timeoutMs);
    const client = new Client('1.12.1', iframe);
    client.init(uid, {
      autostart: 1,
      preload: 0,
      ui_infos: 0,
      ui_controls: 0,
      ui_annotations: 0,
      success: (api: SketchfabApi) => {
        api.start();
        api.addEventListener('viewerready', () => {
          api.getAnnotationList((err, list) => {
            clearTimeout(timer);
            if (err || !Array.isArray(list)) return reject(new Error('Không đọc được chú thích'));
            resolve(
              list.map((a, index) => ({
                index,
                name: a.name ?? `Chú thích ${index + 1}`,
                content: typeof a.content === 'string' ? a.content : a.content?.raw ?? '',
              })),
            );
          });
        });
      },
      error: () => {
        clearTimeout(timer);
        reject(new Error('Sketchfab không mở được mô hình'));
      },
    });
  });
}
