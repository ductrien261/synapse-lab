'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Vector3, type Object3D } from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { PARTS, type ArmParams, type PartId } from '@/lib/lab/arm-spec';
import { applyPose, setHighlight, setInstalled, type Model, type Vec3 } from '@/lib/lab/so101-model';
import { ARM_DEVICES, ARM_WIRING } from '@/lib/lab/arm-wiring';
import type { Terminal, Wire } from '@/lib/lab/wiring';
import { WiringLayer, type Placement } from '../shared/WiringLayer';

const VIEWS = {
  build: { pos: [0.72, 0.55, 0.8] as [number, number, number], tgt: [-0.1, 0.06, 0] as [number, number, number] },
  show: { pos: [0.55, 0.38, 0.62] as [number, number, number], tgt: [0.1, 0.12, 0] as [number, number, number] },
  wire: { pos: [0.18, 0.4, 0.52] as [number, number, number], tgt: [-0.06, 0.1, 0.02] as [number, number, number] },
};

interface WiringProps {
  wires: Wire[];
  pending: string | null;
  hover: string | null;
  onPick: (id: string) => void;
  onHover: (id: string | null) => void;
  onRemoveWire: (index: number) => void;
}

interface SceneProps {
  model: Model;
  params: ArmParams;
  /** Số bộ phận đã lắp, theo thứ tự PARTS. */
  installed: number;
  selected: PartId | null;
  /** Làm mờ các bộ phận khác khi đã chọn một bộ phận */
  dim: boolean;
  onPart: (id: PartId) => void;
  target: Vec3 | null;
  /** build = lùi ra để thấy giá linh kiện; show = lại gần cánh tay */
  view: 'build' | 'show' | 'wire';
  /** Bước đi dây: vẽ bộ nguồn, bo mạch, máy tính, các chân và dây */
  wiring?: WiringProps | null;
}

export default function ArmScene(props: SceneProps) {
  return (
    <Canvas camera={{ position: VIEWS.show.pos, fov: 40, near: 0.01, far: 20 }} dpr={[1, 2]}>
      <hemisphereLight args={['#ffffff', '#c9d3e6', 1.0]} />
      <directionalLight position={[1.5, 2.5, 1.2]} intensity={1.6} />
      <directionalLight position={[-1.5, 1, -1]} intensity={0.5} />
      <gridHelper args={[1.2, 24, '#B8C4DA', '#E2E8F2']} />
      <OrbitControls makeDefault target={VIEWS.show.tgt} maxPolarAngle={Math.PI * 0.49} minDistance={0.25} maxDistance={2} />
      <CameraRig view={props.view} />
      <World {...props} />
    </Canvas>
  );
}

/** Lướt camera sang góc nhìn mới trong khoảng 1,2 giây sau khi đổi giai đoạn, rồi trả quyền cho người dùng. */
function CameraRig({ view }: { view: 'build' | 'show' | 'wire' }) {
  const controls = useThree((s) => s.controls) as unknown as { target: Vector3; update: () => void } | null;
  const left = useRef(0);
  useEffect(() => {
    left.current = 1.2;
  }, [view]);
  useFrame(({ camera }, dt) => {
    if (left.current <= 0 || !controls) return;
    left.current -= dt;
    const k = 1 - Math.exp(-dt * 4);
    camera.position.lerp(new Vector3(...VIEWS[view].pos), k);
    controls.target.lerp(new Vector3(...VIEWS[view].tgt), k);
    controls.update();
  });
  return null;
}

/** Từ vật thể bị bấm trúng, đi ngược lên để tìm bộ phận chứa nó. */
function partOf(o: Object3D | null): PartId | null {
  for (let n: Object3D | null = o; n; n = n.parent) {
    if (n.userData.partId) return n.userData.partId as PartId;
  }
  return null;
}

/** Chấm đấu dây trên mặt trên của một thiết bị ngoài cánh tay. */
function deviceSpot(key: keyof typeof ARM_DEVICES, dx: number, dz: number): Placement {
  const d = ARM_DEVICES[key];
  const top = d.center[1] + d.size[1] / 2;
  return { at: [d.center[0] + dx, top + 0.012, d.center[2] + dz], base: [d.center[0] + dx, top, d.center[2] + dz] };
}

