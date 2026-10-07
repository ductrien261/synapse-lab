'use client';

import type { ComponentType } from 'react';
import type { SceneProps, Scenario, Theme } from './ApplicationScenePrimitives';
import { FactoryScene, CircuitScene, TownScene, DeliveryScene } from './ApplicationRouteScenes';
import { RobotGridScene, KnightScene, TerminalScene, TrailScene, SensorScene, CalendarScene, TowerScene, QueenScene } from './ApplicationBoardScenes';
import { BudgetScene, CargoScene, TimeScene, ReceiptScene } from './ApplicationSubsetScenes';
import styles from './ApplicationScene.module.css';

const palettes: Record<Theme, [string, string]> = {
  factory: ['#477ec2', '#e8f0fb'], circuit: ['#159680', '#def3ed'], town: ['#bb8256', '#f7eddf'], delivery: ['#5976cd', '#e9edfc'],
  robot: ['#268aaf', '#def1f8'], knight: ['#7961a8', '#efebf6'], terminal: ['#198875', '#e0f2ec'], flag: ['#b28337', '#faf0d8'],
  sensor: ['#278f92', '#e3f5f2'], calendar: ['#8670ba', '#efebfa'], tower: ['#507bad', '#e5eff9'], queen: ['#92744a', '#f7efdf'],
  coins: ['#b58a2e', '#fff5d9'], crate: ['#bd8050', '#faeddf'], clock: ['#627bba', '#eaf0fb'], receipt: ['#389382', '#e3f5ed'],
};

const renderers: Record<Theme, ComponentType<SceneProps>> = {
 factory: FactoryScene, circuit: CircuitScene, town: TownScene, delivery: DeliveryScene,
 robot: RobotGridScene, knight: KnightScene, terminal: TerminalScene, flag: TrailScene,
 sensor: SensorScene, calendar: CalendarScene, tower: TowerScene, queen: QueenScene,
 coins: BudgetScene, crate: CargoScene, clock: TimeScene, receipt: ReceiptScene,
};
export function ApplicationScene({ scenario, index, speed, running = false }: { scenario: Scenario; index: number; speed: number; running?: boolean }) {
 const scene = scenario.scene!;
 const step = scenario.steps[index];
 const color = step.state === 'success' ? '#059669' : step.state === 'backtrack' ? '#d97706' : palettes[scene.theme][0];
 const Renderer = renderers[scene.theme];
 return <figure data-running={running} className={`min-w-0 rounded-2xl border border-[#DDE6F5] bg-[#F3F7FD] p-4 sm:p-5 ${styles.scene}`}>
  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#243355]"><span>{scene.title}</span><span className="rounded-full bg-white/90 px-3 py-1.5" style={{color}}>{step.phase==='act'?'Đang xử lý':step.state==='backtrack'?'Quay lui':step.state==='success'?(step.phase==='plan'?'Đã tìm được tuyến':'Hoàn tất'):step.phase==='move'?'Di chuyển':'Thử phương án'}</span></div>
  <svg viewBox="0 0 720 565" role="img" aria-label={`${scene.title}. ${step.title}: ${step.description}`} className="h-auto w-full">
   <Renderer scenario={scenario} step={step} color={color} duration={Math.min(700,850/speed)}/>
  </svg>
  <figcaption className="text-center text-xs leading-6 text-stone-500">{scene.caption??'Chuyển động thể hiện các lựa chọn trong mô hình minh họa.'}</figcaption>
 </figure>;
}
