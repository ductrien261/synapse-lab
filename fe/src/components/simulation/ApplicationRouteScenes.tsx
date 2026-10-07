import { Block, Floor, Label, Moving, ObjectModel, point, type SceneProps } from './ApplicationScenePrimitives';
import styles from './ApplicationScene.module.css';

export function FactoryScene({ scenario, step, color, duration }: SceneProps) {
  const positions = scenario.nodes.map(n => point(n.x, n.y));
  const active = step.route.at(-1) ?? 0;
  return <><Floor />
    {scenario.edges.map(([a,b],i)=><g key={i}><path d={`M${positions[a]}L${positions[b]}`} stroke="white" strokeWidth="13"/><path d={`M${positions[a]}L${positions[b]}`} stroke="#a6bdd6" strokeWidth="2" strokeDasharray="5 6"/></g>)}
    <polyline points={step.route.map(i=>positions[i].join(',')).join(' ')} fill="none" stroke={color} strokeWidth="5" strokeLinejoin="round"/>
    {scenario.nodes.map((n,i)=><g key={i} transform={`translate(${positions[i].join(' ')})`}><Block color={step.route.includes(i)?color:'#9db8d3'}/><Label x={0} y={34}>{n.label}</Label></g>)}
    <Moving x={positions[active][0]} y={positions[active][1]-65} duration={duration}><ObjectModel theme="robot" color={color}/>{step.phase==='act'&&<ellipse cy="35" rx="36" ry="18" fill="none" stroke="#34d399" strokeWidth="3" className={styles.pulse}/>}</Moving>
  </>;
}

const circuitPoint = (n: {x:number;y:number}): [number,number] => [65+n.x*5.3+n.y*.65,150+n.y*3.3];
export function CircuitScene({ scenario, step, duration }: SceneProps) {
  const positions=scenario.nodes.map(circuitPoint);
  const active=step.route.at(-1)??0;
  const completed=new Set(step.phase==='move'?step.route.slice(0,-1):step.route);
  return <>
    <path d="M64 135L624 135 692 472 126 472Z" fill="#123f35"/>
    <path d="M60 120L620 120 686 455 122 455Z" fill="#237b62" stroke="#174f43" strokeWidth="3"/>
    {Array.from({length:12},(_,r)=>Array.from({length:18},(_,c)=><circle key={`${r}-${c}`} cx={87+c*29+r*4.5} cy={146+r*24} r="1.2" fill="#91c5a0" opacity=".45"/>))}
    <g stroke="#bda855" strokeWidth="5" fill="none"><path d="M164 210h110v105h116v78h150M233 171v180h-57M468 180v105h104v92M300 413v-70h-70"/></g>
    <rect x="314" y="267" width="90" height="66" rx="6" fill="#154d40" stroke="#90b9a3"/><text x="359" y="305" textAnchor="middle" fill="#b0d8c1" fontSize="14">SYNAPSE</text>
    <polyline points={step.route.map(i=>positions[i].join(',')).join(' ')} fill="none" stroke="#d6f5ff" strokeWidth="3" strokeDasharray="6 5"/>
    {scenario.nodes.map((n,i)=><g key={i}><circle cx={positions[i][0]} cy={positions[i][1]} r={i?12:15} fill={completed.has(i)?'#8bdeaa':'#d7b966'} stroke="#f3efd4" strokeWidth="3"/><circle cx={positions[i][0]} cy={positions[i][1]} r="4" fill={completed.has(i)?'#164e3c':'#fff4bd'}/><Label x={positions[i][0]} y={positions[i][1]+28}>{n.label}</Label></g>)}
    <Moving x={positions[active][0]} y={positions[active][1]} duration={duration}>
      <g className={step.phase==='act'?styles.drill:undefined}><path d="M-13 -74l17 -10 17 10v46L4 -18 -13 -28Z" fill="#a9bfd1"/><path d="M4 -64l17 -10v46L4 -18Z" fill="#66849f"/><path d="M-13 -74l17 -10 17 10L4 -64Z" fill="#e8f2ff"/><path d="M0 -23h8L4 -4Z" fill="#253d55"/><circle cx="-5" cy="-48" r="3" fill="#c9eaff"/></g>
      {step.phase==='act'&&<circle r="20" fill="none" stroke="#b8f9c9" strokeWidth="3" className={styles.pulse}/>}
    </Moving>
  </>;
}