const DEVICE_SPOTS: Record<string, Placement> = {
  'psu-out': deviceSpot('psu', 0, 0),
  'pc-usb': deviceSpot('pc', 0, 0),
  'board-psu': deviceSpot('board', -0.022, 0.014),
  'board-usb': deviceSpot('board', -0.022, -0.014),
  'board-port': deviceSpot('board', 0.022, 0),
};

/** Bộ nguồn, bo mạch điều khiển servo và máy tính, đặt cạnh cánh tay ở bước đi dây. */
function Devices() {
  return (
    <group>
      {Object.values(ARM_DEVICES).map((d) => (
        <mesh key={d.name} position={d.center}>
          <boxGeometry args={d.size} />
          <meshStandardMaterial color={d.color} roughness={0.55} />
        </mesh>
      ))}
    </group>
  );
}

function World({ model, params, installed, selected, dim, onPart, target, wiring }: SceneProps) {
  const [hovered, setHovered] = useState<PartId | null>(null);

  // Vị trí hai cổng của từng servo: lấy từ vị trí khớp trong mô hình đang đặt tư thế
  const wiringOn = wiring != null;
  const servoSpots = useMemo(() => {
    const out: Record<string, Placement> = {};
    if (!wiringOn) return out;
    applyPose(model.robot, params);
    model.robot.updateMatrixWorld(true);
    const v = new Vector3();
    PARTS.forEach((p, i) => {
      model.robot.links[p.link].getWorldPosition(v);
      out[`s${i + 1}-in`] = { at: [v.x, v.y + 0.014, v.z + 0.014], base: [v.x, v.y, v.z] };
      out[`s${i + 1}-out`] = { at: [v.x, v.y + 0.014, v.z - 0.014], base: [v.x, v.y, v.z] };
    });
    return out;
  }, [model, params, wiringOn]);
  const place = (t: Terminal): Placement | null => DEVICE_SPOTS[t.id] ?? servoSpots[t.id] ?? null;

  // Đặt tư thế và số bộ phận đã lắp lên mô hình dùng chung
  useEffect(() => {
    applyPose(model.robot, params);
    setInstalled(model.robot, installed);
  }, [model, params, installed]);

  // Tô sáng bộ phận đang chọn hoặc đang rê chuột
  useEffect(() => {
    setHighlight(model, selected, hovered, dim);
  }, [model, selected, hovered, dim]);

  const events = {
    onClick: (e: { stopPropagation: () => void; object: Object3D }) => {
      const id = partOf(e.object);
      if (id) {
        e.stopPropagation();
        onPart(id);
      }
    },
    onPointerOver: (e: { stopPropagation: () => void; object: Object3D }) => {
      const id = partOf(e.object);
      if (id) {
        e.stopPropagation();
        setHovered(id);
        document.body.style.cursor = 'pointer';
      }
    },
    onPointerOut: () => {
      setHovered(null);
      document.body.style.cursor = '';
    },
  };

  const trayOpen = installed < PARTS.length;
  return (
    <group>
      <primitive object={model.robot} {...events} />
      {wiring && (
        <>
          <Devices />
          <WiringLayer W={ARM_WIRING} wires={wiring.wires} pending={wiring.pending} hover={wiring.hover} onPick={wiring.onPick} onHover={wiring.onHover} onRemoveWire={wiring.onRemoveWire} place={place} />
        </>
      )}
      {trayOpen && (
        <group>
          <mesh position={[-0.385, -0.003, 0]}>
            <boxGeometry args={[0.4, 0.006, 0.72]} />
            <meshStandardMaterial color="#DCE3F0" />
          </mesh>
          {PARTS.map((p, i) => {
            if (i < installed) return null;
            const x = -0.3 - (i % 2) * 0.17;
            const z = -0.24 + Math.floor(i / 2) * 0.24;
            return (
              <group key={p.id} position={[x, 0, z]}>
                <primitive object={model.ghosts[p.id]} {...events} />
              </group>
            );
          })}
        </group>
      )}
      {target && (
        <mesh position={[target.x, target.y, target.z]}>
          <sphereGeometry args={[0.012, 16, 16]} />
          <meshStandardMaterial color="#F5B301" emissive="#F5B301" emissiveIntensity={0.5} />
        </mesh>
      )}
    </group>
  );
}
