'use client';

import { useMemo, useState } from 'react';
import { Html, Line } from '@react-three/drei';
import type { Terminal, Wire, WiringApi } from '@/lib/lab/wiring';
import type { V3 } from './Scene3D';

/** Vị trí một chân trong cảnh: chấm nổi (at) và điểm trên thân linh kiện (base) để vẽ cọc nối. */
export interface Placement {
  at: V3;
  base: V3;
}

type DotState = 'idle' | 'pending' | 'linked' | 'bad';
const DOT_COLOR: Record<DotState, string> = { idle: '#1E293B', pending: '#F59E0B', linked: '#16A34A', bad: '#EF4444' };

/** Một chân đấu dây: chấm nhỏ nổi trên linh kiện, có cọc nối xuống thân. Vẽ xuyên qua linh kiện để luôn nhìn thấy. */
function TerminalDot({ t, place, state, hot, onPick, onHover }: { t: Terminal; place: Placement; state: DotState; hot: boolean; onPick: () => void; onHover: (on: boolean) => void }) {
  return (
    <group>
      <Line points={[place.base, place.at]} color="#64748B" lineWidth={1} depthTest={false} renderOrder={6} />
      <mesh
        position={place.at}
        onClick={(e) => {
          e.stopPropagation();
          onPick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          onHover(true);
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
          onHover(false);
        }}
      >
        <sphereGeometry args={[0.005, 10, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
      </mesh>
      <mesh position={place.at} renderOrder={10}>
        <sphereGeometry args={[state === 'pending' || hot ? 0.0048 : 0.0036, 16, 16]} />
        <meshBasicMaterial color={DOT_COLOR[state]} depthTest={false} />
      </mesh>
      {(hot || state === 'pending') && (
        <Html position={[place.at[0], place.at[1] + 0.008, place.at[2]]} center style={{ pointerEvents: 'none' }} zIndexRange={[20, 0]}>
          <div className="whitespace-nowrap rounded-md bg-[#0F2258] px-2 py-1 text-[11px] font-semibold text-white shadow-lg">
            {t.partName} · {t.label}
          </div>
        </Html>
      )}
    </group>
  );
}

/** Dây nối hai chân: đường cong nhô lên khỏi linh kiện. Bấm vào dây để gỡ. */
function WireCurve({ a, b, color, ok, onRemove }: { a: V3; b: V3; color: string; ok: boolean; onRemove?: () => void }) {
  const [hot, setHot] = useState(false);
  const pts = useMemo(() => {
    const lift = 0.008 + 0.25 * Math.hypot(b[0] - a[0], b[2] - a[2]);
    const out: V3[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * lift * t * (1 - t), a[2] + (b[2] - a[2]) * t]);
    }
    return out;
  }, [a, b]);
  const mid = pts[10];
  return (
    <group>
      <Line
        points={pts}
        color={ok ? color : '#EF4444'}
        lineWidth={hot ? 6 : ok ? 3 : 4}
        dashed={!ok}
        dashSize={0.006}
        gapSize={0.004}
        depthTest={false}
        renderOrder={5}
        onClick={
          onRemove
            ? (e) => {
                e.stopPropagation();
                document.body.style.cursor = '';
                onRemove();
              }
            : undefined
        }
        onPointerOver={(e) => {
          e.stopPropagation();
          setHot(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHot(false);
          document.body.style.cursor = '';
        }}
      />
      {hot && onRemove && (
        <Html position={[mid[0], mid[1] + 0.006, mid[2]]} center style={{ pointerEvents: 'none' }} zIndexRange={[20, 0]}>
          <div className="whitespace-nowrap rounded-md bg-[#7F1D1D] px-2 py-1 text-[11px] font-semibold text-white shadow-lg">Bấm để gỡ dây này</div>
        </Html>
      )}
    </group>
  );
}

interface LayerProps {
  W: WiringApi;
  wires: Wire[];
  /** Chân đang chọn, chờ chọn chân thứ hai */
  pending: string | null;
  hover: string | null;
  onPick: (id: string) => void;
  onHover: (id: string | null) => void;
  onRemoveWire?: (index: number) => void;
  /** Vị trí của chân trong cảnh; trả về null nếu chưa biết (chân sẽ không vẽ) */
  place: (t: Terminal) => Placement | null;
}

/** Lớp đi dây đặt chồng lên một cảnh 3D: các chân đấu dây và dây người học đã nối. */
export function WiringLayer({ W, wires, pending, hover, onPick, onHover, onRemoveWire, place }: LayerProps) {
  const linked = new Set<string>();
  const bad = new Set<string>();
  for (const w of wires) {
    const target = W.checkWire(w).ok ? linked : bad;
    target.add(w.a);
    target.add(w.b);
  }
  const spots = new Map<string, Placement>();
  for (const t of W.terminals) {
    const pl = place(t);
    if (pl) spots.set(t.id, pl);
  }
  return (
    <>
      {wires.map((w, i) => {
        const a = spots.get(w.a);
        const b = spots.get(w.b);
        if (!a || !b) return null;
        const net = W.nets.find((n) => n.id === W.terminalById(w.a)?.net);
        return <WireCurve key={`${w.a}~${w.b}`} a={a.at} b={b.at} color={net?.color ?? '#334155'} ok={W.checkWire(w).ok} onRemove={onRemoveWire ? () => onRemoveWire(i) : undefined} />;
      })}
      {W.terminals.map((t) => {
        const pl = spots.get(t.id);
        if (!pl) return null;
        return (
          <TerminalDot
            key={t.id}
            t={t}
            place={pl}
            state={pending === t.id ? 'pending' : bad.has(t.id) ? 'bad' : linked.has(t.id) ? 'linked' : 'idle'}
            hot={hover === t.id}
            onPick={() => onPick(t.id)}
            onHover={(on) => onHover(on ? t.id : null)}
          />
        );
      })}
    </>
  );
}
