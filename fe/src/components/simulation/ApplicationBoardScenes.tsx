import { Floor, Label, Moving, ObjectModel, diamond, point, type SceneProps } from './ApplicationScenePrimitives';
import styles from './ApplicationScene.module.css';

function boardPosition(index:number, size:number) { return point((index%size+.5)*100/size,(Math.floor(index/size)+.5)*100/size); }
function isBlocked(index:number, route:number[],size:number) {
 return !route.includes(index)&&route.some(q=>Math.floor(q/size)===Math.floor(index/size)||q%size===index%size||Math.abs(Math.floor(q/size)-Math.floor(index/size))===Math.abs(q%size-index%size));
}
function Chessboard({scenario,step,color,queen=false}:SceneProps & {queen?:boolean}) {
 const size=Math.sqrt(scenario.nodes.length);
 return <><path d="M51 282L360 97 669 282v24L360 492 51 306Z" fill={queen?'#826445':'#4c3d6b'}/><path d="M51 282L360 97 669 282 360 466Z" fill={queen?'#d7b889':'#b9abcd'}/>
 {scenario.nodes.map((_,i)=>{
 const selected=step.route.includes(i),blocked=queen&&isBlocked(i,step.route,size); const [x,y]=boardPosition(i,size);
 return <g key={i}><polygon points={diamond(i%size*100/size,Math.floor(i/size)*100/size,100/size)} fill={selected?'#c0ddc8':blocked?'#e5bba1':(i%size+Math.floor(i/size))%2?(queen?'#ad875e':'#8d7aa9'):'#f6e9d4'} stroke="#e6d6c2"/>
 {queen&&selected?<g transform={`translate(${x} ${y})`} className={styles.appear}><ObjectModel theme="queen" color={color}/></g>:<text x={x} y={y+5} textAnchor="middle" fill="#695777" fontSize="13">{queen?(blocked?'×':''):selected?step.route.indexOf(i)+1:''}</text>}</g>;
 })}
 {Array.from({length:size},(_,i)=><g key={i}><Label x={point((i+.5)*100/size,105)[0]} y={point((i+.5)*100/size,105)[1]+8}>{String.fromCharCode(65+i)}</Label><Label x={point(-5,(i+.5)*100/size)[0]} y={point(-5,(i+.5)*100/size)[1]}>{i+1}</Label></g>)}
 </>;
}
export function KnightScene(props:SceneProps) {
 const {scenario,step,color,duration}=props; const size=Math.sqrt(scenario.nodes.length);const active=step.route.at(-1)??0;const [x,y]=boardPosition(active,size);
 return <><Chessboard {...props}/><polyline points={step.route.slice(-2).map(i=>boardPosition(i,size).join(',')).join(' ')} stroke={color} strokeWidth="3" strokeDasharray="5 5" fill="none"/><Moving x={x} y={y-8} duration={duration}><g key={active} className={styles.hop}><ObjectModel theme="knight" color={color}/></g></Moving><Label x={360} y={529}>Mỗi nước chữ L · mỗi ô đúng một lần</Label></>;
}
export function QueenScene(props:SceneProps) { return <><Chessboard {...props} queen/><Label x={360} y={529}>Đặt hậu · kiểm tra cột và hai đường chéo</Label></>; }

