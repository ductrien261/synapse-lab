'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import type { Mesh } from 'three';
import { IOT, type IotParams, type IotState } from '@/lib/lab/iot-spec';
import { IOT_WIRING } from '@/lib/lab/iot-wiring';
import type { Terminal, Wire } from '@/lib/lab/wiring';
import type { AsmPart } from '../shared/assembly';
import { Arc, Ball, Blk, Cyl, PartGroup, PartMesh, Stage3D, type V3 } from '../shared/Scene3D';
import { WiringLayer, type Placement } from '../shared/WiringLayer';

/** Chậu cây dùng chung cho sơ đồ lắp ráp và cảnh thử nghiệm (không phải bộ phận để lắp). */
function Pot({ soil }: { soil: string }) {
  return (
    <PartGroup placed faded={false}>
      <Cyl pos={[0, 0.0035, 0]} r={0.045} h={0.007} color="#9A4F31" />
      <Cyl pos={[0, 0.0405, 0]} r={0.048} rBottom={0.036} h={0.066} color="#B45F3C" />
      <Cyl pos={[0, 0.0735, 0]} r={0.053} h={0.008} color="#C26D48" />
      <Cyl pos={[0, 0.0705, 0]} r={0.045} h={0.003} color={soil} />
    </PartGroup>
  );
}

/** Mặt đất trong chậu (mét), nơi cảm biến cắm vào */
const SOIL_Y = 0.0705;
/** Cảm biến cắm sâu khoảng 45 mm */
const PROBE_Y = SOIL_Y - 0.045;
const POT_X = -0.15;

/** Vị trí các đầu nối dây trong sơ đồ (mét). */
const NODE: Record<string, V3> = {
  sensor: [POT_X + 0.018, 0.1, 0],
  mcu: [0, 0.014, 0],
  relay: [0, 0.03, 0.062],
  pump: [0.1, 0.03, 0.062],
  network: [0, 0.012, -0.07],
  dashboard: [0.14, 0.06, -0.06],
};

const WIRES: [string, string][] = [
  ['sensor', 'mcu'],
  ['mcu', 'relay'],
  ['relay', 'pump'],
  ['mcu', 'network'],
  ['network', 'dashboard'],
];

/** Bơm nước mini dựng bằng code: thân trụ, nắp, hai đầu ống và dây điện. */
function Pump({ pos, color, running }: { pos: V3; color: string; running?: boolean }) {
  const [x, y, z] = pos;
  return (
    <>
      <Cyl pos={[x, y + 0.016, z]} r={0.0125} h={0.032} color={color} />
      <Cyl pos={[x, y + 0.034, z]} r={0.0105} h={0.004} color="#1F2937" />
      <Cyl pos={[x - 0.016, y + 0.024, z]} r={0.003} h={0.012} color={running ? '#60A5FA' : '#94A3B8'} rot={[0, 0, Math.PI / 2]} />
      <Cyl pos={[x + 0.016, y + 0.012, z]} r={0.003} h={0.012} color="#94A3B8" rot={[0, 0, Math.PI / 2]} />
      <Cyl pos={[x, y + 0.0015, z + 0.0125]} r={0.0012} h={0.008} color="#DC2626" rot={[Math.PI / 2, 0, 0]} />
      <Cyl pos={[x + 0.004, y + 0.0015, z + 0.0125]} r={0.0012} h={0.008} color="#111827" rot={[Math.PI / 2, 0, 0]} />
    </>
  );
}

function PartShape({ id, color }: { id: string; color: string }) {
  switch (id) {
    case 'sensor':
      return <PartMesh file="soil-sensor" orient="probe" pos={[POT_X + 0.018, PROBE_Y, 0]} color={color} />;
    case 'mcu':
      return <PartMesh file="esp32" orient="flat" pos={[0, 0.003, 0]} color={color} />;
    case 'relay':
      return <PartMesh file="relay" orient="flat" pos={[0, 0.003, 0.062]} color={color} />;
    case 'pump':
      return <Pump pos={[0.1, 0.003, 0.062]} color={color} />;
    case 'network':
      return (
        <>
          <Blk pos={[0, 0.009, -0.07]} size={[0.06, 0.012, 0.04]} color={color} />
          <Cyl pos={[-0.022, 0.04, -0.07]} r={0.0022} h={0.05} color="#1F2937" />
          <Cyl pos={[0.022, 0.04, -0.07]} r={0.0022} h={0.05} color="#1F2937" />
          {[0.018, 0.03, 0.042].map((r) => (
            <Arc key={r} pos={[0, 0.07, -0.07]} r={r} tube={0.0018} arc={Math.PI * 0.6} rot={[0, 0, Math.PI / 2 - Math.PI * 0.3]} color={color} />
          ))}
        </>
      );
    case 'dashboard':
      return (
        <>
          <Blk pos={[0.14, 0.004, -0.07]} size={[0.05, 0.008, 0.035]} color="#334155" />
          <PartMesh file="tft" orient="upright" pos={[0.14, 0.008, -0.074]} color={color} />
        </>
      );
    default:
      return null;
  }
}

