'use client';

import { Suspense, createContext, useContext, useMemo, type ReactNode } from 'react';
import { BoxGeometry, BufferGeometry, EdgesGeometry, ExtrudeGeometry, Matrix4, Shape, Vector3 } from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { Canvas, useLoader } from '@react-three/fiber';
import { Edges, OrbitControls } from '@react-three/drei';

export type V3 = [number, number, number];

interface Look {
  ghost: boolean;
  faded: boolean;
  /** Bộ phận đang được chọn: phát sáng nhẹ */
  picked: boolean;
}
const LookCtx = createContext<Look>({ ghost: false, faded: false, picked: false });

interface PartGroupProps {
  /** Đã lắp chưa; chưa lắp thì chỉ vẽ khung mờ để biết chỗ đặt */
  placed: boolean;
  /** Làm mờ khi đang chọn một bộ phận khác */
  faded: boolean;
  /** Đang được chọn */
  picked?: boolean;
  onPick?: () => void;
  children: ReactNode;
}

/** Nhóm các khối của một bộ phận: lo việc bấm chọn, làm mờ, phát sáng khi chọn và khung gợi ý. Bộ phận đang mờ không nhận chuột để không che bộ phận phía sau. */
export function PartGroup({ placed, faded, picked = false, onPick, children }: PartGroupProps) {
  const live = onPick && !faded;
  return (
    <LookCtx.Provider value={{ ghost: !placed, faded, picked }}>
      <group
        onClick={
          live
            ? (e) => {
                e.stopPropagation();
                onPick();
              }
            : undefined
        }
        onPointerOver={
          live
            ? (e) => {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
              }
            : undefined
        }
        onPointerOut={live ? () => (document.body.style.cursor = '') : undefined}
      >
        {children}
      </group>
    </LookCtx.Provider>
  );
}

function Mat({ color, emissive }: { color: string; emissive?: string }) {
  const { ghost, faded, picked } = useContext(LookCtx);
  // key: dựng lại vật liệu khi đổi trạng thái, để chắc chắn độ trong suốt được áp dụng
  if (ghost) return <meshBasicMaterial key="ghost" color="#1E3F82" transparent opacity={0.07} depthWrite={false} />;
  const glow = emissive ?? (picked ? color : '#000000');
  return (
    <meshStandardMaterial
      key={faded ? 'faded' : picked ? 'picked' : 'normal'}
      color={color}
      emissive={glow}
      emissiveIntensity={emissive ? 0.8 : picked ? 0.35 : 0}
      roughness={0.55}
      metalness={0.1}
      transparent={faded}
      opacity={faded ? 0.12 : 1}
      depthWrite={!faded}
    />
  );
}

function GhostEdges() {
  const { ghost } = useContext(LookCtx);
  return ghost ? <Edges color="#1E3F82" /> : null;
}

/** Khối hộp: pos là tâm, size là (rộng, cao, sâu) theo trục three. */
export function Blk({ pos, size, color, emissive, rot }: { pos: V3; size: V3; color: string; emissive?: string; rot?: V3 }) {
  return (
    <mesh position={pos} rotation={rot}>
      <boxGeometry args={size} />
      <Mat color={color} emissive={emissive} />
      <GhostEdges />
    </mesh>
  );
}

/** Hình trụ có trục dọc theo Y (xoay bằng rot nếu cần). */
export function Cyl({ pos, r, rBottom, h, color, rot }: { pos: V3; r: number; rBottom?: number; h: number; color: string; rot?: V3 }) {
  return (
    <mesh position={pos} rotation={rot}>
      <cylinderGeometry args={[r, rBottom ?? r, h, 28]} />
      <Mat color={color} />
      <GhostEdges />
    </mesh>
  );
}

export function Ball({ pos, r, color, emissive, scale }: { pos: V3; r: number; color: string; emissive?: string; scale?: V3 }) {
  return (
    <mesh position={pos} scale={scale}>
      <sphereGeometry args={[r, 20, 14]} />
      <Mat color={color} emissive={emissive} />
    </mesh>
  );
}


