import type { AlgorithmApplicationScenario } from '@/lib/algorithm-api';
import styles from './ApplicationScene.module.css';
import type { ReactNode } from 'react';

export type Scenario = AlgorithmApplicationScenario;
export type Theme = NonNullable<Scenario['scene']>['theme'];
export type SceneProps = { scenario: Scenario; step: Scenario['steps'][number]; color: string; duration: number };
export const point = (x: number, y: number): [number, number] => [360 + (x - y) * 2.9, 115 + (x + y) * 1.7];
export const diamond = (x: number, y: number, size: number) => [[x, y], [x + size, y], [x + size, y + size], [x, y + size]].map(([a, b]) => point(a, b).join(',')).join(' ');
export function Moving({ x, y, duration, children }: { x: number; y: number; duration: number; children: ReactNode }) {
 return <g className={styles.moving} style={{ transform: `translate(${x}px, ${y}px)`, transitionDuration: `${duration}ms` }}>{children}</g>;
}
export function Label({ x, y, children, color = '#243355' }: { x: number; y: number; children: ReactNode; color?: string }) {
 return <text x={x} y={y} textAnchor="middle" fontSize="14" fontWeight="600" fill={color} paintOrder="stroke" stroke="#f3f7fd" strokeWidth="4">{children}</text>;
}
export function Floor({ fill = '#edf4fc' }: { fill?: string }) {
 return <><path d="M70 285v16l290 170 290 -170v-16L360 455Z" fill="#c4d6e8"/><polygon points={diamond(0,0,100)} fill={fill} stroke="#b9cde2"/>{Array.from({length:11},(_,i)=><g key={i} stroke="#bad1e8" opacity=".3"><path d={`M${point(i*10,0)}L${point(i*10,100)}M${point(0,i*10)}L${point(100,i*10)}`}/></g>)}</>;
}
export function Block({ color, height = 42 }: { color: string; height?: number }) {
  return <g stroke={color} strokeWidth="1.5" strokeLinejoin="round">
    <ellipse cy="9" rx="31" ry="13" fill="#243355" opacity=".10" stroke="none" />
    <path d={`M-23 -13 v-${height} l23 13 v${height}Z`} fill="#c5d9ec" />
    <path d={`M0 0 v-${height} l23 -13 v${height}Z`} fill={color} opacity=".72" />
    <path d={`M-23 ${-13-height} l23 -13 23 13 -23 13Z`} fill="#edf6ff" />
    <rect x="-16" y={-height + 1} width="10" height="13" rx="2" fill="white" stroke="none" />
    <circle cx="13" cy={-height + 7} r="3" fill="white" stroke="none" />
  </g>;
}
export function ObjectModel({ theme, color }: { theme: Theme; color: string }) {
  if (theme === 'robot' || theme === 'factory') return <g>
    <ellipse cy="6" rx="22" ry="9" fill="#243355" opacity=".15" />
    <circle cx="-13" cy="0" r="6" fill="#243355" /><circle cx="13" cy="0" r="6" fill="#243355" />
    <path d="M-19 -31 L0 -42 19 -31 19 -9 0 1 -19 -9Z" fill={color} />
    <path d="M-19 -31 L0 -42 19 -31 0 -22Z" fill="#a1d3ff" />
    <rect x="-14" y="-27" width="28" height="16" rx="5" fill="#243355" />
    <circle cx="-6" cy="-20" r="3" fill="#91f7dc" /><circle cx="6" cy="-20" r="3" fill="#91f7dc" />
    <path d="M0 -42v-12" stroke={color} strokeWidth="2" /><circle cy="-56" r="4" fill={color} />
  </g>;
  if (theme === 'knight' || theme === 'queen') return <g stroke={color} strokeWidth="2" strokeLinejoin="round">
    <ellipse cy="3" rx="21" ry="9" fill="#243355" opacity=".12" stroke="none" />
    <ellipse cy="-2" rx="18" ry="7" fill={color} />
    {theme === 'queen' ? <><path d="M-14 -38l7 10 7 -17 7 17 7 -10 -5 30H-9Z" fill="#ffe7a4" /><circle cy="-47" r="4" fill={color} /><path d="M-12 -13h24" /></> : <><path d="M-13 -7L-8 -25 -19 -27 -14 -42 0 -51 13 -40 14 -8Z" fill="#ede5ff" /><circle cx="-3" cy="-37" r="2" fill={color} /><path d="M0 -51l-2 -9 -8 12" fill={color} /></>}
  </g>;
  if (theme === 'sensor' || theme === 'tower' || theme === 'flag') return <g stroke={color} strokeWidth="2.5" fill="none">
    <Block color={color} height={14} /><path d="M0 -18v-42" />
    {theme === 'flag' ? <path d="M0 -60l27 8 -27 10Z" fill="#efd38a" /> : theme === 'tower' ? <><path d="M-15 -18L0 -66 15 -18M-10 -34h20M-6 -48H6M-10 -34l18 10M-6 -48l16 14" /><path d="M-12 -67q12 -10 24 0l-12 12Z" fill="#c5d9ec" /><circle cy="-67" r="3" fill={color} /></> : <><circle cy="-57" r="7" fill={color} /><path d="M-14 -69q-12 12 0 24M14 -69q12 12 0 24M-22 -77q-18 20 0 40M22 -77q18 20 0 40" opacity=".45" /></>}
  </g>;
  if (theme === 'coins') return <g stroke="#b18832" strokeWidth="1.5">{[0, 1, 2].map(n => <g key={n} transform={`translate(0,${-n * 9})`}><path d="M-22 -7v8a22 8 0 0 0 44 0v-8" fill="#ddb757" /><ellipse cy="-7" rx="22" ry="8" fill="#ffe6a0" /></g>)}<path d="M-5 -27h10m-5 -4v8" strokeWidth="2" /></g>;
  if (theme === 'clock') return <g><Block color={color} height={18} /><circle cy="-35" r="24" fill="white" stroke={color} strokeWidth="5" /><path d="M0 -51v16l12 7" fill="none" stroke={color} strokeWidth="3" /><circle cy="-35" r="3" fill={color} /></g>;
  if (theme === 'receipt' || theme === 'calendar' || theme === 'terminal') return <g>
    <Block color={color} height={15} /><path d="M-24 -57h48v42l-8 -4 -8 4 -8 -4 -8 4 -8 -4 -8 4Z" fill="white" stroke={color} strokeWidth="2" />
    <path d="M-24 -46h48" stroke={color} strokeWidth="7" />
    {theme === 'terminal' ? <path d="M-13 -35l6 5 -6 5m14 0h12" fill="none" stroke={color} strokeWidth="3" /> : <path d="M-15 -34h30m-30 8h20" stroke={color} strokeWidth="3" />}
  </g>;
  if (theme === 'delivery') return <g><ellipse cy="7" rx="32" ry="10" fill="#243355" opacity=".12" /><path d="M-30 -30h35v28h-35Z" fill={color} /><path d="M5 -24h15l12 14v8H5Z" fill="#b3cbef" /><path d="M10 -20h9l8 10H10Z" fill="white" /><circle cx="-19" r="7" fill="#243355" /><circle cx="21" r="7" fill="#243355" /></g>;
  if (theme === 'circuit') return <g><path d="M-28 -12L0 -27l28 15L0 4Z" fill="#184d4b" stroke={color} strokeWidth="3" /><path d="M0 -61v40m-10 -40h20l-4 25H-4Z" fill="#acc4cc" stroke={color} strokeWidth="2" /><path d="M-5 -24l5 12 5 -12" fill={color} /></g>;
  return <g><Block color={color} />{theme === 'town' ? <path d="M-29 -54L0 -82l29 28L0 -40Z" fill="#d49476" stroke={color} strokeWidth="1.5" /> : <path d="M-23 -55l23 13 23 -13M0 -42v42" fill="none" stroke="#f8e0ba" strokeWidth="5" />}</g>;
}
