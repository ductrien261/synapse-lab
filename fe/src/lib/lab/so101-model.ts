/**
 * Nạp mô hình SO-101 từ URDF và tính động học, động học ngược, moment tĩnh trực tiếp trên mô hình.
 * Mô hình: fe/public/lab/so101 (Apache-2.0, xem NOTICE.md trong thư mục đó).
 * Chỉ chạy ở trình duyệt (dùng three và urdf-loader).
 */
import { Box3, Group, LoadingManager, Matrix4, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import URDFLoader, { type URDFLink, type URDFRobot } from 'urdf-loader';
import { LIMITS, PARTS, SUPPLY, type ArmParams, type PartId } from './arm-spec';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Model {
  robot: URDFRobot;
  /** Bản sao từng bộ phận, đứng sẵn, để đặt lên giá linh kiện */
  ghosts: Record<PartId, Group>;
  materials: Record<PartId, MeshStandardMaterial[]>;
}

const URDF_URL = '/lab/so101/so101.urdf';
const JAW_LINK = 'moving_jaw_so101_v1_link';
const G = 9.81;
const rad = (d: number) => (d * Math.PI) / 180;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type MaybeURDF = Object3D & { isURDFJoint?: boolean };

/** Các mesh thuộc riêng một link (không đi vào các link con phía sau khớp). */
function ownMeshes(link: Object3D): Mesh[] {
  const out: Mesh[] = [];
  const walk = (o: Object3D) => {
    for (const c of o.children as MaybeURDF[]) {
      if (c.isURDFJoint) continue;
      if ((c as Mesh).isMesh) out.push(c as Mesh);
      walk(c);
    }
  };
  walk(link);
  return out;
}

export async function loadModel(): Promise<Model> {
  // Các file STL được nạp sau khi URDF đọc xong, nên phải chờ nạp hết mới gán màu được.
  // Tự đếm số mesh đã yêu cầu và đã xong, không phụ thuộc vào thời điểm LoadingManager báo.
  let started = 0;
  let finished = 0;
  let check = () => {};
  const meshesReady = new Promise<void>((resolve) => {
    check = () => {
      if (started > 0 && finished >= started) resolve();
    };
  });
  const manager = new LoadingManager();
  const loader = new URDFLoader(manager);
  loader.loadMeshCb = (url, manager, material, onLoad) => {
    started += 1;
    new STLLoader(manager).load(
      url,
      (geo) => {
        const mesh = new Mesh(geo, material);
        mesh.userData.motor = /sts3215/.test(url);
        onLoad(mesh);
        finished += 1;
        check();
      },
      undefined,
      (err) => {
        onLoad(new Object3D(), err as Error);
        finished += 1;
        check();
      },
    );
  };
  const robot = await loader.loadAsync(URDF_URL);
  check();
  const timeout = new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Hết thời gian nạp mô hình')), 30000));
  await Promise.race([meshesReady, timeout]);
  // Chốt an toàn: chờ tới khi mọi bộ phận đã có mesh và tổng số mesh không đổi qua vài lần kiểm tra liên tiếp.
  const countMeshes = () => PARTS.reduce((n, p) => n + ownMeshes(robot.links[p.link]).length, 0) + ownMeshes(robot.links[JAW_LINK]).length;
  const complete = () => PARTS.every((p) => ownMeshes(robot.links[p.link]).length > 0) && ownMeshes(robot.links[JAW_LINK]).length > 0;
  let last = -1;
  let stable = 0;
  await Promise.race([
    (async () => {
      while (stable < 3) {
        await new Promise((r) => setTimeout(r, 60));
        const c = countMeshes();
        stable = complete() && c === last ? stable + 1 : 0;
        last = c;
      }
    })(),
    timeout,
  ]);
  // URDF dùng trục Z hướng lên; three.js dùng trục Y.
  robot.rotation.x = -Math.PI / 2;
  robot.updateMatrixWorld(true);

  const materials = {} as Record<PartId, MeshStandardMaterial[]>;
  const ghosts = {} as Record<PartId, Group>;

  for (const part of PARTS) {
    const link = robot.links[part.link];
    const links: URDFLink[] = part.id === 'gripper' ? [link, robot.links[JAW_LINK]] : [link];
    const body = new MeshStandardMaterial({ color: part.color, roughness: 0.5, metalness: 0.1 });
    const motor = new MeshStandardMaterial({ color: '#2A2F3A', roughness: 0.45, metalness: 0.2 });
    materials[part.id] = [body, motor];

    links.forEach((l) => {
      l.userData.partId = part.id;
      for (const m of ownMeshes(l)) m.material = m.userData.motor ? motor : body;
    });

    // Bản sao đứng sẵn cho giá linh kiện: giữ nguyên vị trí tương đối trong khung link.
    const inv = new Matrix4().copy(link.matrixWorld).invert();
    const holder = new Group();
    const inner = new Group();
    for (const l of links) {
      for (const m of ownMeshes(l)) {
        const c = m.clone();
        c.matrixAutoUpdate = false;
        c.matrix.copy(inv.clone().multiply(m.matrixWorld));
        inner.add(c);
      }
    }
    inner.rotation.x = -Math.PI / 2;
    holder.add(inner);
    holder.updateMatrixWorld(true);
    const box = new Box3().setFromObject(holder);
    inner.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
    holder.userData.partId = part.id;
    ghosts[part.id] = holder;
  }
  return { robot, ghosts, materials };
}

/** Đặt góc các khớp theo thông số. */
export function applyPose(robot: URDFRobot, p: ArmParams): void {
  const j = robot.joints;
  j.shoulder_pan.setJointValue(rad(p.pan));
  j.shoulder_lift.setJointValue(rad(p.lift));
  j.elbow_flex.setJointValue(rad(p.elbow));
  j.wrist_flex.setJointValue(rad(p.flex));
  j.wrist_roll.setJointValue(rad(p.roll));
  j.gripper.setJointValue(rad(LIMITS.grip[0] + p.grip * (LIMITS.grip[1] - LIMITS.grip[0])));
  robot.updateMatrixWorld(true);
}

/** Chỉ hiện `count` bộ phận đầu tiên (các link lồng nhau nên ẩn link nào là ẩn luôn phần sau nó). */
export function setInstalled(robot: URDFRobot, count: number): void {
  PARTS.forEach((part, i) => {
    robot.links[part.link].visible = i < count;
  });
}

/**
 * Tô sáng bộ phận đang chọn (sáng rõ) hoặc đang rê chuột (sáng nhẹ).
 * Khi `dim` bật và có bộ phận được chọn, các bộ phận còn lại mờ đi để dễ quan sát.
 */
export function setHighlight(model: Model, selected: PartId | null, hovered: PartId | null, dim = false): void {
  for (const part of PARTS) {
    const sel = selected === part.id;
    const hot = hovered === part.id;
    const faded = dim && selected !== null && !sel && !hot;
    for (const m of model.materials[part.id]) {
      m.emissive.set(sel ? '#7FB2FF' : '#FFFFFF');
      m.emissiveIntensity = sel ? 0.35 : hot ? 0.14 : 0;
      m.transparent = faded;
      m.opacity = faded ? 0.12 : 1;
      m.depthWrite = !faded;
      m.needsUpdate = true;
    }
  }
}

/**
 * Tư thế duỗi ngang: giữ khuỷu và cổ tay thẳng, tìm góc vai để đầu tay ngang với trục vai.
 * Trả về thông số và tầm với theo phương ngang (m), đo trực tiếp trên mô hình.
 */
export function horizontalPose(robot: URDFRobot, base: ArmParams): { params: ArmParams; reach: number } {
  let best = { ...base, pan: 0, elbow: 0, flex: 0, roll: 0 };
  let bestErr = Infinity;
  const origin = new Vector3();
  for (let lift = LIMITS.lift[0]; lift <= LIMITS.lift[1]; lift += 1) {
    const cand = { ...base, pan: 0, lift, elbow: 0, flex: 0, roll: 0 };
    applyPose(robot, cand);
    robot.joints.shoulder_lift.getWorldPosition(origin);
    const err = Math.abs(tipPosition(robot).y - origin.y);
    if (err < bestErr) {
      bestErr = err;
      best = cand;
    }
  }
  applyPose(robot, best);
  robot.joints.shoulder_lift.getWorldPosition(origin);
  const tip = tipPosition(robot);
  return { params: best, reach: Math.hypot(tip.x - origin.x, tip.z - origin.z) };
}

export function tipPosition(robot: URDFRobot): Vec3 {
  const v = new Vector3();
  robot.links.gripper_frame_link.getWorldPosition(v);
  return { x: v.x, y: v.y, z: v.z };
}

/* ---------- Động học ngược: giảm bình phương có giảm chấn trên chính mô hình ---------- */

const IK_JOINTS = ['pan', 'lift', 'elbow', 'flex'] as const;

function solve3(a: number[][], b: number[]): number[] {
  const det = (m: number[][]) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const d = det(a);
  if (Math.abs(d) < 1e-12) return [0, 0, 0];
  return [0, 1, 2].map((col) => det(a.map((row, i) => row.map((v, j) => (j === col ? b[i] : v)))) / d);
}

export interface IkResult {
  params: ArmParams;
  reachable: boolean;
}

export function inverse(robot: URDFRobot, start: ArmParams, target: Vec3): IkResult {
  const q: ArmParams = { ...start };
  const pos = (p: ArmParams) => {
    applyPose(robot, p);
    return tipPosition(robot);
  };
  const diff = (a: Vec3, b: Vec3) => [a.x - b.x, a.y - b.y, a.z - b.z];
  let err = Infinity;
  for (let it = 0; it < 80; it++) {
    const e = diff(target, pos(q));
    err = Math.hypot(e[0], e[1], e[2]);
    if (err < 0.002) break;
    // Đạo hàm theo radian (mét trên radian) để hệ số giảm chấn có cùng cỡ với J J^T
    const epsDeg = 0.5;
    const epsRad = rad(epsDeg);
    const base = pos(q);
    const cols = IK_JOINTS.map((k) => {
      const t = pos({ ...q, [k]: q[k] + epsDeg });
      return [(t.x - base.x) / epsRad, (t.y - base.y) / epsRad, (t.z - base.z) / epsRad];
    });
    // dq = J^T (J J^T + λ I)^-1 e
    const lambda = 0.0005;
    const a = [0, 1, 2].map((i) => [0, 1, 2].map((j) => cols.reduce((s, c) => s + c[i] * c[j], 0) + (i === j ? lambda : 0)));
    const y = solve3(a, e);
    IK_JOINTS.forEach((k, idx) => {
      const dqRad = cols[idx][0] * y[0] + cols[idx][1] * y[1] + cols[idx][2] * y[2];
      const dqDeg = clamp((dqRad * 180) / Math.PI, -10, 10);
      q[k] = clamp(q[k] + dqDeg, LIMITS[k][0], LIMITS[k][1]);
    });
  }
  const end = pos(q);
  err = Math.hypot(target.x - end.x, target.y - end.y, target.z - end.z);
  return { params: q, reachable: err < 0.01 };
}

/* ---------- Moment tĩnh từ khối lượng và tâm khối trong URDF ---------- */

export interface TorqueReport {
  lift: number;
  elbow: number;
  flex: number;
  /** Moment kẹt của servo ở nguồn đang chọn */
  limit: number;
}

function linkCom(link: URDFLink): { m: number; p: Vector3 } {
  const [x, y, z] = link.inertial.origin.xyz;
  return { m: link.inertial.mass, p: new Vector3(x, y, z).applyMatrix4(link.matrixWorld) };
}

/** Moment (N·m) quanh từng khớp để giữ cánh tay đứng yên: |a · (r × F)| cộng dồn các vật phía sau khớp. */
export function torques(robot: URDFRobot, p: ArmParams): TorqueReport {
  const L = robot.links;
  const loads = (names: string[]) => names.map((n) => linkCom(L[n]));
  const tip = new Vector3();
  L.gripper_frame_link.getWorldPosition(tip);
  const payload = { m: p.payload, p: tip };

  const about = (joint: string, masses: { m: number; p: Vector3 }[]) => {
    const j = robot.joints[joint];
    const origin = new Vector3();
    j.getWorldPosition(origin);
    const axis = j.axis.clone().transformDirection(j.matrixWorld).normalize();
    let sum = 0;
    for (const { m, p: pos } of masses) {
      const r = pos.clone().sub(origin);
      const f = new Vector3(0, -m * G, 0);
      sum += axis.dot(r.cross(f));
    }
    return Math.abs(sum);
  };

  const gripper = loads(['gripper_link', JAW_LINK]);
  return {
    lift: about('shoulder_lift', [...loads(['upper_arm_link', 'lower_arm_link', 'wrist_link']), ...gripper, payload]),
    elbow: about('elbow_flex', [...loads(['lower_arm_link', 'wrist_link']), ...gripper, payload]),
    flex: about('wrist_flex', [...loads(['wrist_link']), ...gripper, payload]),
    limit: SUPPLY[p.supply].nm,
  };
}

/** Bộ số liệu có cấu trúc dành cho trợ lý AI đọc và giải thích (AI không tự tính vật lý). */
export function simulationState(robot: URDFRobot, p: ArmParams) {
  applyPose(robot, p);
  const t = torques(robot, p);
  return {
    angles_deg: { pan: p.pan, lift: p.lift, elbow: p.elbow, flex: p.flex, roll: p.roll },
    gripper_open_ratio: p.grip,
    payload_kg: p.payload,
    supply: p.supply,
    tip_position_m: tipPosition(robot),
    torque_nm: { shoulder_lift: t.lift, elbow: t.elbow, wrist_flex: t.flex },
    motor_stall_torque_nm: t.limit,
    overloaded: [t.lift > t.limit && 'shoulder_lift', t.elbow > t.limit && 'elbow', t.flex > t.limit && 'wrist_flex'].filter(Boolean),
  };
}
