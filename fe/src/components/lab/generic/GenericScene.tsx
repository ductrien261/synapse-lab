'use client';

import { Line } from '@react-three/drei';
import { getPart, type ShapeDef, type V3 } from '@/lib/lab/parts';
import type { LabPackage, PkgPart } from '@/lib/lab/package/types';
import type { Terminal, WiringApi, Wire } from '@/lib/lab/wiring';
import { Arc, Blk, Cyl, PartGroup, PartMesh, Stage3D } from '../shared/Scene3D';
import { WiringLayer, type Placement } from '../shared/WiringLayer';

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** Vẽ các khối cơ bản; tọa độ cộng thêm `origin`, khối không ghi màu thì dùng `color`. */
function Shapes({ shapes, origin, color }: { shapes: ShapeDef[]; origin: V3; color: string }) {
  return (
    <>
      {shapes.map((s, i) => {
        const c = s.color ?? color;
        const pos = add(s.pos, origin);
        if (s.t === 'blk') return <Blk key={i} pos={pos} size={s.size} color={c} rot={s.rot} />;
        if (s.t === 'cyl') return <Cyl key={i} pos={pos} r={s.r} rBottom={s.rBottom} h={s.h} color={c} rot={s.rot} />;
        return <Arc key={i} pos={pos} r={s.r} tube={s.tube} arc={s.arc} rot={s.rot} color={c} />;
      })}
    </>
  );
}

/** Hình dạng của một bộ phận: mô hình STL của linh kiện trong thư viện, hoặc các khối dựng sẵn */
function PartShape({ part }: { part: PkgPart }) {
  const lib = getPart(part.partId);
  if (!lib) return null;
  if (lib.model.kind === 'stl') return <PartMesh file={lib.model.file} orient={part.orient ?? lib.model.orient} pos={part.at} yaw={part.yaw} flip={part.flip} scale={part.scale} color={part.color} />;
  return <Shapes shapes={lib.model.shapes} origin={part.at} color={part.color} />;
}

function Decor({ pkg }: { pkg: LabPackage }) {
  return (
    <PartGroup placed faded={false}>
      <Shapes shapes={pkg.scene.decor} origin={[0, 0, 0]} color="#94A3B8" />
    </PartGroup>
  );
}

interface DiagramProps {
  pkg: LabPackage;
  installed: number;
  focus: string | null;
  guides: boolean;
  onPick?: (id: string) => void;
  onMiss?: () => void;
}

/** Cảnh lắp ráp dựng từ gói bài: vật cố định, đường nối nét đứt và các bộ phận (chưa lắp thì chỉ có khung mờ). */
export function GenericDiagram({ pkg, installed, focus, guides, onPick, onMiss }: DiagramProps) {
  const { camera, grid, ground } = pkg.scene;
  const idx = (id: string) => pkg.parts.findIndex((q) => q.id === id);
  const node = (id: string) => pkg.parts[idx(id)].node;
  return (
    <Stage3D cam={camera.pos} target={camera.target} min={camera.min} max={camera.max} grid={grid} ground={ground} onMiss={onMiss}>
      <Decor pkg={pkg} />
      {pkg.links.map(([from, to]) => {
        if (!(idx(from) < installed && idx(to) < installed)) return null;
        const faded = focus !== null && focus !== from && focus !== to;
        return <Line key={from + to} points={[node(from), node(to)]} color="#475569" lineWidth={2} dashed dashSize={0.01} gapSize={0.006} transparent opacity={faded ? 0.15 : 1} />;
      })}
      {pkg.parts.map((part, i) => {
        const placed = i < installed;
        if (!placed && !guides) return null;
        return (
          <PartGroup key={part.id} placed={placed} faded={focus !== null && focus !== part.id} picked={focus === part.id} onPick={onPick ? () => onPick(part.id) : undefined}>
            <PartShape part={part} />
          </PartGroup>
        );
      })}
    </Stage3D>
  );
}

const placeTerminal = (t: Terminal): Placement | null => (t.pos && t.base !== undefined ? { at: t.pos, base: [t.pos[0], t.base, t.pos[2]] } : null);

interface WiringProps {
  pkg: LabPackage;
  W: WiringApi;
  wires: Wire[];
  pending: string | null;
  hover: string | null;
  onPick: (id: string) => void;
  onHover: (id: string | null) => void;
  onRemoveWire: (index: number) => void;
  onMiss?: () => void;
}

/** Hệ thống đã lắp đủ, kèm các chân đấu dây và dây người học đã nối. */
export function GenericWiringDiagram({ pkg, W, wires, pending, hover, onPick, onHover, onRemoveWire, onMiss }: WiringProps) {
  const { wireCamera: cam, grid, ground } = pkg.scene;
  return (
    <Stage3D cam={cam.pos} target={cam.target} min={cam.min} max={cam.max} grid={grid} ground={ground} onMiss={onMiss}>
      <Decor pkg={pkg} />
      {pkg.parts.map((part) => (
        <PartGroup key={part.id} placed faded={false}>
          <PartShape part={part} />
        </PartGroup>
      ))}
      <WiringLayer W={W} wires={wires} pending={pending} hover={hover} onPick={onPick} onHover={onHover} onRemoveWire={onRemoveWire} place={placeTerminal} />
    </Stage3D>
  );
}
