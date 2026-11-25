/* ===== Small Basic студи: хөтөч дээр ажилладаг Small Basic хэлний орчуулагч (TextWindow, GraphicsWindow, Turtle, Shapes, Controls, Math, Text, Array, Clock, Sound, Timer, Program) ===== */
(function(){
const KW=new Set(['if','then','elseif','else','endif','for','to','step','endfor','while','endwhile','sub','endsub','goto','and','or']);
class SBErr extends Error{constructor(m,line){super(m);this.line=line}}
/* ---------- Лексер ---------- */
function lex(src,ln){const t=[];let i=0;const s=src;
 while(i<s.length){const c=s[i];
  if(c===' '||c==='\t'||c==='\r'){i++;continue}
  if(c==="'")break;
  if(c==='"'){let j=i+1,v='';while(j<s.length&&s[j]!=='"'){v+=s[j];j++}if(j>=s.length)throw new SBErr('Хашилт (") хаагдаагүй байна',ln);t.push({k:'s',v});i=j+1;continue}
  if(/[0-9]/.test(c)||(c==='.'&&/[0-9]/.test(s[i+1]||''))){let j=i;while(j<s.length&&/[0-9.]/.test(s[j]))j++;t.push({k:'n',v:parseFloat(s.slice(i,j))});i=j;continue}
  if(/[A-Za-z_Ѐ-ӿ]/.test(c)){let j=i;while(j<s.length&&/[A-Za-z0-9_Ѐ-ӿ]/.test(s[j]))j++;const w=s.slice(i,j);t.push({k:KW.has(w.toLowerCase())?'kw':'id',v:w,lc:w.toLowerCase()});i=j;continue}
  const two=s.slice(i,i+2);if(['<>','<=','>='].includes(two)){t.push({k:'op',v:two});i+=2;continue}
  if('=<>+-*/()[],.:'.includes(c)){t.push({k:'op',v:c});i++;continue}
  throw new SBErr('Танигдахгүй тэмдэгт: '+c,ln)}
 return t}
/* ---------- Илэрхийлэл (Pratt) → JS ---------- */
function cexpr(T,ln){let p=0;const pk=()=>T[p],nx=()=>T[p++];
 const isOp=v=>pk()&&pk().k==='op'&&pk().v===v,isKw=v=>pk()&&pk().k==='kw'&&pk().lc===v;
 const need=v=>{if(!isOp(v))throw new SBErr(`«${v}» дутуу байна`,ln);nx()};
 const BP={or:1,and:2,'=':3,'<>':3,'<':3,'>':3,'<=':3,'>=':3,'+':4,'-':4,'*':5,'/':5};
 const FN={or:'$or',and:'$and','=':'$eq','<>':'$ne','<':'$lt','>':'$gt','<=':'$le','>=':'$ge','+':'$add','-':'$sub','*':'$mul','/':'$div'};
 function prim(){const t=nx();if(!t)throw new SBErr('Илэрхийлэл дутуу байна',ln);
  if(t.k==='n')return String(t.v);if(t.k==='s')return JSON.stringify(t.v);
  if(t.k==='op'&&t.v==='('){const e=ex(0);need(')');return e}
  if(t.k==='op'&&t.v==='-')return `$neg(${ex(6)})`;
  if(t.k==='id'){if(isOp('.')){nx();const m=nx();if(!m||m.k!=='id'&&m.k!=='kw')throw new SBErr('Объектын нэрийн дараа команд бичнэ',ln);
    if(isOp('(')){nx();const a=[];if(!isOp(')')){a.push(ex(0));while(isOp(',')){nx();a.push(ex(0))}}need(')');return `(await $L.call(${JSON.stringify(t.v)},${JSON.stringify(m.v)},[${a.join(',')}],${ln}))`}
    return `(await $L.get(${JSON.stringify(t.v)},${JSON.stringify(m.v)},${ln}))`}
   let e=`$v(${JSON.stringify(t.lc)})`;const ix=[];while(isOp('[')){nx();ix.push(ex(0));need(']')}
   if(isOp('('))throw new SBErr(`Дэд программ «${t.v}»-г илэрхийлэл дотор дуудах боломжгүй`,ln);
   return ix.length?`$idx(${e},[${ix.join(',')}])`:e}
  throw new SBErr('Буруу бичиглэл: '+(t.v??''),ln)}
 function ex(min){let l=prim();for(;;){const t=pk();if(!t)break;let op=null;if(t.k==='op'&&BP[t.v])op=t.v;else if(t.k==='kw'&&(t.lc==='and'||t.lc==='or'))op=t.lc;if(!op||BP[op]<=min&&!(BP[op]===min&&false))break;if(BP[op]<=min)break;nx();const r=ex(BP[op]);l=`${FN[op]}(${l},${r})`}return l}
 const out=ex(0);return {js:out,rest:T.slice(p)}}
/* ---------- Хөрвүүлэгч: мөрүүдийг шугаман заавар болгоно ---------- */
function compile(src){const lines=src.replace(/\r/g,'').split('\n');const I=[],labels={},subs={},blocks=[],subCode=[];let cur=I,inSub=null;
 const AF=Object.getPrototypeOf(async function(){}).constructor;
 const fn=(js,ln)=>{try{return new AF('$L','$v','$idx',...Object.keys(OPS),'return '+js)}catch(e){throw new SBErr('Илэрхийлэл буруу',ln)}};
 const E=(T,ln,stop)=>{const {js,rest}=cexpr(T,ln);if(stop!==undefined){if(!rest.length||rest[0].lc!==stop)throw new SBErr(`«${stop[0].toUpperCase()+stop.slice(1)}» гэж бичих ёстой`,ln)}else if(rest.length)throw new SBErr('Мөрийн төгсгөлд илүү зүйл байна: '+rest.map(x=>x.v).join(' '),ln);return fn(js,ln)};
 lines.forEach((raw,k)=>{const ln=k+1;const T=lex(raw,ln);if(!T.length)return;const h=T[0];
  if(h.k==='id'&&T[1]&&T[1].v===':'&&T.length===2){labels[h.lc]={at:cur.length,code:cur===I?'m':inSub};cur.push({k:'nop',ln});return}
  if(h.k==='kw'){const w=h.lc;
   if(w==='if'){const f=E(T.slice(1),ln,'then');const j={k:'jz',f,to:-1,ln};cur.push(j);blocks.push({t:'if',jz:j,ends:[],ln});return}
   if(w==='elseif'){const b=blocks[blocks.length-1];if(!b||b.t!=='if')throw new SBErr('«ElseIf» нь «If»-гүй байна',ln);const jm={k:'jmp',to:-1,ln};cur.push(jm);b.ends.push(jm);if(b.jz)b.jz.to=cur.length;const f=E(T.slice(1),ln,'then');const j={k:'jz',f,to:-1,ln};cur.push(j);b.jz=j;return}
   if(w==='else'){const b=blocks[blocks.length-1];if(!b||b.t!=='if')throw new SBErr('«Else» нь «If»-гүй байна',ln);const jm={k:'jmp',to:-1,ln};cur.push(jm);b.ends.push(jm);if(b.jz)b.jz.to=cur.length;b.jz=null;return}
   if(w==='endif'){const b=blocks.pop();if(!b||b.t!=='if')throw new SBErr('«EndIf» нь «If»-гүй байна',ln);if(b.jz)b.jz.to=cur.length;b.ends.forEach(e=>e.to=cur.length);return}
   if(w==='for'){const v=T[1];if(!v||v.k!=='id'||!T[2]||T[2].v!=='=')throw new SBErr('For i = 1 To 10 гэж бичнэ',ln);
    const rest=T.slice(3);const a=cexpr(rest,ln);if(!a.rest.length||a.rest[0].lc!=='to')throw new SBErr('«To» дутуу байна',ln);
    const b=cexpr(a.rest.slice(1),ln);let st=null;if(b.rest.length){if(b.rest[0].lc!=='step')throw new SBErr('«Step» гэж бичих ёстой',ln);const c=cexpr(b.rest.slice(1),ln);if(c.rest.length)throw new SBErr('Мөрийн төгсгөлд илүү зүйл байна',ln);st=fn(c.js,ln)}
    const id='$f'+cur.length;cur.push({k:'forinit',v:v.lc,id,f1:fn(a.js,ln),f2:fn(b.js,ln),fs:st,ln});const test={k:'fortest',v:v.lc,id,to:-1,ln};const at=cur.length;cur.push(test);blocks.push({t:'for',test,at,v:v.lc,id,ln});return}
   if(w==='endfor'){const b=blocks.pop();if(!b||b.t!=='for')throw new SBErr('«EndFor» нь «For»-гүй байна',ln);cur.push({k:'forstep',v:b.v,id:b.id,ln});cur.push({k:'jmp',to:b.at,ln});b.test.to=cur.length;return}
   if(w==='while'){const at=cur.length;const j={k:'jz',f:E(T.slice(1),ln),to:-1,ln};cur.push(j);blocks.push({t:'while',at,j,ln});return}
   if(w==='endwhile'){const b=blocks.pop();if(!b||b.t!=='while')throw new SBErr('«EndWhile» нь «While»-гүй байна',ln);cur.push({k:'jmp',to:b.at,ln});b.j.to=cur.length;return}
   if(w==='sub'){if(inSub)throw new SBErr('Дэд программ дотор дэд программ тодорхойлж болохгүй',ln);const n=T[1];if(!n||n.k!=='id')throw new SBErr('Sub-ийн нэр дутуу',ln);inSub=n.lc;const code=[];subs[n.lc]={code,ln};cur=code;blocks.push({t:'sub',ln});return}
   if(w==='endsub'){const b=blocks.pop();if(!b||b.t!=='sub')throw new SBErr('«EndSub» нь «Sub»-гүй байна',ln);cur.push({k:'ret',ln});cur=I;inSub=null;return}
   if(w==='goto'){const n=T[1];if(!n)throw new SBErr('Goto-гийн дараа шошго бичнэ',ln);cur.push({k:'goto',l:n.lc,ln});return}
   throw new SBErr(`«${h.v}» энд байх ёсгүй`,ln)}
  // дэд программ дуудах: Name()
  if(h.k==='id'&&T[1]&&T[1].v==='('&&T[2]&&T[2].v===')'&&T.length===3){cur.push({k:'call',s:h.lc,name:h.v,ln});return}
  // утга олгох эсвэл объектын команд
  let eq=-1,depth=0;for(let q=0;q<T.length;q++){const x=T[q];if(x.v==='('||x.v==='[')depth++;else if(x.v===')'||x.v===']')depth--;else if(x.v==='='&&depth===0){eq=q;break}}
  if(eq>0){const L=T.slice(0,eq),R=T.slice(eq+1);
   if(L.length===3&&L[1].v==='.'){const ev=R.length===1&&R[0].k==='id'&&EVENTS.has((L[2].v).toLowerCase());cur.push({k:'setp',o:L[0].v,p:L[2].v,ev:ev?R[0].lc:null,f:ev?null:E(R,ln),ln});return}
   if(L[0].k!=='id')throw new SBErr('Утга олгох хувьсагчийн нэр буруу',ln);
   const ix=[];let q=1;while(q<L.length){if(L[q].v!=='[')throw new SBErr('Хувьсагчийн нэр буруу',ln);let d=0,s0=q+1,e0=q;for(;e0<L.length;e0++){if(L[e0].v==='[')d++;else if(L[e0].v===']'){d--;if(!d)break}}ix.push(fn(cexpr(L.slice(s0,e0),ln).js,ln));q=e0+1}
   cur.push({k:'set',v:L[0].lc,ix,f:E(R,ln),ln});return}
  if(h.k==='id'&&T[1]&&T[1].v==='.'){cur.push({k:'expr',f:E(T,ln),ln});return}
  throw new SBErr(`Ойлгомжгүй мөр: ${raw.trim()}`,ln)});
 if(blocks.length){const b=blocks[blocks.length-1];throw new SBErr({if:'«EndIf»',for:'«EndFor»',while:'«EndWhile»',sub:'«EndSub»'}[b.t]+' дутуу байна',b.ln)}
 I.push({k:'end'});
 // goto шошгыг шийдэх
 const fixG=(code,where)=>code.forEach(x=>{if(x.k==='goto'){const L=labels[x.l];if(!L||L.code!==where)throw new SBErr(`«${x.l}» шошго олдсонгүй`,x.ln);x.k='jmp';x.to=L.at}if(x.k==='call'&&!subs[x.s])throw new SBErr(`«${x.name}» дэд программ тодорхойлогдоогүй`,x.ln)});
 fixG(I,'m');Object.entries(subs).forEach(([n,s])=>fixG(s.code,n));
 return {I,subs}}
/* ---------- Утгын үйлдлүүд ---------- */
const isNum=x=>typeof x==='number'||(typeof x==='string'&&x.trim()!==''&&!isNaN(+x));
const num=x=>typeof x==='number'?x:isNum(x)?+x:0;
const tf=b=>b?'True':'False',truth=x=>x===true||String(x).toLowerCase()==='true';
const fmt=x=>{if(x&&typeof x==='object')return Object.entries(x).map(([k,v])=>`${k}=${fmt(v)};`).join('');if(typeof x==='number'){if(!isFinite(x))return String(x);const r=Math.round(x*1e10)/1e10;return String(r)}return String(x??'')};
const clone=x=>x&&typeof x==='object'?JSON.parse(JSON.stringify(x)):x;
const cmp=(a,b)=>isNum(a)&&isNum(b)?num(a)-num(b):fmt(a).localeCompare(fmt(b));
const OPS={$add:(a,b)=>isNum(a)&&isNum(b)?num(a)+num(b):fmt(a)+fmt(b),$sub:(a,b)=>num(a)-num(b),$mul:(a,b)=>num(a)*num(b),$div:(a,b)=>{const d=num(b);if(d===0)throw new SBErr('Тэгд хуваах боломжгүй');return num(a)/d},$neg:a=>-num(a),
 $eq:(a,b)=>tf(isNum(a)&&isNum(b)?num(a)===num(b):fmt(a)===fmt(b)),$ne:(a,b)=>tf(!(isNum(a)&&isNum(b)?num(a)===num(b):fmt(a)===fmt(b))),$lt:(a,b)=>tf(cmp(a,b)<0),$gt:(a,b)=>tf(cmp(a,b)>0),$le:(a,b)=>tf(cmp(a,b)<=0),$ge:(a,b)=>tf(cmp(a,b)>=0),
 $and:(a,b)=>tf(truth(a)&&truth(b)),$or:(a,b)=>tf(truth(a)||truth(b))};
const EVENTS=new Set(['buttonclicked','textchanged','mousedown','mouseup','mousemove','keydown','keyup','tick']);
const COLORS=['Red','Orange','Gold','Green','Teal','Blue','Purple','Pink','Brown','Navy','Crimson','SeaGreen','DodgerBlue','DarkOrange','Magenta','SlateBlue'];
/* ---------- Орчин (сангууд) ---------- */
function Runtime(ui,opt){const R=this;R.vars={};R.stop=false;R.log=[];R.out=[];R.inq=(opt.input||[]).slice();R.headless=!!opt.headless;R.handlers={};R.steps=0;R.subs={};R.busy=0;
 const W=640,H=480;R.W=W;R.H=H;
 const g={bg:'#ffffff',brush:'SlateBlue',pen:'Black',pw:2,font:12,fname:'Segoe UI, Arial',bold:true,title:'Small Basic',shown:false,mx:0,my:0,lastKey:''};
 const tu={x:W/2,y:H/2,a:0,pen:true,speed:5,shown:false,color:'#1d2433'};
 const shapes=[];let nShape=0,nCtl=0;const ctls={};let lastBtn='',lastTb='';
 const tm={iv:0,id:null};const t0=Date.now();
 const sleep=ms=>R.headless?Promise.resolve():new Promise(r=>setTimeout(r,ms));
 R.sleep=sleep;
 const cx=ui.ctx,ox=ui.octx;
 const showG=()=>{if(!g.shown){g.shown=true;ui.showGraphics&&ui.showGraphics()}};
 const redraw=()=>{if(!ox)return;ox.clearRect(0,0,W,H);
  shapes.forEach(s=>{if(s.hid)return;ox.save();ox.globalAlpha=s.op/100;ox.translate(s.x+s.w/2,s.y+s.h/2);ox.rotate(s.rot*Math.PI/180);ox.scale(s.zx,s.zy);ox.translate(-s.w/2,-s.h/2);
   ox.fillStyle=s.brush;ox.strokeStyle=s.pen;ox.lineWidth=s.pw;
   if(s.t==='rect'){ox.fillRect(0,0,s.w,s.h);if(s.pw)ox.strokeRect(0,0,s.w,s.h)}
   else if(s.t==='ell'){ox.beginPath();ox.ellipse(s.w/2,s.h/2,Math.abs(s.w/2),Math.abs(s.h/2),0,0,7);ox.fill();if(s.pw)ox.stroke()}
   else if(s.t==='tri'){ox.beginPath();ox.moveTo(s.p[0]-s.x0,s.p[1]-s.y0);ox.lineTo(s.p[2]-s.x0,s.p[3]-s.y0);ox.lineTo(s.p[4]-s.x0,s.p[5]-s.y0);ox.closePath();ox.fill();if(s.pw)ox.stroke()}
   else if(s.t==='line'){ox.beginPath();ox.moveTo(s.p[0]-s.x0,s.p[1]-s.y0);ox.lineTo(s.p[2]-s.x0,s.p[3]-s.y0);ox.stroke()}
   else if(s.t==='text'){ox.font=`${g.bold?'bold ':''}${s.fs}px ${g.fname}`;ox.textBaseline='top';ox.fillText(s.txt,0,0)}
   ox.restore()});
  if(tu.shown){ox.save();ox.translate(tu.x,tu.y);ox.rotate(tu.a*Math.PI/180);ox.fillStyle='#2f8a4a';ox.strokeStyle='#14361f';ox.lineWidth=1.5;
   ox.beginPath();ox.ellipse(0,0,9,11,0,0,7);ox.fill();ox.stroke();ox.beginPath();ox.arc(0,-13,4.5,0,7);ox.fill();ox.stroke();
   [[-9,-6],[9,-6],[-9,7],[9,7]].forEach(([a,b])=>{ox.beginPath();ox.arc(a,b,3,0,7);ox.fill()});ox.restore()}};
 R.redraw=redraw;
 const line=(x1,y1,x2,y2,col,w)=>{if(!cx)return;cx.strokeStyle=col;cx.lineWidth=w;cx.lineCap='round';cx.beginPath();cx.moveTo(x1,y1);cx.lineTo(x2,y2);cx.stroke()};
 const S=a=>fmt(a),N=a=>num(a);
 const out=(s,nl)=>{if(nl){R.out.push((R.cur||'')+s);R.cur=''}else R.cur=(R.cur||'')+s;ui.print&&ui.print(s,nl)};
 const read=async(numeric)=>{if(R.headless){if(!R.inq.length)throw new SBErr('Программ оролт хүлээж байна, гэвч шалгалтын оролт дууссан');const v=R.inq.shift();out(String(v),true);return numeric?num(v):String(v)}
  const v=await ui.read(numeric);out(String(v),true);return numeric?num(v):v};
 const turtleMove=async d=>{showG();tu.shown=true;const rad=tu.a*Math.PI/180,dx=Math.sin(rad)*d,dy=-Math.cos(rad)*d;R.log.push('tmove');
  const steps=R.headless||tu.speed>=10?1:Math.max(1,Math.ceil(Math.abs(d)/(tu.speed*2.2)));let px=tu.x,py=tu.y;
  for(let k=1;k<=steps;k++){if(R.stop)return;const nx=tu.x+dx*k/steps,ny=tu.y+dy*k/steps;if(tu.pen)line(px,py,nx,ny,tu.color,2);px=nx;py=ny;if(steps>1){const sx=tu.x,sy=tu.y;tu.x=nx;tu.y=ny;redraw();tu.x=sx;tu.y=sy;await sleep(16)}}
  tu.x+=dx;tu.y+=dy;redraw()};
 const turtleTurn=async a=>{tu.shown=true;showG();R.log.push('tturn');const steps=R.headless||tu.speed>=10?1:Math.max(1,Math.ceil(Math.abs(a)/(tu.speed*4)));const a0=tu.a;for(let k=1;k<=steps;k++){tu.a=a0+a*k/steps;redraw();if(steps>1)await sleep(16)}tu.a=a0+a};
 const addShape=(t,o)=>{showG();const id=(t==='text'?'Text':t==='rect'?'Rectangle':t==='ell'?'Ellipse':t==='tri'?'Triangle':'Line')+(++nShape);shapes.push(Object.assign({id,t,x:0,y:0,w:0,h:0,brush:g.brush,pen:g.pen,pw:g.pw,op:100,rot:0,zx:1,zy:1,hid:false},o));R.log.push('shape:'+t);redraw();return id};
 const shp=n=>shapes.find(s=>s.id.toLowerCase()===String(n).toLowerCase());
 const L={
  textwindow:{writeline:a=>{out(S(a[0]),true);R.log.push('write')},write:a=>{out(S(a[0]),false);R.log.push('write')},read:()=>read(false),readnumber:()=>read(true),clear:()=>{ui.cls&&ui.cls();R.out=[]},pause:()=>sleep(10),pauseifvisible:()=>0,show:()=>0,hide:()=>0,
   _p:{foregroundcolor:[()=>'',v=>ui.fg&&ui.fg(S(v))],backgroundcolor:[()=>'',()=>0],title:[()=>'',()=>0],cursorleft:[()=>0,()=>0],cursortop:[()=>0,()=>0],left:[()=>0,()=>0],top:[()=>0,()=>0]}},
  graphicswindow:{show:()=>showG(),hide:()=>0,clear:()=>{showG();cx&&cx.clearRect(0,0,W,H);shapes.length=0;redraw()},
   drawline:a=>{showG();line(N(a[0]),N(a[1]),N(a[2]),N(a[3]),g.pen,g.pw);R.log.push('line')},
   drawrectangle:a=>{showG();cx.strokeStyle=g.pen;cx.lineWidth=g.pw;cx.strokeRect(N(a[0]),N(a[1]),N(a[2]),N(a[3]));R.log.push('rect')},
   fillrectangle:a=>{showG();cx.fillStyle=g.brush;cx.fillRect(N(a[0]),N(a[1]),N(a[2]),N(a[3]));R.log.push('rect')},
   drawellipse:a=>{showG();cx.strokeStyle=g.pen;cx.lineWidth=g.pw;cx.beginPath();cx.ellipse(N(a[0])+N(a[2])/2,N(a[1])+N(a[3])/2,Math.abs(N(a[2])/2),Math.abs(N(a[3])/2),0,0,7);cx.stroke();R.log.push('ellipse')},
   fillellipse:a=>{showG();cx.fillStyle=g.brush;cx.beginPath();cx.ellipse(N(a[0])+N(a[2])/2,N(a[1])+N(a[3])/2,Math.abs(N(a[2])/2),Math.abs(N(a[3])/2),0,0,7);cx.fill();R.log.push('ellipse')},
   drawtriangle:a=>{showG();cx.strokeStyle=g.pen;cx.lineWidth=g.pw;cx.beginPath();cx.moveTo(N(a[0]),N(a[1]));cx.lineTo(N(a[2]),N(a[3]));cx.lineTo(N(a[4]),N(a[5]));cx.closePath();cx.stroke();R.log.push('triangle')},
   filltriangle:a=>{showG();cx.fillStyle=g.brush;cx.beginPath();cx.moveTo(N(a[0]),N(a[1]));cx.lineTo(N(a[2]),N(a[3]));cx.lineTo(N(a[4]),N(a[5]));cx.closePath();cx.fill();R.log.push('triangle')},
   drawtext:a=>{showG();cx.fillStyle=g.brush;cx.font=`${g.bold?'bold ':''}${g.font}px ${g.fname}`;cx.textBaseline='top';cx.fillText(S(a[2]),N(a[0]),N(a[1]));R.log.push('text')},
   drawboundtext:a=>{showG();cx.fillStyle=g.brush;cx.font=`${g.bold?'bold ':''}${g.font}px ${g.fname}`;cx.textBaseline='top';cx.fillText(S(a[3]),N(a[0]),N(a[1]),N(a[2]));R.log.push('text')},
   setpixel:a=>{showG();cx.fillStyle=S(a[2]);cx.fillRect(N(a[0]),N(a[1]),1,1);R.log.push('pixel')},
   getpixel:()=> '#000000',
   getrandomcolor:()=>'#'+[0,0,0].map(()=>(60+Math.random()*180|0).toString(16).padStart(2,'0')).join(''),
   getcolorfromrgb:a=>'#'+a.slice(0,3).map(v=>Math.max(0,Math.min(255,N(v)|0)).toString(16).padStart(2,'0')).join(''),
   showmessage:a=>{if(R.headless)return;return ui.msg?ui.msg(S(a[0]),S(a[1])):0},
   _p:{brushcolor:[()=>g.brush,v=>g.brush=S(v)],pencolor:[()=>g.pen,v=>g.pen=S(v)],penwidth:[()=>g.pw,v=>g.pw=N(v)],backgroundcolor:[()=>g.bg,v=>{g.bg=S(v);showG();ui.bg&&ui.bg(g.bg)}],
    fontsize:[()=>g.font,v=>g.font=N(v)],fontname:[()=>g.fname,v=>g.fname=S(v)],fontbold:[()=>tf(g.bold),v=>g.bold=truth(v)],fontitalic:[()=>'False',()=>0],title:[()=>g.title,v=>{g.title=S(v);ui.title&&ui.title(g.title)}],
    width:[()=>W,()=>0],height:[()=>H,()=>0],left:[()=>0,()=>0],top:[()=>0,()=>0],canresize:[()=>'False',()=>0],mousex:[()=>g.mx,()=>0],mousey:[()=>g.my,()=>0],lastkey:[()=>g.lastKey,()=>0],lasttext:[()=>g.lastKey,()=>0]}},
  turtle:{move:a=>turtleMove(N(a[0])),turn:a=>turtleTurn(N(a[0])),turnright:()=>turtleTurn(90),turnleft:()=>turtleTurn(-90),penup:()=>{tu.pen=false},pendown:()=>{tu.pen=true},show:()=>{tu.shown=true;showG();redraw()},hide:()=>{tu.shown=false;redraw()},
   moveto:async a=>{const x=N(a[0]),y=N(a[1]),dx=x-tu.x,dy=y-tu.y,d=Math.hypot(dx,dy);if(d<1e-9)return;tu.a=Math.atan2(dx,-dy)*180/Math.PI;await turtleMove(d)},
   _p:{speed:[()=>tu.speed,v=>tu.speed=Math.max(1,Math.min(10,N(v)))],angle:[()=>tu.a,v=>{tu.a=N(v);redraw()}],x:[()=>tu.x,v=>{tu.x=N(v);redraw()}],y:[()=>tu.y,v=>{tu.y=N(v);redraw()}]}},
  shapes:{addrectangle:a=>addShape('rect',{w:N(a[0]),h:N(a[1])}),addellipse:a=>addShape('ell',{w:N(a[0]),h:N(a[1])}),
   addtriangle:a=>{const p=a.slice(0,6).map(N),xs=[p[0],p[2],p[4]],ys=[p[1],p[3],p[5]],x0=Math.min(...xs),y0=Math.min(...ys);return addShape('tri',{p,x0,y0,x:x0,y:y0,w:Math.max(...xs)-x0,h:Math.max(...ys)-y0})},
   addline:a=>{const p=a.slice(0,4).map(N),x0=Math.min(p[0],p[2]),y0=Math.min(p[1],p[3]);return addShape('line',{p,x0,y0,x:x0,y:y0,w:Math.abs(p[2]-p[0]),h:Math.abs(p[3]-p[1])})},
   addtext:a=>addShape('text',{txt:S(a[0]),fs:g.font,w:S(a[0]).length*g.font*.6,h:g.font}),addimage:a=>addShape('rect',{w:40,h:40}),
   move:a=>{const s=shp(a[0]);if(s){s.x=N(a[1]);s.y=N(a[2]);redraw()}},
   animate:async a=>{const s=shp(a[0]);if(!s)return;const x0=s.x,y0=s.y,x1=N(a[1]),y1=N(a[2]),ms=N(a[3]);s.x=x1;s.y=y1;if(R.headless){redraw();return}s.x=x0;s.y=y0;const st=performance.now();
    const fr=()=>{if(R.stop)return;const k=Math.min(1,(performance.now()-st)/Math.max(1,ms));s.x=x0+(x1-x0)*k;s.y=y0+(y1-y0)*k;redraw();if(k<1)requestAnimationFrame(fr)};requestAnimationFrame(fr)},
   rotate:a=>{const s=shp(a[0]);if(s){s.rot=N(a[1]);redraw()}},zoom:a=>{const s=shp(a[0]);if(s){s.zx=N(a[1]);s.zy=N(a[2]);redraw()}},setopacity:a=>{const s=shp(a[0]);if(s){s.op=N(a[1]);redraw()}},getopacity:a=>shp(a[0])?.op??0,
   hideshape:a=>{const s=shp(a[0]);if(s){s.hid=true;redraw()}},showshape:a=>{const s=shp(a[0]);if(s){s.hid=false;redraw()}},remove:a=>{const i=shapes.findIndex(s=>s.id.toLowerCase()===S(a[0]).toLowerCase());if(i>=0){shapes.splice(i,1);redraw()}},
   getleft:a=>shp(a[0])?.x??0,gettop:a=>shp(a[0])?.y??0,settext:a=>{const s=shp(a[0]);if(s){s.txt=S(a[1]);redraw()}}},
  controls:{addbutton:a=>{showG();const id='Button'+(++nCtl);ctls[id]={t:'b'};ui.addCtl&&ui.addCtl(id,'b',S(a[0]),N(a[1]),N(a[2]),()=>{lastBtn=id;fire('buttonclicked')});R.log.push('button');return id},
   addtextbox:a=>{showG();const id='TextBox'+(++nCtl);ctls[id]={t:'t',v:''};ui.addCtl&&ui.addCtl(id,'t','',N(a[0]),N(a[1]),v=>{ctls[id].v=v;lastTb=id;fire('textchanged')});R.log.push('textbox');return id},
   addmultilinetextbox:a=>L.controls.addtextbox(a),
   gettextboxtext:a=>ui.getCtl?ui.getCtl(S(a[0])):(ctls[S(a[0])]?.v||''),settextboxtext:a=>{ui.setCtl&&ui.setCtl(S(a[0]),S(a[1]))},getbuttoncaption:a=>ui.getCtl?ui.getCtl(S(a[0])):'',setbuttoncaption:a=>{ui.setCtl&&ui.setCtl(S(a[0]),S(a[1]))},
   remove:a=>{ui.delCtl&&ui.delCtl(S(a[0]))},hidecontrol:a=>{ui.showCtl&&ui.showCtl(S(a[0]),false)},showcontrol:a=>{ui.showCtl&&ui.showCtl(S(a[0]),true)},move:a=>{ui.moveCtl&&ui.moveCtl(S(a[0]),N(a[1]),N(a[2]))},setsize:()=>0,
   _p:{lastclickedbutton:[()=>lastBtn,()=>0],lasttypedtextbox:[()=>lastTb,()=>0]}},
  math:{abs:a=>Math.abs(N(a[0])),round:a=>Math.round(N(a[0])),floor:a=>Math.floor(N(a[0])),ceiling:a=>Math.ceil(N(a[0])),squareroot:a=>Math.sqrt(N(a[0])),power:a=>Math.pow(N(a[0]),N(a[1])),
   remainder:a=>{const b=N(a[1]);if(b===0)throw new SBErr('Тэгд хуваах боломжгүй');return N(a[0])%b},getrandomnumber:a=>1+Math.floor(Math.random()*Math.max(1,N(a[0]))),max:a=>Math.max(N(a[0]),N(a[1])),min:a=>Math.min(N(a[0]),N(a[1])),
   sin:a=>Math.sin(N(a[0])),cos:a=>Math.cos(N(a[0])),tan:a=>Math.tan(N(a[0])),arcsin:a=>Math.asin(N(a[0])),arccos:a=>Math.acos(N(a[0])),arctan:a=>Math.atan(N(a[0])),getdegrees:a=>N(a[0])*180/Math.PI,getradians:a=>N(a[0])*Math.PI/180,
   log:a=>Math.log10(N(a[0])),naturallog:a=>Math.log(N(a[0])),_p:{pi:[()=>Math.PI,()=>0]}},
  text:{getlength:a=>S(a[0]).length,getsubtext:a=>S(a[0]).substr(N(a[1])-1,N(a[2])),getsubtexttoend:a=>S(a[0]).slice(N(a[1])-1),append:a=>S(a[0])+S(a[1]),issubtext:a=>tf(S(a[0]).includes(S(a[1]))),
   startswith:a=>tf(S(a[0]).startsWith(S(a[1]))),endswith:a=>tf(S(a[0]).endsWith(S(a[1]))),getindexof:a=>S(a[0]).indexOf(S(a[1]))+1,converttouppercase:a=>S(a[0]).toUpperCase(),converttolowercase:a=>S(a[0]).toLowerCase(),
   getcharacter:a=>String.fromCharCode(N(a[0])),getcharactercode:a=>S(a[0]).charCodeAt(0)||0},
  array:{getitemcount:a=>a[0]&&typeof a[0]==='object'?Object.keys(a[0]).length:0,containsindex:a=>tf(!!(a[0]&&typeof a[0]==='object'&&S(a[1]) in a[0])),containsvalue:a=>tf(!!(a[0]&&typeof a[0]==='object'&&Object.values(a[0]).some(v=>fmt(v)===S(a[1])))),
   getallindices:a=>{const o={};if(a[0]&&typeof a[0]==='object')Object.keys(a[0]).forEach((k,i)=>o[i+1]=isNum(k)?+k:k);return o}},
  clock:{_p:{hour:[()=>new Date().getHours(),()=>0],minute:[()=>new Date().getMinutes(),()=>0],second:[()=>new Date().getSeconds(),()=>0],year:[()=>new Date().getFullYear(),()=>0],month:[()=>new Date().getMonth()+1,()=>0],day:[()=>new Date().getDate(),()=>0],
   weekday:[()=>['Ням','Даваа','Мягмар','Лхагва','Пүрэв','Баасан','Бямба'][new Date().getDay()],()=>0],date:[()=>new Date().toLocaleDateString(),()=>0],time:[()=>new Date().toLocaleTimeString(),()=>0],elapsedmilliseconds:[()=>Date.now()-t0,()=>0]}},
  program:{delay:a=>sleep(Math.max(0,N(a[0]))),end:()=>{R.stop=true;R.ended=true},_p:{argumentcount:[()=>0,()=>0],directory:[()=>'',()=>0]}},
  sound:{playclick:()=>beep(900,.05),playchime:()=>beep(1320,.4),playbellring:()=>beep(660,.7),playchimes:()=>beep(1320,.4),playbellringandwait:()=>beep(660,.7,1),playchimeandwait:()=>beep(1320,.4,1),playmusic:a=>music(S(a[0])),stop:()=>0,play:()=>0,pause:()=>0},
  timer:{pause:()=>{clearInterval(tm.id);tm.id=null},resume:()=>startT(),_p:{interval:[()=>tm.iv,v=>{tm.iv=N(v);startT()}]}},
  mouse:{_p:{mousex:[()=>g.mx,()=>0],mousey:[()=>g.my,()=>0]},hidecursor:()=>0,showcursor:()=>0}};
 const startT=()=>{clearInterval(tm.id);if(R.headless||!tm.iv)return;tm.id=setInterval(()=>{if(R.stop){clearInterval(tm.id);return}fire('tick')},Math.max(10,tm.iv))};
 R.cleanup=()=>{clearInterval(tm.id)};
 let actx=null;const ac=()=>{try{return actx||(actx=new (window.AudioContext||window.webkitAudioContext)())}catch(e){return null}};
 const beep=(f,d,wait)=>{R.log.push('sound');if(R.headless)return;const c=ac();if(!c)return;const o=c.createOscillator(),gg=c.createGain();o.frequency.value=f;o.type='triangle';gg.gain.setValueAtTime(.25,c.currentTime);gg.gain.exponentialRampToValueAtTime(.001,c.currentTime+d);o.connect(gg).connect(c.destination);o.start();o.stop(c.currentTime+d);if(wait)return sleep(d*1000)};
 const music=async s=>{R.log.push('sound');if(R.headless)return;const NT={c:0,d:2,e:4,f:5,g:7,a:9,b:11};let oct=4,len=4;const re=/(O\d)|([A-Ga-gPp])([#+-]?)(\d*)/g;let m;
  while((m=re.exec(s))&&!R.stop){if(m[1]){oct=+m[1].slice(1);continue}const l=m[4]?+m[4]:len,dur=1.6/l;if(m[2].toLowerCase()!=='p'){let n=NT[m[2].toLowerCase()]+(m[3]==='#'||m[3]==='+'?1:m[3]==='-'?-1:0);const f=440*Math.pow(2,(n-9)/12+(oct-4));beep(f,dur*.9)}await sleep(dur*1000)}};
 const fire=ev=>{const h=R.handlers[ev];if(h&&!R.stop)R.exec(R.subs[h].code,h).catch(e=>{ui.err&&ui.err(e)})};
 R.fire=fire;R.g=g;R.tu=tu;
 R.mouse=(x,y,type)=>{g.mx=x;g.my=y;fire(type)};R.key=(k)=>{g.lastKey=k;fire('keydown')};
 R.$L={call:async(o,m,a,ln)=>{const O=L[o.toLowerCase()];if(!O)throw new SBErr(`«${o}» гэсэн объект алга`,ln);const f=O[m.toLowerCase()];if(typeof f!=='function')throw new SBErr(`«${o}.${m}» гэсэн команд алга`,ln);const r=await f(a.map(clone));return r===undefined?'':r},
  get:async(o,p,ln)=>{const O=L[o.toLowerCase()];if(!O)throw new SBErr(`«${o}» гэсэн объект алга`,ln);const q=O._p&&O._p[p.toLowerCase()];if(!q)throw new SBErr(`«${o}.${p}» гэсэн шинж чанар алга`,ln);return q[0]()},
  set:(o,p,v,ln)=>{const O=L[o.toLowerCase()];if(!O)throw new SBErr(`«${o}» гэсэн объект алга`,ln);const q=O._p&&O._p[p.toLowerCase()];if(!q)throw new SBErr(`«${o}.${p}» гэсэн шинж чанар алга`,ln);q[1](v)}};
}
/* ---------- Гүйцэтгэгч ---------- */
Runtime.prototype.run=async function(prog){const R=this;R.subs=prog.subs;R.prog=prog;
 const $v=n=>R.vars[n]??'';const $idx=(a,ix)=>{let c=a;for(const k of ix){if(!c||typeof c!=='object')return '';c=c[fmt(k)];if(c===undefined)return ''}return c};
 const args=[R.$L,$v,$idx,...Object.values(OPS)];
 R.exec=async(code,name)=>{R.busy++;let pc=0;const st=[];let C=code;
  try{for(;;){if(R.stop)return;const x=C[pc];if(!x)break;R.steps++;
   if(R.steps%400===0){await new Promise(r=>setTimeout(r,0));if(R.stop)return}
   if(R.headless&&R.steps>300000)throw new SBErr('Программ хэт удаан ажиллаж байна (төгсгөлгүй давталт байж магадгүй)',x.ln);
   switch(x.k){
    case 'nop':pc++;break;
    case 'expr':await x.f(...args);pc++;break;
    case 'set':{let v=clone(await x.f(...args));if(!x.ix.length)R.vars[x.v]=v;else{const ks=[];for(const f of x.ix)ks.push(fmt(await f(...args)));if(!R.vars[x.v]||typeof R.vars[x.v]!=='object')R.vars[x.v]={};let c=R.vars[x.v];ks.slice(0,-1).forEach(k=>{if(!c[k]||typeof c[k]!=='object')c[k]={};c=c[k]});if(v===''&&typeof v==='string')delete c[ks[ks.length-1]];else c[ks[ks.length-1]]=v}pc++;break}
    case 'setp':if(x.ev){if(!R.subs[x.ev])throw new SBErr(`«${x.ev}» дэд программ тодорхойлогдоогүй`,x.ln);R.handlers[x.p.toLowerCase()]=x.ev}else R.$L.set(x.o,x.p,await x.f(...args),x.ln);pc++;break;
    case 'jz':pc=truth(await x.f(...args))?pc+1:x.to;break;
    case 'jmp':pc=x.to;break;
    case 'forinit':{const a=num(await x.f1(...args)),b=num(await x.f2(...args)),s=x.fs?num(await x.fs(...args)):1;R.vars[x.v]=a;R.vars[x.id]=[b,s];pc++;break}
    case 'fortest':{const [b,s]=R.vars[x.id],v=num(R.vars[x.v]);pc=(s>=0?v<=b:v>=b)?pc+1:x.to;break}
    case 'forstep':{const [,s]=R.vars[x.id];R.vars[x.v]=num(R.vars[x.v])+s;pc++;break}
    case 'call':if(st.length>200)throw new SBErr('Дэд программ хэт олон удаа давхар дуудагдлаа',x.ln);st.push([C,pc+1]);C=R.subs[x.s].code;pc=0;break;
    case 'ret':if(!st.length)return;[C,pc]=st.pop();break;
    case 'end':return;
   }}}
  catch(e){if(!(e instanceof SBErr))e=new SBErr(e.message||String(e),C[pc]&&C[pc].ln);if(e.line==null&&C[pc])e.line=C[pc].ln;R.err=e;R.stop=true;throw e}
  finally{R.busy--}};
 await R.exec(prog.I,'main')};
/* ---------- Хэрэглэгчийн интерфейс ---------- */
const ICO={play:'<path d="M7 5l12 7-12 7z"/>',stop:'<rect x="6" y="6" width="12" height="12" rx="1.5"/>',check:'<path d="M5 12l5 5L20 7"/>',reset:'<path d="M4 12a8 8 0 1 0 3-6.3M4 4v4h4"/>',book:'<path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z"/>',dl:'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'};
const ic=k=>`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO[k]}</svg>`;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const KEY='sblab_code';
function mount(el,o={}){
 const TASKS=o.tasks||window.SB_TASKS||[],EX=o.examples||window.SB_EX||[];let task=o.task?TASKS.find(t=>t.id===o.task):null;const solved=Object.assign({},o.solved||{});
 let mem={};try{mem=JSON.parse(localStorage.getItem((window.SYNC_PREFIX||'')+KEY)||'{}')}catch(e){}
 const saveMem=()=>{try{localStorage.setItem((window.SYNC_PREFIX||'')+KEY,JSON.stringify(mem))}catch(e){}};
 const startCode=()=>task?(mem[task.id]??task.start??''):(mem._free??(EX[0]?EX[0][1]:'TextWindow.WriteLine("Сайн уу, Small Basic!")'));
 el.innerHTML=`<div class="sb"><div class="sb-bar">
  <select class="sb-task" aria-label="Даалгавар"><option value="">Чөлөөт горим</option>${TASKS.map(t=>`<option value="${t.id}" ${task&&task.id===t.id?'selected':''}>${solved[t.id]?'✓ ':''}${esc(t.t)}</option>`).join('')}</select>
  <select class="sb-ex" aria-label="Жишээ программ"><option value="">Жишээ нээх…</option>${EX.map((e,i)=>`<option value="${i}">${esc(e[0])}</option>`).join('')}</select>
  <span style="flex:1"></span><button class="sb-btn sb-run">${ic('play')} Ажиллуулах</button><button class="sb-btn sb-ghost sb-stop" disabled>${ic('stop')} Зогсоох</button>${TASKS.length?`<button class="sb-btn sb-ghost sb-chk">${ic('check')} Шалгах</button>`:''}</div>
  <div class="sb-task-d"></div>
  <div class="sb-main"><div class="sb-ed"><div class="sb-gut" aria-hidden="true"></div><textarea class="sb-code" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="Программын код"></textarea></div>
  <div class="sb-outs"><div class="sb-tabs"><button class="on" data-o="t">Текст цонх</button><button data-o="g">График цонх</button></div>
   <div class="sb-con" data-p="t" aria-live="polite"></div>
   <div class="sb-gw" data-p="g" hidden><div class="sb-gwin"><canvas class="sb-c1" width="640" height="480"></canvas><canvas class="sb-c2" width="640" height="480"></canvas><div class="sb-ctl"></div></div></div></div></div>
  <div class="sb-msg" role="status"></div>
  <details class="sb-help"><summary>${ic('book')} Командын товч лавлах</summary><div class="sb-ref">
  <p><b>TextWindow</b>: WriteLine(х), Write(х), Read(), ReadNumber(), Clear()</p>
  <p><b>Нөхцөл</b>: If … Then / ElseIf … Then / Else / EndIf · <b>Давталт</b>: For i = 1 To 10 Step 1 … EndFor, While нөхцөл … EndWhile, шошго: + Goto шошго</p>
  <p><b>Дэд программ</b>: Sub Нэр … EndSub, дуудах: Нэр()</p>
  <p><b>GraphicsWindow</b>: DrawLine(x1,y1,x2,y2), DrawRectangle / FillRectangle(x,y,w,h), DrawEllipse / FillEllipse(x,y,w,h), DrawTriangle / FillTriangle(x1,y1,x2,y2,x3,y3), DrawText(x,y,"бичвэр"), BrushColor, PenColor, PenWidth, BackgroundColor, FontSize, GetRandomColor(), Clear()</p>
  <p><b>Turtle</b>: Move(d), Turn(өнцөг), TurnRight(), TurnLeft(), PenUp(), PenDown(), MoveTo(x,y), Speed (1–10), Angle, X, Y</p>
  <p><b>Shapes</b>: AddRectangle(w,h), AddEllipse(w,h), AddText(т), Move(нэр,x,y), Animate(нэр,x,y,мс), Rotate, Zoom, HideShape, Remove · <b>Controls</b>: AddButton(т,x,y), AddTextBox(x,y), GetTextBoxText(нэр), ButtonClicked = Дэд, LastClickedButton</p>
  <p><b>Math</b>: Pi, Abs, Round, Floor, Ceiling, SquareRoot, Power, Remainder, GetRandomNumber(n), Max, Min, Sin, Cos · <b>Text</b>: GetLength, GetSubText(т,эхлэл,урт), Append, GetIndexOf, ConvertToUpperCase, GetCharacter, GetCharacterCode · <b>Array</b>: GetItemCount, ContainsIndex · <b>Clock</b>: Hour, Minute, Second · <b>Program</b>: Delay(мс), End() · <b>Sound</b>: PlayChime(), PlayMusic("O4 C D E")</p></div></details></div>`;
 const $=q=>el.querySelector(q),code=$('.sb-code'),gut=$('.sb-gut'),con=$('.sb-con'),msg=$('.sb-msg'),c1=$('.sb-c1'),c2=$('.sb-c2'),ctl=$('.sb-ctl'),gwin=$('.sb-gwin');
 code.value=startCode();
 const gutter=()=>{const n=code.value.split('\n').length;gut.textContent=Array.from({length:n},(_,i)=>i+1).join('\n');gut.scrollTop=code.scrollTop};
 code.addEventListener('input',()=>{gutter();if(task)mem[task.id]=code.value;else mem._free=code.value;saveMem()});code.addEventListener('scroll',()=>{gut.scrollTop=code.scrollTop});
 code.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const s=code.selectionStart;code.setRangeText('  ',s,code.selectionEnd,'end');code.dispatchEvent(new Event('input'))}if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();run()}if(e.key==='F5'){e.preventDefault();run()}});
 gutter();
 const showTask=()=>{const d=$('.sb-task-d');if(!task){d.innerHTML='<p>Чөлөөт горим: өөрийн программаа бичээд «Ажиллуулах» товчийг дар (эсвэл F5, Ctrl+Enter). Жишээ программуудаас нээж болно.</p>';return}
  d.innerHTML=`<p><b>${esc(task.t)}</b>${solved[task.id]?' <span class="sb-ok">✓ Бодсон</span>':''}</p><p>${task.d}</p>${task.tests?`<p class="sb-small">Шалгах үед программыг ${task.tests.length} янзын оролтоор ажиллуулж үр дүнг шалгана.</p>`:''}${task.hint?`<details><summary>Зөвлөгөө</summary><p>${task.hint}</p></details>`:''}`};
 showTask();
 const tab=k=>{el.querySelectorAll('.sb-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.o===k));con.hidden=k!=='t';$('.sb-gw').hidden=k!=='g'};
 el.querySelectorAll('.sb-tabs button').forEach(b=>b.onclick=()=>tab(b.dataset.o));
 const cx=c1.getContext('2d'),ox=c2.getContext('2d');
 let R=null,curLine=null;
 const say=(t,k)=>{msg.className='sb-msg '+(k||'');msg.innerHTML=t};
 const ui={ctx:cx,octx:ox,
  print:(s,nl)=>{if(!curLine){curLine=document.createElement('div');con.appendChild(curLine)}curLine.textContent+=s;if(nl)curLine=null;con.scrollTop=con.scrollHeight},
  cls:()=>{con.innerHTML='';curLine=null},fg:c=>{},
  read:numeric=>new Promise(res=>{tab('t');const inp=document.createElement('input');inp.className='sb-in';inp.inputMode=numeric?'decimal':'text';inp.setAttribute('aria-label','Оролт');
   if(!curLine){curLine=document.createElement('div');con.appendChild(curLine)}curLine.appendChild(inp);inp.focus();
   inp.onkeydown=e=>{if(e.key==='Enter'){const v=inp.value;inp.remove();res(v)}};R._rd=()=>{inp.remove();res('')}}),
  showGraphics:()=>tab('g'),err:e=>{say(`<b>${e.line?e.line+'-р мөр:':'Алдаа:'}</b> ${esc(e.message)}`,'bad');markLine(e.line);stop()},bg:c=>{gwin.style.background=c},title:()=>{},msg:(t,h)=>new Promise(r=>{alertBox(t,h,r)}),
  addCtl:(id,t,cap,x,y,cb)=>{const e=t==='b'?document.createElement('button'):document.createElement('input');e.dataset.id=id;e.className='sb-c-'+t;e.style.left=(x/640*100)+'%';e.style.top=(y/480*100)+'%';
   if(t==='b'){e.textContent=cap;e.type='button';e.onclick=cb}else{e.type='text';e.oninput=()=>cb(e.value)}ctl.appendChild(e)},
  getCtl:id=>{const e=ctl.querySelector(`[data-id="${id}"]`);return e?(e.tagName==='INPUT'?e.value:e.textContent):''},setCtl:(id,v)=>{const e=ctl.querySelector(`[data-id="${id}"]`);if(e){if(e.tagName==='INPUT')e.value=v;else e.textContent=v}},
  delCtl:id=>{const e=ctl.querySelector(`[data-id="${id}"]`);e&&e.remove()},showCtl:(id,v)=>{const e=ctl.querySelector(`[data-id="${id}"]`);if(e)e.hidden=!v},moveCtl:(id,x,y)=>{const e=ctl.querySelector(`[data-id="${id}"]`);if(e){e.style.left=(x/640*100)+'%';e.style.top=(y/480*100)+'%'}}};
 const alertBox=(t,h,r)=>{const d=document.createElement('div');d.className='sb-alert';d.innerHTML=`<div><b>${esc(h)}</b><p>${esc(t)}</p><button class="sb-btn">OK</button></div>`;el.querySelector('.sb').appendChild(d);d.querySelector('button').onclick=()=>{d.remove();r()}};
 const pos=e=>{const r=c2.getBoundingClientRect();return [(e.clientX-r.left)/r.width*640,(e.clientY-r.top)/r.height*480]};
 gwin.addEventListener('pointerdown',e=>{if(R&&!R.stop&&e.target===c2){const[x,y]=pos(e);R.mouse(x,y,'mousedown')}});
 gwin.addEventListener('pointerup',e=>{if(R&&!R.stop){const[x,y]=pos(e);R.mouse(x,y,'mouseup')}});
 gwin.addEventListener('pointermove',e=>{if(R&&!R.stop){const[x,y]=pos(e);R.g.mx=x;R.g.my=y;if(R.handlers.mousemove)R.fire('mousemove')}});
 const onKey=e=>{if(R&&!R.stop&&document.activeElement!==code&&!(document.activeElement&&document.activeElement.tagName==='INPUT')&&el.isConnected){const m={ArrowUp:'Up',ArrowDown:'Down',ArrowLeft:'Left',ArrowRight:'Right',' ':'Space',Enter:'Return',Escape:'Escape'};const k=m[e.key]||(e.key.length===1?e.key.toUpperCase():e.key);if(R.handlers.keydown){e.preventDefault();R.key(k)}}};
 document.addEventListener('keydown',onKey);
 const btnRun=$('.sb-run'),btnStop=$('.sb-stop');
 const stop=()=>{if(R){R.stop=true;R.cleanup();R._rd&&R._rd()}btnRun.disabled=false;btnStop.disabled=true};
 const markLine=ln=>{if(!ln)return;const L=code.value.split('\n');let p=0;for(let i=0;i<ln-1&&i<L.length;i++)p+=L[i].length+1;try{code.focus();code.setSelectionRange(p,p+(L[ln-1]||'').length)}catch(e){}};
 async function run(){stop();con.innerHTML='';curLine=null;cx.clearRect(0,0,640,480);ox.clearRect(0,0,640,480);ctl.innerHTML='';gwin.style.background='#fff';tab('t');say('');
  let prog;try{prog=compile(code.value)}catch(e){say(`<b>${e.line?e.line+'-р мөр:':'Алдаа:'}</b> ${esc(e.message)}`,'bad');markLine(e.line);return}
  R=new Runtime(ui,{});btnRun.disabled=true;btnStop.disabled=false;const me=R;
  try{await R.run(prog);if(me!==R)return;
   const ev=Object.keys(R.handlers).length;if(ev&&!R.stop&&!R.ended){say('Программ үйл явдал (товч дарах, хулгана, цаг хэмжигч) хүлээж байна. Дуусгах бол «Зогсоох» дар.','');return}
   say(R.ended?'Программ Program.End()-ээр дууслаа.':'Программ амжилттай ажиллаж дууслаа.','ok');btnRun.disabled=false;btnStop.disabled=true}
  catch(e){if(me!==R)return;say(`<b>${e.line?e.line+'-р мөр:':'Алдаа:'}</b> ${esc(e.message)}`,'bad');markLine(e.line);btnRun.disabled=false;btnStop.disabled=true}}
 btnRun.onclick=run;btnStop.onclick=()=>{stop();say('Зогсоолоо.','')};
 $('.sb-ex').onchange=e=>{const i=e.target.value;if(i==='')return;if(code.value.trim()&&!confirmSwap())return(e.target.value='');code.value=EX[i][1];code.dispatchEvent(new Event('input'));e.target.value=''};
 const confirmSwap=()=>true;
 $('.sb-task').onchange=e=>{task=TASKS.find(t=>t.id===e.target.value)||null;code.value=startCode();gutter();showTask();say('')};
 const chk=$('.sb-chk');if(chk)chk.onclick=async()=>{if(!task){say('Эхлээд дээрх жагсаалтаас даалгавар сонгоно уу.','');return}
  let prog;try{prog=compile(code.value)}catch(e){say(`<b>${e.line?e.line+'-р мөр:':'Алдаа:'}</b> ${esc(e.message)}`,'bad');markLine(e.line);return}
  const low=code.value.toLowerCase().replace(/'.*$/gm,'');
  for(const k of task.need||[]){if(!low.includes(k.toLowerCase())){say(`Энэ даалгаварт <b>${esc(k)}</b> заавал ашиглана.`,'bad');return}}
  const tests=task.tests||[{in:[]}];const off=document.createElement('canvas');off.width=640;off.height=480;
  for(let k=0;k<tests.length;k++){const t=tests[k];const H=new Runtime({ctx:off.getContext('2d'),octx:null},{headless:true,input:t.in||[]});
   try{await H.run(prog)}catch(e){say(`Шалгалт ${k+1}: <b>${e.line?e.line+'-р мөр:':''}</b> ${esc(e.message)}`,'bad');return}
   const txt=H.out.concat(H.cur?[H.cur]:[]).join('\n'),toks=txt.split(/[\s,;:=()]+/).filter(Boolean);
   for(const h of t.has||[]){const ok=typeof h==='number'?toks.some(x=>isNum(x)&&Math.abs(+x-h)<1e-6):txt.toLowerCase().includes(String(h).toLowerCase());
    if(!ok){say(`Шалгалт ${k+1}: оролт <b>${esc((t.in||[]).join(', ')||'байхгүй')}</b> үед гаралтад <b>${esc(h)}</b> гарах ёстой байв.<br><span class="sb-small">Таны гаралт: ${esc(txt.slice(0,200)||'(хоосон)')}</span>`,'bad');return}}
   for(const h of t.not||[]){if(toks.some(x=>String(x)===String(h))){say(`Шалгалт ${k+1}: гаралтад <b>${esc(h)}</b> гарах ёсгүй.`,'bad');return}}
   if(t.lines!=null&&H.out.filter(x=>x.trim()).length<t.lines){say(`Шалгалт ${k+1}: дор хаяж ${t.lines} мөр хэвлэх ёстой.`,'bad');return}
   if(t.log){for(const [op,n] of Object.entries(t.log)){const c=H.log.filter(x=>x===op||x.startsWith(op)).length;if(c<n){say(`Шалгалт ${k+1}: программ «${esc(op)}» үйлдлийг дор хаяж ${n} удаа хийх ёстой (одоо ${c}).`,'bad');return}}}
   if(t.fn){const m=t.fn(H,txt);if(m!==true){say(`Шалгалт ${k+1}: ${m||'Үр дүн буруу байна.'}`,'bad');return}}}
  const first=!solved[task.id];solved[task.id]=1;say(`<b>Зөв!</b> Бүх шалгалтыг давлаа.${first&&task.p?` +${task.p} оноо`:''}`,'ok');
  const op=$('.sb-task').querySelector(`option[value="${task.id}"]`);if(op&&!op.textContent.startsWith('✓'))op.textContent='✓ '+op.textContent;showTask();
  if(first&&o.onSolve)o.onSolve(task.id,task.p||5)};
 const obs=new MutationObserver(()=>{if(!el.isConnected){stop();document.removeEventListener('keydown',onKey);obs.disconnect()}});obs.observe(document.body,{childList:true,subtree:true});
}
window.SBLab={mount,compile,Runtime,run:async(src,input)=>{const off=document.createElement('canvas');off.width=640;off.height=480;const H=new Runtime({ctx:off.getContext('2d'),octx:null},{headless:true,input});await H.run(compile(src));return {out:H.out.concat(H.cur?[H.cur]:[]),log:H.log,vars:H.vars}}};
})();
