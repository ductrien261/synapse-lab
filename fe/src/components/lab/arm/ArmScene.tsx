'use client';

import { useEffect, useRef, useState } from 'react';
import { Vector3, type Object3D } from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { PARTS, type ArmParams, type PartId } from '@/lib/lab/arm-spec';
import { applyPose, setHighlight, setInstalled, type Model, type Vec3 } from '@/lib/lab/so101-model';

const VIEWS = {
  build: { pos: [0.72, 0.55, 0.8] as [number, number, number], tgt: [-0.1, 0.06, 0] as [number, number, number] },
  show: { pos: [0.55, 0.38, 0.62] as [number, number, number], tgt: [0.1, 0.12, 0] as [number, number, number] },
};

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
  view: 'build' | 'show';
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
function CameraRig({ view }: { view: 'build' | 'show' }) {
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

function World({ model, params, installed, selected, dim, onPart, target }: SceneProps) {
  const [hovered, setHovered] = useState<PartId | null>(null);

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
