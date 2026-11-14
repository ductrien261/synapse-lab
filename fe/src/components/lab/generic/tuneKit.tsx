'use client';

import type { ReactNode } from 'react';
import { Card, Notice, PrimaryButton } from '../shared/LabUi';

/** Mọi mẫu mô phỏng của bước thử tự do đều trả về cùng một bộ này cho màn hình chung. */
export interface TuneKit {
  viewport: ReactNode;
  panel: ReactNode;
  /** Số liệu đã tính sẵn cho trợ lý AI (không chứa gì cần AI tự tính) */
  getState: () => Record<string, unknown>;
  /** Gọi khi vào bước */
  reset: () => void;
  /** Gọi khi rời bước */
  stop: () => void;
}

export interface TuneArgs {
  /** Đang ở bước thử tự do */
  active: boolean;
  /** Đã đi dây xong chưa (chưa thì không cho chạy) */
  wired: boolean;
  wiringProgress: string;
  onGoWire: () => void;
  /** Cảnh 3D của bài (dùng cho mẫu có khung nhìn 3D) */
  scene: ReactNode;
}

/** Thẻ chặn khi chưa đi dây xong: dùng chung cho mọi mẫu */
export function WiringGate({ progress, onGoWire }: { progress: string; onGoWire: () => void }) {
  return (
    <Card tone="accent">
      <Notice ok={false}>Hệ thống chưa có điện vì chưa đi dây xong ({progress}). Hãy đi dây rồi quay lại đây để chạy.</Notice>
      <PrimaryButton onClick={onGoWire}>Đến bước đi dây</PrimaryButton>
    </Card>
  );
}
