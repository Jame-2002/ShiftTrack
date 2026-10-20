(() => {
 document.body.classList.add('training-concept');
 const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 const panel=document.getElementById('training-result');
 if(panel){
  const heading=panel.querySelector('h2'),notice=heading.nextElementSibling,identity=make('p','','concept-identity'),head=make('div','','concept-heading'),stats=make('div','','concept-stats');
  const title=make('div');title.append(heading,identity);head.append(title,stats);panel.prepend(head);notice.classList.add('concept-note');
  const list=panel.querySelector('.training-list'),calendar=panel.querySelector('.training-calendar');const listTitle=make('h3','รายการอบรมในเดือนที่เลือก','concept-list-heading');panel.insertBefore(listTitle,calendar);panel.insertBefore(list,calendar);
  let showAll=false;const all=make('button','แสดงทุกรอบในเดือน','concept-all');all.type='button';all.onclick=()=>{showAll=!showAll;all.textContent=showAll?'แสดงเฉพาะรอบถัดไป':'แสดงทุกรอบในเดือน';document.querySelector('#lookup button[type=submit]').click();};listTitle.after(all);
  const history=make('details','','concept-history'),historyItems=make('div');history.append(make('summary','รายการก่อนหน้าในเดือน'),historyItems);calendar.after(history);
  let lastHeading='',lastCount='';
  function enhance(){
   if(heading.textContent!==lastHeading){identity.textContent=heading.dataset.person?heading.dataset.person+' · '+document.getElementById('employee').value:'';if(heading.dataset.person)heading.textContent='การอบรมของฉัน';lastHeading=heading.textContent;}
   const newBatch=!!list.querySelector('article:not([data-concept])');if(newBatch)historyItems.replaceChildren();
   for(const card of list.querySelectorAll('article:not([data-concept])')){
    card.dataset.concept='true';const date=make('div','','concept-date'),content=make('div','','concept-course');
    while(card.firstChild)content.append(card.firstChild);
    const start=card.dataset.start,end=card.dataset.end;
    if(start){date.append(make('strong',start.slice(8).replace(/^0/,'')+(end!==start&&end.slice(0,7)===start.slice(0,7)?'–'+Number(end.slice(8)):'')),make('span',new Date(start+'T12:00:00').toLocaleDateString('th-TH',{month:'short'})));}else date.append(make('strong','TBC'));
    const badge=make('span',({'Not Start':'ตามแผน',Completed:'เสร็จสิ้น',Failed:'ตามผลต้นทาง'})[card.dataset.status]||'ตามข้อมูลต้นทาง','concept-badge');
    const p=content.querySelector('p');if(p)p.classList.add('concept-period');card.append(date,content,badge);
   }
   const state=panel.querySelector('[role=status]')?.textContent||'';
   const count=state.match(/พบ (\d+) รอบ/)?.[1]||'0';const starts=[...list.children].map(c=>c.dataset.start).filter(Boolean).sort();const today=new Date();const todayKey=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');const next=starts.find(d=>d>=todayKey);const signature=count+'|'+next;
   if(newBatch&&!showAll&&next&&list.children.length>1){for(const c of [...list.children])if(c.dataset.end&&c.dataset.end<todayKey)historyItems.append(c);listTitle.textContent='รายการอบรมที่กำลังจะมาถึง';}else if(newBatch)listTitle.textContent='รายการอบรมในเดือนที่เลือก';history.hidden=!historyItems.children.length;
   const monthTitle=calendar.querySelector('h3:not([data-nav])');if(monthTitle){monthTitle.dataset.nav='true';const bar=make('div','','concept-calendar-nav');for(const direction of [-1,1]){const b=make('button',direction<0?'‹':'›');b.type='button';b.setAttribute('aria-label',direction<0?'เดือนอบรมก่อนหน้า':'เดือนอบรมถัดไป');b.onclick=()=>{const input=document.getElementById('month'),[y,m]=input.value.split('-').map(Number),d=new Date(y,m-1+direction,1);input.value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');document.querySelector('#lookup button[type=submit]').click();};bar.append(b);}monthTitle.before(bar);bar.insertBefore(monthTitle,bar.lastChild);}
   if(signature!==lastCount){lastCount=signature;stats.replaceChildren();for(const [label,value] of [['เดือนนี้',count+' รายการ'],['รอบถัดไปในเดือน',next?new Date(next+'T12:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'short'}):'ไม่มีรายการ']]){const box=make('div');box.append(make('small',label),make('strong',value));stats.append(box);}}
  }
  new MutationObserver(enhance).observe(panel,{childList:true,subtree:true});enhance();
 }
 const admin=document.getElementById('training-admin');
 if(admin){
  admin.classList.remove('card','p-4');admin.classList.add('concept-admin');
  const heading=make('div','','concept-admin-heading'),text=make('div');text.append(make('h1','จัดการการอบรม'),make('p','เฉพาะผู้ดูแล','text-muted'));const other=make('button','จัดการกะและสมาชิก','btn btn-outline-secondary');other.type='button';other.onclick=()=>{document.body.classList.toggle('training-admin-other');other.textContent=document.body.classList.contains('training-admin-other')?'จัดการการอบรม':'จัดการกะและสมาชิก';};document.querySelector('.top').append(other);const upload=make('button','↑ นำเข้า Excel','btn btn-outline-primary');upload.type='button';heading.append(text,upload,document.getElementById('training-create'));
  const importPanel=make('div','','concept-import card p-4');importPanel.hidden=true;
  for(const child of [...admin.children]){if(child.tagName==='HR')break;importPanel.append(child);}
  const banner=make('button','','concept-warning');banner.type='button';banner.append(make('strong','ตรวจข้อมูลก่อนเผยแพร่'),make('span','รหัสไม่ตรง / วันที่ไม่แน่นอน ต้องตรวจสอบ  ›'));banner.onclick=()=>{importPanel.hidden=!importPanel.hidden;};
  upload.onclick=()=>{importPanel.hidden=false;document.getElementById('training-file').click();};
  const editor=document.getElementById('training-edit'),events=document.getElementById('training-events'),search=document.getElementById('training-filter');
  const aside=make('div','','concept-event-picker'),grid=make('div','','concept-admin-grid');aside.append(make('h2','รอบอบรม'),document.getElementById('training-pending-queue'),search.previousElementSibling,search,events);grid.append(aside,editor);admin.prepend(heading,banner,importPanel,grid);
  const idRow=make('div','','concept-event-id');idRow.append(make('span','EventID'),make('strong','—'));editor.querySelector('h3').after(idRow);
  const impact=document.getElementById('training-edit-impact');impact.classList.add('concept-warning');editor.querySelector('button[type=submit]').before(impact);
  new MutationObserver(()=>{idRow.querySelector('strong').textContent=impact.textContent.split(' · ').at(-1)||'—';}).observe(impact,{childList:true});
  editor.append(make('p','นำเข้าซ้ำไม่สร้างรายการซ้ำ · เก็บประวัติการแก้ไข','concept-audit'));
  let loaded=false;
  function autoLoad(){if(!document.getElementById('workspace').hidden&&!loaded){loaded=true;document.getElementById('training-load').click();}}
  new MutationObserver(autoLoad).observe(document.getElementById('workspace'),{attributes:true,attributeFilter:['hidden']});autoLoad();
  let chosen=false;new MutationObserver(()=>{if(chosen)return;const target=events.querySelector('[data-event-id="EVT-10801"]')||events.querySelector('button');if(target){chosen=true;target.click();}}).observe(events,{childList:true});
 }
})();