interface DiagramProps {
  parts: AsmPart[];
  installed: number;
  focus: string | null;
  guides: boolean;
  onPick?: (id: string) => void;
  /** Bấm vào chỗ trống */
  onMiss?: () => void;
}

/** Hệ thống tưới cây 3D: chậu cây, cảm biến, vi điều khiển, rơ-le, bơm, Wi-Fi và bảng điều khiển. */
export function IotDiagram({ parts, installed, focus, guides, onPick, onMiss }: DiagramProps) {
  const idx = (id: string) => parts.findIndex((q) => q.id === id);
  return (
    <Stage3D cam={[0.3, 0.34, 0.52]} target={[-0.005, 0.03, -0.005]} min={0.2} max={1.5} grid={0.9} ground="#E7D8C4" onMiss={onMiss}>
      <group position={[POT_X, 0, 0]}>
        <Pot soil="#6B4E31" />
      </group>
      <PartGroup placed faded={false}>
        <Blk pos={[0.05, 0.0015, 0.03]} size={[0.2, 0.003, 0.15]} color="#334155" />
      </PartGroup>
      {WIRES.map(([from, to]) => {
        if (!(idx(from) < installed && idx(to) < installed)) return null;
        const faded = focus !== null && focus !== from && focus !== to;
        return <Line key={from + to} points={[NODE[from], NODE[to]]} color="#475569" lineWidth={2} dashed dashSize={0.01} gapSize={0.006} transparent opacity={faded ? 0.15 : 1} />;
      })}
      {parts.map((part, i) => {
        const placed = i < installed;
        if (!placed && !guides) return null;
        return (
          <PartGroup key={part.id} placed={placed} faded={focus !== null && focus !== part.id} picked={focus === part.id} onPick={onPick ? () => onPick(part.id) : undefined}>
            <PartShape id={part.id} color={part.color} />
          </PartGroup>
        );
      })}
    </Stage3D>
  );
}

interface WiringProps {
  parts: AsmPart[];
  wires: Wire[];
  pending: string | null;
  hover: string | null;
  onPick: (id: string) => void;
  onHover: (id: string | null) => void;
  onRemoveWire: (index: number) => void;
  onMiss?: () => void;
}

const placeTerminal = (t: Terminal): Placement | null => (t.pos && t.base !== undefined ? { at: t.pos, base: [t.pos[0], t.base, t.pos[2]] } : null);

/** Hệ thống đã lắp đủ, kèm các chân đấu dây và dây người học đã nối. */
export function IotWiringDiagram({ parts, wires, pending, hover, onPick, onHover, onRemoveWire, onMiss }: WiringProps) {
  return (
    <Stage3D cam={[0.06, 0.3, 0.24]} target={[-0.03, 0.04, 0.03]} min={0.12} max={1.2} grid={0.9} ground="#E7D8C4" onMiss={onMiss}>
      <group position={[POT_X, 0, 0]}>
        <Pot soil="#6B4E31" />
      </group>
      <PartGroup placed faded={false}>
        <Blk pos={[0.05, 0.0015, 0.03]} size={[0.2, 0.003, 0.15]} color="#334155" />
      </PartGroup>
      {parts.map((part) => (
        <PartGroup key={part.id} placed faded={false}>
          <PartShape id={part.id} color={part.color} />
        </PartGroup>
      ))}
      <WiringLayer W={IOT_WIRING} wires={wires} pending={pending} hover={hover} onPick={onPick} onHover={onHover} onRemoveWire={onRemoveWire} place={placeTerminal} />
    </Stage3D>
  );
}

/** Vài giọt nước rơi từ vòi bơm xuống chậu khi bơm đang chạy. */
function Drops({ on }: { on: boolean }) {
  const refs = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    refs.current.forEach((m, i) => {
      if (!m) return;
      m.visible = on;
      const k = (clock.elapsedTime * 0.9 + i / 4) % 1;
      m.position.y = 0.16 - k * 0.09;
    });
  });
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} ref={(m) => void (refs.current[i] = m)} position={[0.03, 0.16, 0]} visible={false}>
          <sphereGeometry args={[0.005, 12, 8]} />
          <meshStandardMaterial color="#60A5FA" emissive="#3B82F6" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </>
  );
}

