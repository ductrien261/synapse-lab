import * as React from 'react';
import { useEffect, useRef } from 'react';
import {
  PluginApi,
  RESET_DATA_CHANNEL,
} from 'bigbluebutton-html-plugin-sdk';

interface PdfReaderPosition {
  ratio: number;
  page: number;
  changedAt: number;
}

interface GenericComponentLinkShareProps {
  link: string;
  pluginApi: PluginApi;
  isPresenter: boolean;
}

function GenericComponentLinkShare(props: GenericComponentLinkShareProps): React.ReactElement {
  const { link, pluginApi, isPresenter } = props;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const publishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPosition = useRef<PdfReaderPosition | null>(null);
  const {
    data: readerPositionChannel,
    pushEntry,
    replaceEntry,
    deleteEntry,
  } = pluginApi.useDataChannel<PdfReaderPosition>('pdfReaderPosition');
  const latestEntry = readerPositionChannel?.data?.[
    readerPositionChannel.data.length - 1
  ];
  const latestEntryRef = useRef(latestEntry);
  latestEntryRef.current = latestEntry;

  const sendPositionToReader = (position?: PdfReaderPosition) => {
    if (!position || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({
      type: 'synapse-pdf-reader-scroll',
      ratio: position.ratio,
      page: position.page,
    }, new URL(link, window.location.href).origin);
  };

  useEffect(() => {
    if (!isPresenter) sendPositionToReader(latestEntry?.payloadJson);
  }, [isPresenter, latestEntry?.payloadJson?.ratio, latestEntry?.payloadJson?.page]);

  useEffect(() => {
    if (!isPresenter) return undefined;
    deleteEntry([RESET_DATA_CHANNEL]);

    const publishPosition = () => {
      publishTimer.current = null;
      const position = pendingPosition.current;
      if (!position) return;
      const entry = latestEntryRef.current;
      if (entry) replaceEntry(entry.entryId, position);
      else pushEntry(position);
    };

    const handleReaderMessage = (event: MessageEvent) => {
      if (
        event.source !== iframeRef.current?.contentWindow
        || event.origin !== new URL(link, window.location.href).origin
        || event.data?.type !== 'synapse-pdf-reader-scroll'
      ) return;
      const ratio = Number(event.data.ratio);
      const page = Number(event.data.page);
      if (!Number.isFinite(ratio) || !Number.isFinite(page)) return;
      pendingPosition.current = {
        ratio: Math.max(0, Math.min(1, ratio)),
        page: Math.max(1, Math.round(page)),
        changedAt: Date.now(),
      };
      if (!publishTimer.current) publishTimer.current = setTimeout(publishPosition, 180);
    };

    window.addEventListener('message', handleReaderMessage);
    return () => {
      window.removeEventListener('message', handleReaderMessage);
      if (publishTimer.current) clearTimeout(publishTimer.current);
    };
  }, [isPresenter, link]);

  return (
    <div style={{
      background: 'white',
      width: '100%',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
    }}
    >
      <iframe
        ref={iframeRef}
        src={link}
        title="Tài liệu PDF đồng bộ"
        onLoad={() => {
          if (!isPresenter) sendPositionToReader(latestEntryRef.current?.payloadJson);
        }}
        style={{
          display: 'block',
          position: 'relative',
          width: '100%',
          height: '100%',
          border: 0,
          pointerEvents: isPresenter ? 'auto' : 'none',
        }}
      />
      {!isPresenter && (
        <div style={{
          position: 'absolute',
          top: 12,
          right: 14,
          zIndex: 2,
          padding: '6px 10px',
          border: '1px solid rgba(37, 99, 235, .22)',
          borderRadius: 999,
          background: 'rgba(239, 246, 255, .94)',
          color: '#1d4ed8',
          fontSize: 12,
          fontWeight: 650,
          boxShadow: '0 3px 12px rgba(15, 23, 42, .1)',
          pointerEvents: 'none',
        }}
        >
          Đang theo giáo viên
        </div>
      )}
    </div>
  );
}

export default GenericComponentLinkShare;