export function RobotGridScene({scenario,step,color,duration}:SceneProps) {
 const size=Math.sqrt(scenario.nodes.length), active=step.route.at(-1)??0; const [x,y]=boardPosition(active,size);
 return <><Floor fill="#e0eff3"/><path d="M70 285v-80L360 35v80Z" fill="#d0e3ed" stroke="#b4ccd9"/>
  <path d="M118 240v-48l50 -30v50Z" fill="#819eaf"/><path d="M202 190v-36l55 -32v36Z" fill="#f4fbff"/>
  <text x="237" y="148" transform="rotate(-30 237 148)" textAnchor="middle" fill="#52758a" fontSize="13">LAB 05</text>
  {scenario.nodes.map((_,i)=>{const [px,py]=boardPosition(i,size);const visited=step.route.includes(i);return <g key={i}><polygon points={diamond(i%size*100/size+1,Math.floor(i/size)*100/size+1,100/size-2)} fill={visited?'#c0e8db':'#f1f8fc'} stroke="#abc8d7"/><ellipse cx={px} cy={py} rx="15" ry="9" fill={visited?'#69b8a7':'#c7d9e4'}/><text x={px} y={py+4} textAnchor="middle" fontSize="11" fill={visited?'white':'#638499'}>{visited?'✓':i+1}</text></g>;})}
  <Moving x={x} y={y-4} duration={duration}><ellipse cy="4" rx="28" ry="15" fill="none" stroke={color} strokeWidth="2" className={styles.pulse}/><ObjectModel theme="robot" color={color}/></Moving>
  <Label x={360} y={525}>Robot quét các điểm thử theo bước (2,1)</Label>
 </>;
}
export function TerminalScene({scenario,step,color}:SceneProps) {
 const size=Math.sqrt(scenario.nodes.length), active=step.route.at(-1)??0;
 const position=(i:number)=>[175+i%size*88,153+Math.floor(i/size)*57];
 return <><path d="M297 438v53h126v-53M252 502h216" stroke="#a2b3c7" strokeWidth="22"/><rect x="79" y="80" width="562" height="366" rx="20" fill="#243950"/><rect x="96" y="96" width="528" height="321" rx="8" fill="#132e32"/><circle cx="360" cy="431" r="5" fill="#8fd7cc"/>
  <text x="118" y="124" fill="#8fd7cc" fontFamily="monospace" fontSize="13">STATE COVERAGE / {step.route.length} OF {scenario.nodes.length}</text>
  <polyline points={step.route.slice(-2).map(i=>position(i).join(',')).join(' ')} fill="none" stroke="#80dbc4" strokeWidth="2" strokeDasharray="4 4"/>
  {scenario.nodes.map((_,i)=>{const [x,y]=position(i),visited=step.route.includes(i);return <g key={i}><rect x={x-31} y={y-17} width="62" height="34" rx="5" fill={active===i?'#279482':visited?'#285953':'#1c3d43'} stroke={active===i?'#91ffe0':'#3d626b'}/><text x={x} y={y+5} textAnchor="middle" fontFamily="monospace" fontSize="12" fill={visited?'#c3ffdf':'#85a6ae'}>{visited?'✓ ':''}S{i+1}</text></g>;})}
  <Label x={360} y={539} color={color}>Chạy kiểm thử · đánh dấu trạng thái đã bao phủ</Label>
 </>;
}
export function TrailScene({scenario,step,color,duration}:SceneProps) {
 const size=Math.sqrt(scenario.nodes.length),active=step.route.at(-1)??0;const [x,y]=boardPosition(active,size);
 return <><ellipse cx="360" cy="334" rx="300" ry="185" fill="#e3f0ed"/><path d="M56 395q80 -130 170 -36t170 -45 220 -80" stroke="#bddedc" strokeWidth="22" fill="none"/>
  <polyline points={step.route.map(i=>boardPosition(i,size).join(',')).join(' ')} fill="none" stroke="#c49c57" strokeWidth="4" strokeDasharray="5 5" opacity=".6"/>
  {scenario.nodes.map((_,i)=>{const [px,py]=boardPosition(i,size),visited=step.route.includes(i);return <g key={i}><path d={`M${px-24} ${py}l24 -13 24 13v10l-24 13 -24 -13Z`} fill={visited?'#b6c990':'#d9c7a6'} stroke="#b4ad8d"/><path d={`M${px-24} ${py}l24 -13 24 13 -24 13Z`} fill={visited?'#d3e7b9':'#f2e5cc'}/><text x={px} y={py+5} textAnchor="middle" fontSize="12" fill="#7c774d">{visited?step.route.indexOf(i)+1:'·'}</text></g>;})}
  <Moving x={x} y={y-4} duration={duration}><ObjectModel theme="flag" color={color}/></Moving><Label x={360} y={529}>Nối các đảo theo bước chữ L · ghé đủ 25 điểm</Label>
 </>;
}