interface TuneProps {
  params: IotParams;
  sim: IotState;
  history: number[];
}

const HORIZON = 720;

/** Chậu cây 3D với máy bơm, kèm biểu đồ độ ẩm theo thời gian ở phía dưới. */
export function TuneScene({ params, sim, history }: TuneProps) {
  const healthy = sim.moisture >= IOT.healthyLow && sim.moisture <= IOT.healthyHigh;
  const dry = sim.moisture < IOT.healthyLow;
  const soil = sim.moisture > 66 ? '#6B4E31' : sim.moisture > 33 ? '#8B6B47' : '#C9A878';
  const leaf = healthy ? '#22C55E' : '#CA8A04';
  const lift = dry ? -0.9 : 0.5;
  const x = (i: number) => 40 + (i / (HORIZON - 1)) * 720;
  const y = (m: number) => 250 - (m / 100) * 210;
  const line = history.length > 1 ? history.map((m, i) => `${i === 0 ? 'M' : 'L'}${x(i + HORIZON - history.length).toFixed(1)} ${y(m).toFixed(1)}`).join(' ') : '';
  return (
    <div className="flex h-full w-full flex-col">
      <div className="relative min-h-0 flex-[3]">
        <Stage3D cam={[0.3, 0.24, 0.34]} target={[0.04, 0.09, 0]} min={0.2} max={1.2} grid={0.9} ground="#E7D8C4">
          <Pot soil={soil} />
          <PartGroup placed faded={false}>
            <Cyl pos={[0, 0.115, 0]} r={0.003} h={0.09} color={leaf} />
            <group position={[0, 0.155, 0]}>
              <group rotation={[0, 0, lift]}>
                <Ball pos={[0.03, 0, 0]} r={0.022} color={leaf} scale={[1.6, 0.3, 1]} />
              </group>
              <group rotation={[0, 0, -lift]}>
                <Ball pos={[-0.03, 0, 0]} r={0.022} color={leaf} scale={[1.6, 0.3, 1]} />
              </group>
            </group>
            <Pump pos={[0.17, 0, 0]} color={sim.pump ? '#3B82F6' : '#64748B'} running={sim.pump} />
            <Line points={[[0.154, 0.027, 0], [0.11, 0.15, 0], [0.03, 0.15, 0]] as V3[]} color={sim.pump ? '#3B82F6' : '#94A3B8'} lineWidth={4} />
            <PartMesh file="soil-sensor" orient="probe" pos={[0.022, PROBE_Y, 0.012]} color="#0F8A6B" />
          </PartGroup>
          <Drops on={sim.pump} />
        </Stage3D>
        <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-white/85 px-3 py-1.5 text-sm font-bold text-slate-700 shadow-sm">Độ ẩm đất {sim.moisture.toFixed(0)}%</div>
        <div className={`pointer-events-none absolute right-14 top-3 rounded-lg px-3 py-1.5 text-sm font-bold text-white shadow-sm ${sim.pump ? 'bg-blue-500' : 'bg-slate-400'}`}>{sim.pump ? 'BƠM' : 'TẮT'}</div>
      </div>
      <svg viewBox="0 0 800 280" className="min-h-0 flex-[2]" role="img" aria-label="Biểu đồ độ ẩm theo thời gian">
        <rect x={40} y={y(IOT.healthyHigh)} width={720} height={y(IOT.healthyLow) - y(IOT.healthyHigh)} fill="#DCFCE7" />
        <line x1={40} y1={y(params.threshold)} x2={760} y2={y(params.threshold)} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="6 5" />
        <line x1={40} y1={y(params.threshold + params.hysteresis)} x2={760} y2={y(params.threshold + params.hysteresis)} stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="6 5" />
        <rect x={40} y={y(100)} width={720} height={210} fill="none" stroke="#CBD5E1" />
        {line && <path d={line} fill="none" stroke="#1E3F82" strokeWidth={2.5} strokeLinejoin="round" />}
        <text x={44} y={y(100) + 14} fill="#64748B" fontSize={12}>
          100%
        </text>
        <text x={44} y={246} fill="#64748B" fontSize={12}>
          0%
        </text>
        <text x={756} y={y(params.threshold) - 5} textAnchor="end" fill="#EF4444" fontSize={12}>
          ngưỡng bật bơm
        </text>
        <text x={756} y={y(params.threshold + params.hysteresis) - 5} textAnchor="end" fill="#3B82F6" fontSize={12}>
          ngưỡng tắt bơm
        </text>
        <text x={400} y={268} textAnchor="middle" fill="#64748B" fontSize={12}>
          12 giờ gần nhất
        </text>
      </svg>
    </div>
  );
}
