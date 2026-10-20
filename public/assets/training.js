(() => {
 'use strict';
 const byId=id=>document.getElementById(id), form=byId('lookup');
 if(!form)return;
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const nav=el('div',undefined,'training-nav');nav.setAttribute('role','group');nav.setAttribute('aria-label','ประเภทข้อมูล');
 const shifts=el('button','ตารางกะ','btn btn-primary'),training=el('button','การอบรม','btn btn-outline-secondary');
 shifts.type=training.type='button';nav.append(shifts,training);form.closest('section').before(nav);
 const section=el('section',undefined,'training-panel');section.id='training-result';section.hidden=true;
 const heading=el('h2','การอบรมของคุณ'),notice=el('p','กำหนดการอบรมแยกจากตารางกะ และไม่มีผลต่อค่ากะ','text-muted');
 const state=el('p','','status');state.setAttribute('role','status');state.setAttribute('aria-live','polite');
 const calendar=el('div',undefined,'training-calendar'),list=el('div',undefined,'training-list'),pending=el('div');
 section.append(heading,notice,state,calendar,list,pending);byId('result').after(section);
 let active=false,controller=null,generation=0;
 const format=d=>d?new Date(d+'T12:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'}):'ยังไม่กำหนดวัน';
 const intersects=(event,day)=>event.start_date&&event.end_date&&event.start_date<=day&&event.end_date>=day;
 function card(event){
  const item=el('article',undefined,'training-event');item.dataset.start=event.start_date||'';item.dataset.end=event.end_date||'';item.dataset.status=event.source_status||event.status||'';item.append(el('span',event.module_id||event.event_id,'eyebrow'),el('h3',event.title));
  item.append(el('p',event.start_date?format(event.start_date)+(event.end_date!==event.start_date?' – '+format(event.end_date):''):'ยังไม่กำหนดวัน'));
  item.append(el('p',[event.start_time&&('เวลา '+event.start_time.slice(0,5)+(event.end_time?'–'+event.end_time.slice(0,5):'')),event.room&&('ห้อง '+event.room)].filter(Boolean).join(' · ')||'ยังไม่ระบุเวลาและห้อง','text-muted'));
  const status=event.source_status||event.status;if(status)item.append(el('small','สถานะจากไฟล์ต้นทาง: '+status));
  item.append(el('small','ช่วงกำหนดการ ไม่ใช่การยืนยันว่าเข้าเรียนหรือผ่านอบรม','text-muted'));return item;
 }
 function clear(){generation++;controller?.abort();section.removeAttribute('aria-busy');heading.textContent='การอบรมของคุณ';delete heading.dataset.person;calendar.replaceChildren();list.replaceChildren();pending.replaceChildren();state.textContent='กดค้นหาเพื่อโหลดกำหนดการล่าสุด';}
 async function load(){
  clear();const employee=byId('employee').value.trim(),month=byId('month').value;
  if(!employee||!/^\d{4}-\d{2}$/.test(month)){state.textContent='ระบุรหัสพนักงานและเดือนก่อนค้นหา';return;}
  const version=generation;controller=new AbortController();state.textContent='กำลังโหลดการอบรม…';section.setAttribute('aria-busy','true');
  try{
   const response=await fetch('api.php?action=training_list&employee='+encodeURIComponent(employee)+'&month='+encodeURIComponent(month),{cache:'no-store',signal:controller.signal});
   const body=await response.json();if(!response.ok)throw Error(body.error||'โหลดการอบรมไม่ได้');if(version!==generation)return;
   const events=body.events||[],tbc=body.undated||body.pending||events.filter(x=>!x.start_date),dated=events.filter(x=>x.start_date);
   heading.textContent='การอบรม · '+(body.person?.name||employee);heading.dataset.person=body.person?.name||employee;
   state.textContent=dated.length?'พบ '+dated.length+' รอบในเดือนที่เลือก':'ยังไม่มีการอบรมในเดือนที่เลือก';
   calendar.append(el('h3',new Date(month+'-01T12:00:00').toLocaleDateString('th-TH',{month:'long',year:'numeric'})));
   const grid=el('div',undefined,'training-grid');for(const label of ['จ.','อ.','พ.','พฤ.','ศ.','ส.','อา.'])grid.append(el('span',label,'training-weekday'));
   const today=new Date(),todayKey=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');const [year,m]=month.split('-').map(Number);for(let i=0;i<(new Date(year,m-1,1).getDay()+6)%7;i++)grid.append(el('span'));
   for(let day=1;day<=new Date(year,m,0).getDate();day++){
    const key=month+'-'+String(day).padStart(2,'0'),matches=dated.filter(x=>intersects(x,key)),cell=el(matches.length?'button':'div',undefined,'training-date'+(matches.length?' has-training':''));
    if(key===todayKey){cell.classList.add('today');cell.setAttribute('aria-current','date');cell.setAttribute('title','วันนี้');}cell.append(el('span',String(day)));if(matches.length){cell.type='button';cell.append(el('small',matches.length+' รอบ'));cell.setAttribute('aria-label',format(key)+' มีช่วงอบรม '+matches.length+' รอบ');cell.onclick=()=>{list.replaceChildren(...matches.map(card));list.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};}grid.append(cell);
   }
   calendar.append(grid,el('small','เครื่องหมายแสดงช่วงเริ่ม–สิ้นสุดตามกำหนดการ ไม่ได้ยืนยันวันเรียนจริง','text-muted'));
   list.append(...dated.map(card));if(tbc.length)pending.append(el('h3','ยังไม่กำหนดวัน · '+tbc.length+' รอบ'),...tbc.map(card));
  }catch(error){if(error.name!=='AbortError'&&version===generation)state.textContent=error.message;}finally{if(version===generation)section.removeAttribute('aria-busy');}
 }
 function switchView(next){active=next;form.querySelector('button[type=submit]').textContent=active?'ดูการอบรม':'ดูตารางกะ';shifts.className='btn '+(!active?'btn-primary':'btn-outline-secondary');training.className='btn '+(active?'btn-primary':'btn-outline-secondary');shifts.setAttribute('aria-pressed',String(!active));training.setAttribute('aria-pressed',String(active));section.hidden=!active;
  if(active){byId('result').hidden=true;byId('message').hidden=true;byId('loading-roster').hidden=true;load();}else{clear();byId('result').hidden=true;byId('message').hidden=false;lookup();}
 }
 new MutationObserver(()=>{if(active&&!byId('result').hidden)byId('result').hidden=true;if(active)byId('loading-roster').hidden=true;}).observe(byId('result'),{attributes:true,attributeFilter:['hidden']});
 shifts.onclick=()=>switchView(false);training.onclick=()=>switchView(true);shifts.setAttribute('aria-pressed','true');training.setAttribute('aria-pressed','false');
 form.addEventListener('submit',()=>{if(active)load();});
 for(const [id,event]of [['employee','input'],['month','change']])byId(id).addEventListener(event,clear);
 window.addEventListener('offline',()=>{clear();state.textContent='ออฟไลน์ กรุณาเชื่อมต่ออินเทอร์เน็ตเพื่อดูการอบรม';});
 if(new URLSearchParams(location.search).get('view')==='training')switchView(true);
})();
