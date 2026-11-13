'use client';

import { useState } from 'react';
import { CAR, KP_SCALE, type CarState, type Pt } from '@/lib/lab/car-spec';
import { Card, Slider } from '../shared/LabUi';

/** Tỉ lệ phóng to: số điểm ảnh cho mỗi mét */
const K = 1700;
const W = 320;
const H = 230;
const CX = W / 2;
const CY = 140;
const WEIGHTS = [2, 1, 0, -1, -2];

/** Vị trí ngang (m, dương là bên trái xe) và trọng số của mắt thứ i. */
const lateral = (i: number) => (2 - i) * CAR.sensorGap;
const sx = (ly: number) => CX - ly * K;
const sy = (lx: number) => CY - (lx - CAR.sensorAhead) * K;

/** Sai số của cảm biến: trung bình trọng số các mắt đang thấy vạch (giống bộ điều khiển trong mô phỏng). */
function errorOf(sensors: boolean[]) {
  const on = sensors.map((b, i) => (b ? WEIGHTS[i] : null)).filter((w): w is number => w !== null);
  return { on, error: on.length ? on.reduce((a, b) => a + b, 0) / on.length : null };
}

const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

function Figure({ sensors, children }: { sensors: boolean[]; children: React.ReactNode }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg bg-stone-100" role="img" aria-label="Cảnh phóng to: năm cảm biến nhìn xuống vạch">
      <defs>
        <clipPath id="scan-clip">
          <rect x={0} y={0} width={W} height={H} rx={8} />
        </clipPath>
      </defs>
      <g clipPath="url(#scan-clip)">
        {children}
        {/* thân xe nhìn xuyên từ trên xuống */}
        <rect x={CX - 0.065 * K} y={sy(0.105)} width={0.13 * K} height={H} fill="none" stroke="#64748B" strokeOpacity={0.6} strokeDasharray="5 4" />
        {sensors.map((on, i) => (
          <g key={i}>
            <circle cx={sx(lateral(i))} cy={CY} r={9} fill={on ? '#EF4444' : '#FFFFFF'} stroke="#0F172A" strokeWidth={1.5} />
            <text x={sx(lateral(i))} y={CY + 26} textAnchor="middle" fontSize={11} fill="#475569" fontWeight={600}>
              {sign(WEIGHTS[i])}
            </text>
          </g>
        ))}
        <text x={10} y={20} fontSize={11} fill="#64748B">
          Nhìn từ trên xuống, phóng to
        </text>
      </g>
    </svg>
  );
}

function Explain({ sensors, kp, vl, vr }: { sensors: boolean[]; kp: number; vl?: number; vr?: number }) {
  const { on, error } = errorOf(sensors);
  const steer = error === null ? null : kp * KP_SCALE * error;
  return (
    <div className="flex flex-col gap-1.5 text-xs leading-relaxed text-stone-600">
      <p>
        Mắt nào đè lên vạch đen thì sáng đỏ. Mỗi mắt có một trọng số: bên trái dương, bên phải âm, giữa bằng 0.
      </p>
      {error === null ? (
        <p>
          <b>Không mắt nào thấy vạch.</b> Xe bẻ lái hết cỡ về phía lần cuối nó còn thấy vạch. Quá 0,5 giây vẫn không thấy thì coi như lạc.
        </p>
      ) : (
        <p>
          Sai số <b>e</b> = trung bình trọng số các mắt thấy vạch = ({on.map(sign).join(' ')}) ÷ {on.length} = <b>{sign(Number(error.toFixed(1)))}</b>.{' '}
          {error === 0 ? 'Vạch nằm giữa xe nên xe đi thẳng.' : error > 0 ? 'Vạch lệch về bên trái.' : 'Vạch lệch về bên phải.'}
        </p>
      )}
      {steer !== null && (
        <p>
          Bẻ lái = Kp × 0,12 × e = {kp.toFixed(1)} × 0,12 × {error!.toFixed(1)} = <b>{sign(Number(steer.toFixed(2)))} m/s</b>.{' '}
          {steer === 0
            ? 'Hai bánh cùng tốc độ nên xe đi thẳng.'
            : `Bánh trái chạy ${steer > 0 ? 'chậm' : 'nhanh'} đi, bánh phải ${steer > 0 ? 'nhanh' : 'chậm'} đi cùng một lượng đó, nên xe quẹo ${steer > 0 ? 'trái' : 'phải'} về phía vạch.`}
        </p>
      )}
      {vl !== undefined && vr !== undefined && (
        <p>
          Tốc độ hai bánh lúc này: trái <b>{vl.toFixed(2)}</b> m/s, phải <b>{vr.toFixed(2)}</b> m/s.
        </p>
      )}
      <p>Thành phần vi phân Kd cộng thêm một chút bẻ lái ngược lại khi sai số đang đổi nhanh, để xe không lắc qua lắc lại.</p>
    </div>
  );
}

/** Cảnh phóng to trực tiếp theo mô phỏng đang chạy. */
export function ScanLive({ sim, track, kp }: { sim: CarState; track: Pt[]; kp: number }) {
  const cos = Math.cos(sim.th);
  const sin = Math.sin(sim.th);
  // Đưa các điểm của đường đua về hệ tọa độ của xe, giữ những điểm gần cảm biến
  const runs: string[] = [];
  let cur = '';
  for (let i = 0; i <= track.length; i++) {
    const p = track[i % track.length];
    const dx = p.x - sim.x;
    const dy = p.y - sim.y;
    const lx = dx * cos + dy * sin;
    const ly = -dx * sin + dy * cos;
    const inside = Math.abs(ly) < 0.14 && lx > CAR.sensorAhead - 0.12 && lx < CAR.sensorAhead + 0.1;
    if (inside) cur += `${cur ? 'L' : 'M'}${sx(ly).toFixed(1)} ${sy(lx).toFixed(1)}`;
    else if (cur) {
      runs.push(cur);
      cur = '';
    }
  }
  if (cur) runs.push(cur);
  return (
    <Card title="Nguyên lý dò vạch (phóng to)">
      <Figure sensors={sim.sensors}>
        {runs.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#1F2937" strokeWidth={CAR.lineWidth * K} strokeLinejoin="round" />
        ))}
      </Figure>
      <Explain sensors={sim.sensors} kp={kp} vl={sim.vl} vr={sim.vr} />
    </Card>
  );
}

/** Thử nghiệm tự tay: kéo vạch lệch khỏi tâm xe và xem cảm biến phản ứng ra sao. */
export function ScanDemo() {
  const [offsetCm, setOffsetCm] = useState(2);
  const [kp, setKp] = useState(5);
  const line = offsetCm / 100;
  const sensors = [0, 1, 2, 3, 4].map((i) => Math.abs(lateral(i) - line) < CAR.lineWidth / 2);
  return (
    <Card title="Thử: xe nhìn thấy vạch như thế nào?">
      <Figure sensors={sensors}>
        <rect x={sx(line) - (CAR.lineWidth * K) / 2} y={0} width={CAR.lineWidth * K} height={H} fill="#1F2937" />
      </Figure>
      <Slider label="Vạch lệch" unit=" cm" decimals={1} value={offsetCm} min={-5} max={5} step={0.5} onChange={setOffsetCm} />
      <Slider label="Kp" unit="" decimals={1} value={kp} min={0} max={10} step={0.5} onChange={setKp} />
      <Explain sensors={sensors} kp={kp} />
    </Card>
  );
}
