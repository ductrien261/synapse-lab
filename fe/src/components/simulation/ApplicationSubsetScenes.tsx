import { Label, Moving, ObjectModel, type SceneProps } from './ApplicationScenePrimitives';

function totals({scenario,step}:SceneProps) {
 const values=scenario.scene?.values??[];
 return {values,total:step.route.reduce((sum,i)=>sum+values[i],0),target:scenario.scene?.target??0,unit:scenario.scene?.unit??''};
}
export function BudgetScene(props:SceneProps) {
 const {scenario,step,color,duration}=props;const {values,total,target,unit}=totals(props);
 return <><path d="M69 347h581v115L361 517 69 462Z" fill="#d8c8a3"/><path d="M69 347L361 301 650 347 361 405Z" fill="#f1e6ce"/>
  <path d="M100 350h520v103q0 17 -17 17H117q-17 0 -17 -17Z" fill="#b08c57"/><path d="M100 350q260 55 520 0v28q-260 56 -520 0Z" fill="#c6a46f"/><rect x="535" y="397" width="66" height="39" rx="9" fill="#927047"/><circle cx="552" cy="416" r="5" fill="#edcf92"/>
  {scenario.nodes.map((n,i)=>{const selected=step.route.includes(i);return <Moving key={i} x={121+i*149} y={selected?325:166} duration={duration}><rect x="-49" y="-65" width="98" height="112" rx="8" fill="white" stroke={selected?color:'#dacba9'} strokeWidth="2"/><g transform="translate(0 -10) scale(.7)"><ObjectModel theme="coins" color={color}/></g><text textAnchor="middle" y="17" fontSize="12" fill="#6d5b3e">{n.label}</text><text textAnchor="middle" y="37" fontSize="15" fontWeight="700" fill={selected?color:'#6d5b3e'}>{values[i]} {unit}</text>{selected&&<text x="30" y="-43" fill={color} fontSize="17">✓</text>}</Moving>;})}
  <Label x={360} y={83}>Chọn các hạng mục đưa vào ngân sách</Label><Label x={360} y={548} color={color}>{total} / {target} {unit}{total>target?' · Vượt ngân sách':''}</Label>
 </>;
}
export function CargoScene(props:SceneProps) {
 const {scenario,step,color,duration}=props; const {values,total,target,unit}=totals(props);
 return <><path d="M66 145h590v73H66Z" fill="#aebdcb"/><rect x="66" y="125" width="590" height="73" rx="28" fill="#d6dfe6" stroke="#a7b8c7" strokeWidth="2"/>
  {Array.from({length:18},(_,i)=><path key={i} d={`M${88+i*31} 137v47`} stroke="#adbdcb" strokeWidth="7" strokeLinecap="round"/>)}
  <path d="M128 401l236 -93 229 93v32l-229 99 -236 -99Z" fill="#70889e"/><path d="M128 401l236 -93 229 93 -229 99Z" fill="#dce5ed" stroke="#9cb1c4"/>
  <path d="M300 439h128v50H300Z" fill="#263e50"/><text x="364" y="470" textAnchor="middle" fontFamily="monospace" fontSize="22" fill={total>target?'#ffba7c':'#90f4be'}>{total} {unit}</text>
  {scenario.nodes.map((n,i)=>{const selected=step.route.includes(i);return <Moving key={i} x={selected?213+i*95:126+i*154} y={selected?365+(i%2)*33:153} duration={duration}><path d="M-27 -39L0 -54 27 -39v42L0 18 -27 3Z" fill={selected?'#c99254':'#b3a28d'} stroke="#8d775b"/><path d="M-27 -39L0 -54 27 -39 0 -24Z" fill="#edc797"/><path d="M0 -24V18M-14 -47l28 16" stroke="#ffe4b9" strokeWidth="5"/><text x="-13" y="-10" fontSize="14" fill="white">{values[i]}</text><Label x={0} y={40}>{n.label}</Label></Moving>;})}
  <Label x={360} y={75}>Băng chuyền → cân kiểm tra → nhóm kiện</Label><Label x={360} y={553} color={color}>Cần đúng {target} {unit}{total>target?' · Quá tải, bỏ nhánh này':''}</Label>
 </>;
}
export function TimeScene(props:SceneProps) {
 const {scenario,step,color,duration}=props;const {values,total,target,unit}=totals(props);
 const scale=500/Math.max(target,total,1);
 return <><path d="M64 350h590v143l-18 13H81l-17 -13Z" fill="#c5d0e0"/><rect x="64" y="330" width="590" height="156" rx="12" fill="white" stroke="#bac9dd"/>
  <Label x={360} y={368}>Phiên làm việc · {target} {unit}</Label><rect x="105" y="393" width="500" height="55" rx="6" fill="#edf1f8"/>
  {Array.from({length:7},(_,i)=><g key={i}><path d={`M${105+i*500/6} 452v7`} stroke="#8d9db6"/><text x={105+i*500/6} y="476" textAnchor="middle" fontSize="12" fill="#72839d">{Math.round(i*Math.max(target,total)/6)}</text></g>)}
  {scenario.nodes.map((n,i)=>{const selected=step.route.includes(i);const before=step.route.slice(0,step.route.indexOf(i)).reduce((sum,k)=>sum+values[k],0);const width=selected?values[i]*scale:120;return <Moving key={i} x={selected?105+before*scale:74+i*148} y={selected?397:164} duration={duration}><rect y="6" width={width-4} height="46" rx="5" fill="#435b83"/><rect width={width-4} height="46" rx="5" fill={selected?color:['#7c93b7','#9485b3','#6ca5a7','#b39173'][i%4]}/><text x={(width-4)/2} y="20" textAnchor="middle" fill="white" fontSize="12">{n.label}</text><text x={(width-4)/2} y="37" textAnchor="middle" fill="white" fontSize="12">{values[i]} {unit}</text></Moving>;})}
  <path d={`M${105+target*scale} 385v68`} stroke="#d97706" strokeWidth="2" strokeDasharray="4 3"/><g transform="translate(360 105)"><ObjectModel theme="clock" color="#627bba"/></g><Label x={360} y={282}>Ghép các tác vụ nguyên vẹn vào một phiên</Label><Label x={360} y={539} color={color}>{total} / {target} {unit}{total>target?' · Vượt thời lượng':''}</Label>
 </>;
}
export function ReceiptScene(props:SceneProps) {
 const {scenario,step,color,duration}=props;const {values,total,target,unit}=totals(props);
 return <><path d="M69 94h235v407H69Z" fill="#bdcfc6"/><rect x="56" y="80" width="235" height="407" rx="9" fill="#fdfefc" stroke="#c7d9d0"/><path d="M430 94h224v407H430Z" fill="#b8cec7"/><rect x="416" y="80" width="224" height="407" rx="9" fill="white" stroke="#c7d9d0"/>
  <Label x={174} y={116}>Khoản thu chờ đối chiếu</Label><Label x={528} y={116}>Nhóm khớp mục tiêu</Label><path d="M329 275h47m-13 -12 13 12 -13 12" stroke="#8aa99c" strokeWidth="4" fill="none"/>
  {scenario.nodes.map((n,i)=>{const selected=step.route.includes(i);return <Moving key={i} x={selected?432:72} y={148+i*67} duration={duration}><path d="M0 0h190v52l-10 -4 -10 4 -10 -4 -10 4 -10 -4 -10 4 -10 -4 -10 4 -10 -4 -10 4 -10 -4 -10 4 -10 -4 -10 4 -10 -4 -10 4 -10 -4 -20 4Z" fill={selected?'#e5f4ee':'#f0f3ee'} stroke={selected?color:'#d6dfd5'}/><text x="12" y="21" fontSize="12" fill="#57766b">{n.label}</text><text x="12" y="41" fontSize="15" fill={selected?color:'#57766b'} fontWeight="700">{values[i]} {unit}</text>{selected&&<text x="161" y="33" fontSize="23" fill={color}>✓</text>}</Moving>;})}
  <path d="M433 435h190" stroke="#c7d9d0"/><text x="528" y="464" textAnchor="middle" fill={color} fontSize="17" fontWeight="700">Tổng: {total}</text><Label x={360} y={540} color={color}>Mục tiêu {target} {unit}{total===target?' · Khớp số học':total>target?' · Loại nhóm vượt tổng':''}</Label>
 </>;
}