/** Cách đặt mô hình CAD (trục Z hướng lên, đơn vị mm): ảnh của ba trục x, y, z của CAD trong hệ trục của three. */
const BASES = {
  /** Bo mạch nằm phẳng, mặt linh kiện hướng lên */
  flat: [[1, 0, 0], [0, 0, -1], [0, 1, 0]],
  /** Motor TT nằm ngang: thân dọc theo x, trục bánh dọc theo z */
  motor: [[0, 1, 0], [0, 0, 1], [1, 0, 0]],
  /** Pin nằm ngang, dài theo x */
  lying: [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
  /** Dựng đứng, đầu xa cắm xuống (cảm biến độ ẩm đất) */
  probe: [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
  /** Dựng đứng, mặt trước hướng về +z (màn hình) */
  upright: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
} as const;

export type Orient = keyof typeof BASES;

interface PartMeshProps {
  /** Tệp STL trong `public/lab/parts/` (kích thước thật, đơn vị mm) */
  file: string;
  orient: Orient;
  /** Vị trí điểm giữa mặt đáy của mô hình */
  pos: V3;
  /** Góc xoay quanh trục đứng */
  yaw?: number;
  /** Lật úp (xoay 180° quanh trục x) */
  flip?: boolean;
  scale?: number;
  color: string;
}

/** Mô hình linh kiện thật nạp từ tệp STL. Khi chưa lắp thì vẽ khung hộp bao quanh. */
export function PartMesh({ file, orient, pos, yaw = 0, flip = false, scale = 1, color }: PartMeshProps) {
  const raw = useLoader(STLLoader, `/lab/parts/${file}.stl`);
  const { geo, size } = useMemo(() => {
    const g: BufferGeometry = raw.clone();
    const [a, b, c] = BASES[orient];
    const m = new Matrix4().makeBasis(new Vector3(...a), new Vector3(...b), new Vector3(...c));
    g.applyMatrix4(m);
    if (flip) g.applyMatrix4(new Matrix4().makeRotationX(Math.PI));
    g.scale(0.001 * scale, 0.001 * scale, 0.001 * scale);
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
    g.computeBoundingBox();
    const s = new Vector3();
    g.boundingBox!.getSize(s);
    return { geo: g, size: s };
  }, [raw, orient, flip, scale]);
  const { ghost } = useContext(LookCtx);
  const box = useMemo(() => new BoxGeometry(size.x, size.y, size.z), [size]);
  const boxEdges = useMemo(() => new EdgesGeometry(box), [box]);
  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      {ghost ? (
        <mesh position={[0, size.y / 2, 0]} geometry={box}>
          <Mat color={color} />
          <lineSegments geometry={boxEdges}>
            <lineBasicMaterial color="#1E3F82" />
          </lineSegments>
        </mesh>
      ) : (
        <mesh geometry={geo}>
          <Mat color={color} />
        </mesh>
      )}
    </group>
  );
}

/** Tấm phẳng bo góc có lỗ (khung xe), nằm ngang, dày theo trục đứng. */
export function Plate({ pos, w, d, t, radius, holes, color }: { pos: V3; w: number; d: number; t: number; radius: number; holes: [number, number, number][]; color: string }) {
  const geo = useMemo(() => {
    const s = new Shape();
    const x = -w / 2;
    const y = -d / 2;
    s.moveTo(x + radius, y);
    s.lineTo(x + w - radius, y);
    s.quadraticCurveTo(x + w, y, x + w, y + radius);
    s.lineTo(x + w, y + d - radius);
    s.quadraticCurveTo(x + w, y + d, x + w - radius, y + d);
    s.lineTo(x + radius, y + d);
    s.quadraticCurveTo(x, y + d, x, y + d - radius);
    s.lineTo(x, y + radius);
    s.quadraticCurveTo(x, y, x + radius, y);
    for (const [hx, hy, hr] of holes) {
      const h = new Shape();
      h.absarc(hx, hy, hr, 0, Math.PI * 2, true);
      s.holes.push(h);
    }
    const g = new ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 12 });
    g.rotateX(-Math.PI / 2);
    return g;
  }, [w, d, t, radius, holes]);
  const { ghost } = useContext(LookCtx);
  const edges = useMemo(() => new EdgesGeometry(geo, 25), [geo]);
  return (
    <mesh position={pos} geometry={geo}>
      <Mat color={color} />
      {ghost && (
        <lineSegments geometry={edges}>
          <lineBasicMaterial color="#1E3F82" />
        </lineSegments>
      )}
    </mesh>
  );
}

/** Cung tròn (dùng vẽ sóng Wi-Fi). */
export function Arc({ pos, r, tube, arc, rot, color }: { pos: V3; r: number; tube: number; arc: number; rot?: V3; color: string }) {
  return (
    <mesh position={pos} rotation={rot}>
      <torusGeometry args={[r, tube, 8, 28, arc]} />
      <Mat color={color} emissive={color} />
    </mesh>
  );
}

interface StageProps {
  cam: V3;
  target: V3;
  min?: number;
  max?: number;
  /** Kích thước ô lưới (mét) */
  grid?: number;
  /** Nền đặt vật thể */
  ground?: string;
  /** Bấm vào chỗ trống */
  onMiss?: () => void;
  children: ReactNode;
}

/** Khung 3D dùng chung: ánh sáng, sàn, lưới và điều khiển xoay camera. */
export function Stage3D({ cam, target, min = 0.15, max = 4, grid = 1.2, ground, onMiss, children }: StageProps) {
  return (
    <Canvas camera={{ position: cam, fov: 40, near: 0.005, far: 50 }} dpr={[1, 2]} onPointerMissed={onMiss}>
      <hemisphereLight args={['#ffffff', '#c9d3e6', 1.0]} />
      <directionalLight position={[1.5, 2.5, 1.2]} intensity={1.6} />
      <directionalLight position={[-1.5, 1, -1]} intensity={0.5} />
      {ground ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[target[0], -0.0005, target[2]]}>
          <planeGeometry args={[grid * 3, grid * 3]} />
          <meshStandardMaterial color={ground} roughness={0.9} />
        </mesh>
      ) : (
        <gridHelper args={[grid, 24, '#B8C4DA', '#E2E8F2']} position={[target[0], 0, target[2]]} />
      )}
      <OrbitControls makeDefault target={target} maxPolarAngle={Math.PI * 0.49} minDistance={min} maxDistance={max} />
      <Suspense fallback={null}>{children}</Suspense>
    </Canvas>
  );
}
