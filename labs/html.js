/* ===== Веб студи: HTML засварлагч, шууд харагдац, даалгаврын автомат шалгалт ===== */
(function(){
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const IC={play:'<path d="M7 5l12 7-12 7z"/>',check:'<path d="M5 12l5 5L20 7"/>',dl:'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',book:'<path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z"/>'};
const ic=k=>`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]}</svg>`;
const SKEL='<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <title>Миний хуудас</title>\n</head>\n<body>\n  <h1>Сайн байна уу!</h1>\n  <p>Энэ бол миний анхны веб хуудас.</p>\n</body>\n</html>';
const KEY='htmllab_code';
/* Шалгах туслахууд: doc дээр ажиллана */
const Q=(d,s)=>d.querySelectorAll(s).length,has=(d,s)=>!!d.querySelector(s),txt=(d,s)=>(d.querySelector(s)?.textContent||'').trim();
window.HTML_CHK={Q,has,txt};
function mount(el,o={}){const TASKS=o.tasks||window.HTML_TASKS||[],EX=o.examples||window.HTML_EX||[];let task=o.task?TASKS.find(t=>t.id===o.task):null;const solved=Object.assign({},o.solved||{});
 let mem={};try{mem=JSON.parse(localStorage.getItem((window.SYNC_PREFIX||'')+KEY)||'{}')}catch(e){}
 const saveMem=()=>{try{localStorage.setItem((window.SYNC_PREFIX||'')+KEY,JSON.stringify(mem))}catch(e){}};
 const start=()=>task?(mem[task.id]??task.start??SKEL):(mem._free??SKEL);
 el.innerHTML=`<div class="hl"><div class="sb-bar"><select class="hl-task" aria-label="Даалгавар"><option value="">Чөлөөт горим</option>${TASKS.map(t=>`<option value="${t.id}" ${task&&task.id===t.id?'selected':''}>${solved[t.id]?'✓ ':''}${esc(t.t)}</option>`).join('')}</select>
  <select class="hl-ex" aria-label="Жишээ"><option value="">Жишээ нээх…</option>${EX.map((e,i)=>`<option value="${i}">${esc(e[0])}</option>`).join('')}</select><span style="flex:1"></span>
  <button class="sb-btn sb-ghost hl-dl">${ic('dl')} .html татах</button>${TASKS.length?`<button class="sb-btn hl-chk">${ic('check')} Шалгах</button>`:''}</div>
  <div class="sb-task-d hl-d"></div>
  <div class="hl-tabs"><button class="on" data-v="c">Код</button><button data-v="p">Харагдац</button></div>
  <div class="hl-main"><div class="sb-ed"><div class="sb-gut" aria-hidden="true"></div><textarea class="sb-code hl-code" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="HTML код"></textarea></div>
  <div class="hl-pv"><div class="hl-pvbar"><span></span><span></span><span></span><b>Хөтөч — шууд харагдац</b></div><iframe class="hl-frame" title="Веб хуудасны харагдац" sandbox="allow-same-origin"></iframe></div></div>
  <div class="sb-msg hl-msg" role="status"></div>
  <details class="sb-help"><summary>${ic('book')} Түгээмэл тагууд</summary><div class="sb-ref">
  <p><b>Бүтэц</b>: &lt;html&gt;, &lt;head&gt;, &lt;title&gt;, &lt;body&gt; · <b>Гарчиг</b>: &lt;h1&gt;…&lt;h6&gt; · <b>Догол мөр</b>: &lt;p&gt;, шинэ мөр &lt;br&gt;, хэвтээ зураас &lt;hr&gt;</p>
  <p><b>Хэлбэржүүлэлт</b>: &lt;b&gt; тод, &lt;i&gt; налуу, &lt;u&gt; доогуур зураас, &lt;sup&gt;, &lt;sub&gt;, &lt;font color="red" size="5"&gt;, style="color:blue; text-align:center"</p>
  <p><b>Жагсаалт</b>: &lt;ul&gt;&lt;li&gt;, &lt;ol type="1"&gt;&lt;li&gt; · <b>Хүснэгт</b>: &lt;table border="1"&gt;&lt;tr&gt;&lt;th&gt;/&lt;td&gt;, colspan, rowspan, bgcolor</p>
  <p><b>Зураг</b>: &lt;img src="зураг.jpg" alt="тайлбар" width="200"&gt; · <b>Аудио, видео</b>: &lt;audio controls src="…"&gt;, &lt;video controls width="320" src="…"&gt;</p>
  <p><b>Холбоос</b>: &lt;a href="https://…" target="_blank"&gt;, хуудас доторх: &lt;a href="#хэсэг"&gt; ба id="хэсэг", имэйл: href="mailto:…" · <b>Фрейм</b>: &lt;iframe src="…" width="400" height="300"&gt;</p></div></details></div>`;
 const $=q=>el.querySelector(q),code=$('.hl-code'),gut=$('.sb-gut'),fr=$('.hl-frame'),msg=$('.hl-msg');
 code.value=start();
 const gutter=()=>{const n=code.value.split('\n').length;gut.textContent=Array.from({length:n},(_,i)=>i+1).join('\n');gut.scrollTop=code.scrollTop};
 let tmr=null;const upd=()=>{clearTimeout(tmr);tmr=setTimeout(()=>{fr.srcdoc=code.value.replace(/<script[\s\S]*?<\/script>/gi,'')},250)};
 code.addEventListener('input',()=>{gutter();upd();if(task)mem[task.id]=code.value;else mem._free=code.value;saveMem()});code.addEventListener('scroll',()=>{gut.scrollTop=code.scrollTop});
 code.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const s=code.selectionStart;code.setRangeText('  ',s,code.selectionEnd,'end');code.dispatchEvent(new Event('input'))}});
 gutter();upd();
 const showTask=()=>{const d=$('.hl-d');d.innerHTML=task?`<p><b>${esc(task.t)}</b>${solved[task.id]?' <span class="sb-ok">✓ Бодсон</span>':''}</p><p>${task.d}</p>${task.hint?`<details><summary>Зөвлөгөө</summary><p>${task.hint}</p></details>`:''}`:'<p>Чөлөөт горим: зүүн талд HTML код бичихэд баруун талд хуудас шууд харагдана. Утсан дээр «Код», «Харагдац» хооронд шилжинэ.</p>'};showTask();
 el.querySelectorAll('.hl-tabs button').forEach(b=>b.onclick=()=>{el.querySelectorAll('.hl-tabs button').forEach(x=>x.classList.toggle('on',x===b));$('.hl-main').dataset.v=b.dataset.v});
 $('.hl-ex').onchange=e=>{const i=e.target.value;if(i==='')return;code.value=EX[i][1];code.dispatchEvent(new Event('input'));e.target.value=''};
 $('.hl-task').onchange=e=>{task=TASKS.find(t=>t.id===e.target.value)||null;code.value=start();gutter();upd();showTask();msg.textContent='';msg.className='sb-msg hl-msg'};
 $('.hl-dl').onclick=()=>{const b=new Blob([code.value],{type:'text/html'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=(task?task.id:'index')+'.html';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)};
 const ck=$('.hl-chk');if(ck)ck.onclick=()=>{if(!task){msg.className='sb-msg hl-msg';msg.textContent='Эхлээд даалгавар сонгоно уу.';return}
  const d=new DOMParser().parseFromString(code.value,'text/html');
  for(const [fn,m] of task.checks){let ok=false;try{ok=fn(d,code.value)}catch(e){}if(!ok){msg.className='sb-msg hl-msg bad';msg.innerHTML='Дутуу: '+m;return}}
  const first=!solved[task.id];solved[task.id]=1;msg.className='sb-msg hl-msg ok';msg.innerHTML=`<b>Зөв!</b> Бүх шаардлагыг хангалаа.${first&&task.p?` +${task.p} оноо`:''}`;
  const op=$('.hl-task').querySelector(`option[value="${task.id}"]`);if(op&&!op.textContent.startsWith('✓'))op.textContent='✓ '+op.textContent;showTask();if(first&&o.onSolve)o.onSolve(task.id,task.p||5)}}
window.HtmlLab={mount};
})();
