'use client';

import { useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { Line } from '@react-three/drei';
import { CAR, arcPath, type CarState, type Pt } from '@/lib/lab/car-spec';
import type { AsmPart } from '../shared/assembly';
import { Ball, Blk, Cyl, PartGroup, PartMesh, Plate, Stage3D, type V3 } from '../shared/Scene3D';

/** Đổi tọa độ của xe (x về phía trước, y sang trái, z lên) sang hệ trục của three (x, z lên, -y). */
const p = (x: number, y: number, z: number): V3 => [x, z, -y];
const R = CAR.wheelDiameter / 2;
/** Mặt trên của tấm khung (mét) */
const DECK = 0.0475;

/** Lỗ bắt vít trên khung: lưới đều, tránh vùng giữa để khỏi rối mắt. */
const HOLES: [number, number, number][] = [];
for (const hx of [-0.09, -0.06, -0.03, 0, 0.03, 0.06, 0.09]) {
  for (const hy of [-0.05, 0.05]) HOLES.push([hx, hy, 0.0025]);
}

/** Các bộ phận của xe, trong hệ tọa độ của xe (mét). Motor, mạch, pin và cảm biến là mô hình thật; khung, bánh và bánh đa hướng dựng bằng code. */
function Shape({ id, color }: { id: string; color: string }) {
  switch (id) {
    case 'chassis':
      return <Plate pos={p(0, 0, DECK - 0.003)} w={0.21} d={0.13} t={0.003} radius={0.012} holes={HOLES} color="#CBD5E7" />;
    case 'motors':
      return (
        <>
          <PartMesh file="tt-motor" orient="motor" pos={p(-0.02, 0.0417, R - 0.0112)} color={color} />
          <PartMesh file="tt-motor" orient="motor" pos={p(-0.02, -0.0417, R - 0.0112)} yaw={Math.PI} color={color} />
        </>
      );
    case 'wheels':
      return (
        <>
          {[0.07, -0.07].map((y) => (
            <group key={y}>
              <Cyl pos={p(0, y, R)} r={R} h={0.02} color={color} rot={[Math.PI / 2, 0, 0]} />
              <Cyl pos={p(0, y + Math.sign(y) * 0.0008, R)} r={0.021} h={0.0216} color="#CBD5E1" rot={[Math.PI / 2, 0, 0]} />
            </group>
          ))}
          <Cyl pos={p(0.098, 0, 0.0285)} r={0.004} h={0.033} color="#94A3B8" />
          <Ball pos={p(0.098, 0, 0.012)} r={0.012} color={color} />
        </>
      );
    case 'battery':
      return <PartMesh file="battery" orient="lying" pos={p(-0.055, 0, DECK)} color={color} />;
    case 'switch':
      return <PartMesh file="switch" orient="flat" pos={p(-0.09, 0.045, DECK)} color={color} />;
    case 'regulator':
      return <PartMesh file="boost" orient="flat" pos={p(-0.03, -0.045, DECK)} color={color} />;
    case 'driver':
      return (
        <>
          <PartMesh file="driver" orient="flat" pos={p(0, 0.043, DECK)} color={color} />
          <PartMesh file="driver" orient="flat" pos={p(0, -0.043, DECK)} color={color} />
        </>
      );
    case 'controller':
      return <PartMesh file="esp32" orient="flat" pos={p(0.03, 0, DECK)} color={color} />;
    case 'sensors':
      return (
        <>
          <Blk pos={p(0.056, 0, 0.0255)} size={[0.003, 0.045, 0.09]} color="#64748B" />
          {[0, 1, 2, 3, 4].map((i) => (
            // Mô-đun TCRT1000 thu nhỏ 0,8 lần để năm mô-đun vừa với khoảng cách 15 mm giữa các cảm biến
            <PartMesh key={i} file="line-sensor" orient="flat" flip scale={0.8} pos={p(CAR.sensorAhead, (2 - i) * CAR.sensorGap, 0.006)} color={color} />
          ))}
        </>
      );
    default:
      return null;
  }
}

interface DiagramProps {
  parts: AsmPart[];
  /** Số bộ phận đã lắp */
  installed: number;
  focus: string | null;
  /** Vẽ khung gợi ý cho bộ phận chưa lắp (giai đoạn xem quy trình và tự lắp) */
  guides: boolean;
  onPick?: (id: string) => void;
  /** Bấm vào chỗ trống */
  onMiss?: () => void;
}

/** Xe 3D ghép từ các bộ phận, xoay được bằng chuột. */
export function CarDiagram({ parts, installed, focus, guides, onPick, onMiss }: DiagramProps) {
  return (
    <Stage3D cam={[0.22, 0.17, 0.26]} target={[0, 0.03, 0]} min={0.12} max={1.2} grid={0.8} onMiss={onMiss}>
      {parts.map((part, i) => {
        const placed = i < installed;
        if (!placed && !guides) return null;
        return (
          <PartGroup key={part.id} placed={placed} faded={focus !== null && focus !== part.id} picked={focus === part.id} onPick={onPick ? () => onPick(part.id) : undefined}>
            <Shape id={part.id} color={part.color} />
          </PartGroup>
        );
      })}
    </Stage3D>
  );
}

/** Xe đã lắp xong, đặt theo tư thế (x, y, hướng) của mô phỏng. */
function Car({ parts, x, y, th, scale = 1 }: { parts: AsmPart[]; x: number; y: number; th: number; scale?: number }) {
  return (
    <group position={[x, 0, -y]} rotation={[0, th, 0]} scale={scale}>
      {parts.map((part) => (
        <PartGroup key={part.id} placed faded={false}>
          <Shape id={part.id} color={part.color} />
        </PartGroup>
      ))}
    </group>
  );
}

/** Dải vạch đen nối các điểm của đường đua. */
function TrackRibbon({ track }: { track: Pt[] }) {
  const geo = useMemo(() => {
    const n = track.length;
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = track[(i - 1 + n) % n];
      const b = track[(i + 1) % n];
      const tx = b.x - a.x;
      const ty = b.y - a.y;
      const len = Math.hypot(tx, ty) || 1;
      const nx = (-ty / len) * (CAR.lineWidth / 2);
      const ny = (tx / len) * (CAR.lineWidth / 2);
      const c = track[i];
      pos.push(c.x + nx, 0.002, -(c.y + ny), c.x - nx, 0.002, -(c.y - ny));
      const j = (i + 1) % n;
      idx.push(2 * i, 2 * i + 1, 2 * j, 2 * i + 1, 2 * j + 1, 2 * j);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    return g;
  }, [track]);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color="#1F2937" side={2} />
    </mesh>
  );
}

