/* ===== Компьютер угсрагч: захиалагчийн хэрэгцээ, төсөвт тохирох эд анги сонгох ===== */
(function(){
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money=n=>n.toLocaleString('en-US').replace(/,/g,' ')+'₮';
const NM={cpu:'Төв процессор (ТББ)',ram:'Шуурхай санах ой (RAM)',ssd:'Хадгалах төхөөрөмж',gpu:'Видео карт',bat:'Хэлбэр, батерей'};
const SV={cpu:'<rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',ram:'<rect x="2" y="7" width="20" height="9" rx="1"/><path d="M6 16v3M10 16v3M14 16v3M18 16v3M6 10h2M11 10h2M16 10h2"/>',ssd:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M17 16h.01"/>',gpu:'<rect x="2" y="6" width="20" height="11" rx="1.5"/><circle cx="8" cy="11.5" r="3"/><circle cx="16" cy="11.5" r="3"/><path d="M4 17v3"/>',bat:'<rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 10v4M5 10v4M9 10v4"/>'};
const ic=k=>`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SV[k]}</svg>`;
function mount(el,o={}){const J=window.PC_JOBS||[],P=window.PC_PARTS;const solved=Object.assign({},o.solved||{});let job=J.find(j=>j.id===o.task)||J[0];const pick={};
 const reset=()=>{Object.keys(P).forEach(k=>pick[k]=0)};reset();
 const draw=()=>{const tot=Object.keys(P).reduce((s,k)=>s+P[k][pick[k]][2],0),N=job.need,v=k=>P[k][pick[k]][1];
  const cks=[['cpu',v('cpu')>=N.cpu,`ТББ дор хаяж ${P.cpu[N.cpu-1][0]} түвшинд`],['ram',v('ram')>=N.ram,`RAM ≥ ${N.ram} ГБ`],['ssd',v('ssd')>=N.ssd,`SSD ≥ ${N.ssd>=1000?N.ssd/1000+' ТБ':N.ssd+' ГБ'}`],['gpu',v('gpu')>=N.gpu,N.gpu?`Видео карт ≥ ${P.gpu[N.gpu][0]}`:'Видео карт заавал биш'],['bat',N.bat?v('bat')>=N.bat:true,N.bat?'Зөөврийн, батерейтай':'Хэлбэр чөлөөтэй'],['bud',tot<=job.budget,`Төсөв ${money(job.budget)}-өөс хэтрэхгүй`]];
  const ok=cks.every(c=>c[1]);
  el.innerHTML=`<div class="pcl"><div class="sb-bar"><select class="pc-job" aria-label="Захиалга">${J.map(j=>`<option value="${j.id}" ${j===job?'selected':''}>${solved[j.id]?'✓ ':''}${esc(j.t)}</option>`).join('')}</select><span style="flex:1"></span><button class="sb-btn sb-ghost pc-reset">Дахин эхлэх</button></div>
  <div class="sb-task-d"><p><b>Захиалагч: ${esc(job.t)}</b>${solved[job.id]?' <span class="sb-ok">✓ Биелүүлсэн</span>':''}</p><p>${esc(job.d)}</p><p>Төсөв: <b>${money(job.budget)}</b></p></div>
  <div class="pc-grid">${Object.keys(P).map(k=>`<div class="pc-part"><div class="pc-h">${ic(k)}<b>${NM[k]}</b></div><div class="pc-opts">${P[k].map((x,i)=>`<button class="pc-o ${pick[k]===i?'on':''}" data-k="${k}" data-i="${i}"><span>${esc(x[0])}</span><small>${x[2]?money(x[2]):'Үнэгүй'}</small></button>`).join('')}</div></div>`).join('')}</div>
  <div class="pc-sum"><div class="pc-tot ${tot>job.budget?'over':''}">Нийт: <b>${money(tot)}</b> / ${money(job.budget)}<div class="pc-bar"><span style="width:${Math.min(100,tot/job.budget*100)}%"></span></div></div>
  <ul class="pc-ck">${cks.map(c=>`<li class="${c[1]?'ok':''}">${c[1]?'✓':'○'} ${esc(c[2])}</li>`).join('')}</ul>
  <button class="sb-btn pc-go" ${ok?'':'disabled'}>Захиалагчид хүлээлгэн өгөх</button><div class="sb-msg pc-msg"></div></div></div>`;
  el.querySelector('.pc-job').onchange=e=>{job=J.find(j=>j.id===e.target.value);reset();draw()};
  el.querySelector('.pc-reset').onclick=()=>{reset();draw()};
  el.querySelectorAll('.pc-o').forEach(b=>b.onclick=()=>{pick[b.dataset.k]=+b.dataset.i;draw()});
  el.querySelector('.pc-go').onclick=()=>{const left=job.budget-tot,first=!solved[job.id];solved[job.id]=1;const m=el.querySelector('.pc-msg');m.className='sb-msg pc-msg ok';
   m.innerHTML=`<b>Захиалагч баяртай байна!</b> Бүх шаардлагыг хангаж, ${money(left)} хэмнэлээ.${first&&job.p?` +${job.p} оноо`:''}`;if(first&&o.onSolve)o.onSolve(job.id,job.p||10)}};
 draw()}
window.PcLab={mount};
})();
