import { ImageResponse } from 'next/og';

// Ảnh xem trước khi chia sẻ liên kết (Facebook, Zalo, Messenger...)
export const alt = 'Synapse Lab — Nền tảng học tập trực quan tích hợp AI';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: '#0B1A44',
          color: 'white',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', right: -120, top: -120, width: 520, height: 520, borderRadius: 9999, background: 'rgba(91,143,216,0.25)' }} />
        <div style={{ position: 'absolute', right: 140, bottom: -180, width: 380, height: 380, borderRadius: 9999, background: 'rgba(30,63,130,0.6)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 24, height: 24, borderRadius: 9999, border: '6px solid #1E3F82' }} />
          </div>
          <div style={{ fontSize: 36, fontWeight: 700 }}>Synapse Lab</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2 }}>Hiểu sâu hơn qua trực quan hóa và tương tác</div>
          <div style={{ fontSize: 30, color: 'rgba(255,255,255,0.75)' }}>Mô hình 3D · Mô phỏng từng bước · Trợ lý AI có dẫn nguồn</div>
        </div>
      </div>
    ),
    size,
  );
}