interface TrackProps {
  parts: AsmPart[];
  sim: CarState;
  trail: Pt[];
  track: Pt[];
}

/** Đường đua 3D với xe, năm cảm biến và vệt đã đi. */
export function TrackScene({ parts, sim, trail, track }: TrackProps) {
  const cos = Math.cos(sim.th);
  const sin = Math.sin(sim.th);
  const trailPts = useMemo(() => (trail.length > 1 ? trail.map((t): V3 => [t.x, 0.004, -t.y]) : null), [trail]);
  return (
    <Stage3D cam={[0, 2.1, 1.6]} target={[0, 0, 0.05]} min={0.3} max={4} grid={3.2} ground="#E9EEF6">
      <TrackRibbon track={track} />
      {trailPts && <Line points={trailPts} color="#F59E0B" lineWidth={2.5} />}
      <mesh position={[track[0].x, 0.003, -track[0].y]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.02, 0.028, 32]} />
        <meshBasicMaterial color="#16A34A" />
      </mesh>
      <Car parts={parts} x={sim.x} y={sim.y} th={sim.th} />
      {sim.sensors.map((on, i) => {
        const lat = (2 - i) * CAR.sensorGap;
        return (
          <Ball
            key={i}
            pos={[sim.x + CAR.sensorAhead * cos - lat * sin, 0.024, -(sim.y + CAR.sensorAhead * sin + lat * cos)]}
            r={0.007}
            color={on ? '#EF4444' : '#FFFFFF'}
            emissive={on ? '#EF4444' : undefined}
          />
        );
      })}
    </Stage3D>
  );
}

/** Quỹ đạo của xe khi hai bánh giữ tốc độ khác nhau (bài tính vòng quay). */
export function ArcScene({ parts, vLeft, vRight }: { parts: AsmPart[]; vLeft: number; vRight: number }) {
  const pts = useMemo(() => arcPath(vLeft, vRight, 8).map((q): V3 => [q.x, 0.004, -q.y]), [vLeft, vRight]);
  return (
    <Stage3D cam={[1.2, 3.4, 1.6]} target={[1.2, 0, 0]} min={0.5} max={6} grid={6} ground="#E9EEF6">
      {pts.length > 1 && <Line points={pts} color="#F59E0B" lineWidth={3} />}
      <Car parts={parts} x={0} y={0} th={0} scale={2.5} />
    </Stage3D>
  );
}