function Person({ color }: {color:string}) {
  return <g><ellipse cy="5" rx="15" ry="7" fill="#243355" opacity=".16"/><path d="M-6 -17l-3 20m15 -20 4 20" stroke="#243355" strokeWidth="6"/><path d="M-10 -36h20l-3 23H-7Z" fill={color}/><circle cy="-46" r="9" fill="#efc49b"/><path d="M-10 -31l-7 18m27 -18 7 15" stroke="#efc49b" strokeWidth="5"/><rect x="10" y="-15" width="12" height="15" rx="2" fill="#e9b742"/></g>;
}
const streetPoint=(n:{x:number;y:number}):[number,number]=>[96+n.x*5.2,145+n.y*3.3];
function streetRoute(positions:[number,number][], route:number[]) {
 return route.flatMap((n,i)=> i ? [[positions[n][0],positions[route[i-1]][1]],positions[n]] : [positions[n]]).map(p=>p.join(',')).join(' ');
}
function StreetTraveler({positions,step,duration,children}:{positions:[number,number][];step:SceneProps['step'];duration:number;children:React.ReactNode}) {
 const active=step.route.at(-1)??0;
 const previous=step.route.at(-2)??active;
 const [x,y]=positions[active]; const [px,py]=positions[previous];
 return <g transform={`translate(${x} ${y})`}><g key={step.route.join('-')} className={styles.streetMover} style={{offsetPath:`path('M${px-x} ${py-y} L0 ${py-y} L0 0')`,offsetRotate:'0deg',offsetDistance:'100%',animationDuration:`${duration}ms`}}>{children}</g></g>;
}
export function TownScene({scenario,step,color,duration}:SceneProps) {
 const positions=scenario.nodes.map(streetPoint);
 const xs=[...new Set(positions.map(p=>p[0]))]; const ys=[...new Set(positions.map(p=>p[1]))];
 return <><rect x="54" y="101" width="622" height="405" rx="28" fill="#e1eddf"/>
   {xs.map(x=><g key={x}><path d={`M${x} 120V485`} stroke="white" strokeWidth="29"/><path d={`M${x} 120V485`} stroke="#bbcad6" strokeDasharray="8 6"/></g>)}
   {ys.map(y=><g key={y}><path d={`M75 ${y}H655`} stroke="white" strokeWidth="29"/><path d={`M75 ${y}H655`} stroke="#bbcad6" strokeDasharray="8 6"/></g>)}
   {[[235,235],[400,235],[565,235],[235,365],[400,365],[565,365]].map(([x,y],i)=><g key={i} transform={`translate(${x} ${y})`}><rect x="-24" y="-25" width="48" height="40" rx="4" fill="#d4bdad"/><rect x="-24" y="-36" width="48" height="40" rx="4" fill="#f4e5cb"/><path d="M-33 -36L0 -54 33 -36Z" fill={['#9eb4c8','#be907d','#b5a8c6'][i%3]}/><rect x="-14" y="-28" width="10" height="12" rx="2" fill="white"/><circle cx="39" cy="0" r="11" fill="#8bb299"/></g>)}
   <polyline points={streetRoute(positions,step.route)} fill="none" stroke={color} strokeWidth="4" strokeLinejoin="round"/>
   {scenario.nodes.map((n,i)=><g key={i}><circle cx={positions[i][0]} cy={positions[i][1]} r="14" fill={step.route.includes(i)?'#d1fae5':'white'} stroke={color} strokeWidth="2"/><text x={positions[i][0]} y={positions[i][1]+5} textAnchor="middle" fontSize="13" fill="#243355">{i}</text><Label x={positions[i][0]} y={positions[i][1]+33}>{n.label}</Label></g>)}
   <StreetTraveler positions={positions} step={step} duration={duration}><Person color={color}/>{step.phase==='act'&&<text x="18" y="-45" fill="#059669" fontSize="24">✓</text>}</StreetTraveler>
 </>;
}

export function DeliveryScene({scenario,step,color,duration}:SceneProps) {
 const positions=scenario.nodes.map(streetPoint);
 return <><path d="M55 104H652l25 398H80Z" fill="#e7ecf7"/><path d="M55 104v15h597v-15" fill="#d4dced"/>
  {[...new Set(positions.map(p=>p[1]))].map(y=><g key={y}><path d={`M80 ${y}H648`} stroke="#b4becd" strokeWidth="26"/><path d={`M80 ${y}H648`} stroke="white" strokeDasharray="10 9"/></g>)}
  {[...new Set(positions.map(p=>p[0]))].map(x=><g key={x}><path d={`M${x} 127V480`} stroke="#b4becd" strokeWidth="26"/><path d={`M${x} 127V480`} stroke="white" strokeDasharray="10 9"/></g>)}
  <polyline points={streetRoute(positions,step.route)} fill="none" stroke={color} strokeWidth="4"/>
  {scenario.nodes.map((n,i)=><g key={i} transform={`translate(${positions[i][0]} ${positions[i][1]})`}>
   <g transform="translate(25 -25)"><Block height={i?48:65} color={i?'#b5b4d6':'#738eae'}/>{!i&&<path d="M-18 -55h32v30h-32Z" fill="#3d546f"/>}</g>
   {i>0&&step.route.includes(i)&&step.route.at(-1)!==i&&<g transform="translate(-23 -5)"><path d="M-9 -16h18v16H-9Z" fill="#d6a05a"/><text x="0" y="-4" textAnchor="middle" fill="white" fontSize="13">✓</text></g>}
   <Label x={0} y={33}>{n.label}</Label>
  </g>)}
  <StreetTraveler positions={positions} step={step} duration={duration}><ObjectModel theme="delivery" color={color}/>{step.phase==='act'&&<g className={styles.parcel}><rect x="-10" y="-16" width="20" height="18" fill="#d9a663" stroke="#986f37"/><path d="M0 -16V2" stroke="#fff0ca" strokeWidth="3"/></g>}</StreetTraveler>
 </>;
}