export function SensorScene({scenario,step,color}:SceneProps) {
 const size=Math.sqrt(scenario.nodes.length);
 return <><Floor fill="#e6f1e9"/>
  <path d="M70 285v-62L360 53v62M360 53l290 170v62" fill="#d1e5e1" fillOpacity=".4" stroke="#b4d3cc" strokeWidth="2"/>
  {scenario.nodes.map((_,i)=>{const [x,y]=boardPosition(i,size);return <g key={i}><polygon points={diamond(i%size*100/size,Math.floor(i/size)*100/size,100/size)} fill={isBlocked(i,step.route,size)?'#f5d9b9':'#eff9f4'} stroke="#b7d6c7"/><ellipse cx={x} cy={y} rx="9" ry="5" fill="#b7d6c7"/></g>;})}
  {step.route.map(i=>{const [x,y]=boardPosition(i,size);return <g key={i} transform={`translate(${x} ${y})`} className={styles.appear}><ellipse rx="49" ry="28" fill={color} opacity=".07"/><ellipse rx="39" ry="22" fill="none" stroke={color} opacity=".4" className={styles.pulse}/><ObjectModel theme="sensor" color={color}/></g>;})}
  <Label x={360} y={529}>Vùng màu cam: vị trí gây nhiễu trong giả định</Label>
 </>;
}
export function CalendarScene({scenario,step,color}:SceneProps) {
 const size=Math.sqrt(scenario.nodes.length);
 return <><path d="M93 111h552v362H93Z" fill="#bdc6dc"/><rect x="79" y="92" width="552" height="367" rx="12" fill="white" stroke="#ccd3e5" strokeWidth="2"/><path d="M79 104q0 -12 12 -12h528q12 0 12 12v48H79Z" fill="#7c72a9"/>
  {[180,300,420,540].map(x=><path key={x} d={`M${x} 76v36`} stroke="#a8b0c6" strokeWidth="8" strokeLinecap="round"/>)}
  {Array.from({length:size},(_,i)=><g key={i}><Label x={240+i*97} y={182}>Giờ {i+1}</Label><Label x={128} y={235+i*58}>Việc {i+1}</Label></g>)}
  {scenario.nodes.map((_,i)=>{const x=197+i%size*97,y=202+Math.floor(i/size)*58,selected=step.route.includes(i),blocked=isBlocked(i,step.route,size);return <g key={i}><rect x={x} y={y} width="86" height="46" rx="5" fill={selected?'#e8e2f4':blocked?'#f9eee3':'#f1f4f9'} stroke={selected?color:'#e0e5ee'}/>{selected?<g className={styles.appear}><path d={`M${x+10} ${y+10}h65v29h-65Z`} fill={color}/><text x={x+43} y={y+30} textAnchor="middle" fill="white" fontSize="12">Đã xếp ✓</text></g>:blocked?<text x={x+43} y={y+29} textAnchor="middle" fill="#ceaa85" fontSize="20">×</text>:null}</g>;})}
  <Label x={360} y={520}>Mỗi nhiệm vụ một giờ · loại các cặp giờ xung đột</Label>
 </>;
}
export function TowerScene({scenario,step,color}:SceneProps) {
 const size=Math.sqrt(scenario.nodes.length);
 return <><path d="M61 282L359 103 660 282 665 330 360 505 61 332Z" fill="#b8b2a1"/><path d="M61 282L359 103 660 282 360 459Z" fill="#e0ddc7"/>
  {scenario.nodes.map((_,i)=>{const [x,y]=boardPosition(i,size);return <g key={i}><polygon points={diamond(i%size*100/size+2,Math.floor(i/size)*100/size+2,100/size-4)} fill={isBlocked(i,step.route,size)?'#edcfaa':'#c9d4b6'} stroke="#b2bda3"/><path d={`M${x-10} ${y+5}l10 -8 10 8`} fill="none" stroke="#abb799" strokeWidth="2"/></g>;})}
  {step.route.map(i=>{const [x,y]=boardPosition(i,size);return <g key={i} className={styles.appear}><path d={`M${x} ${y}L${x+53} ${y-31}M${x} ${y}L${x-53} ${y-31}`} stroke={color} strokeDasharray="5 4" opacity=".5"/><g transform={`translate(${x} ${y})`}><ObjectModel theme="tower" color={color}/></g></g>;})}
  <Label x={360} y={541}>Đặt trạm đo · giữ thông thoáng các hướng đo giả định</Label>
 </>;
}
