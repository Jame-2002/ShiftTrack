(() => {
 const releaseNotes=document.getElementById('release-notes');
 const releaseVersion='training-2026-10-20';
 const localDemo=['localhost','127.0.0.1','[::1]'].includes(location.hostname)&&new URLSearchParams(location.search).get('demo')==='team-day';
 const demoQuery=localDemo?'&demo=team-day':'';
 const releaseKey=localDemo?'shifttrack-demo-release-seen':'shifttrack-release-seen';
 let seenRelease=false;
 try{seenRelease=localStorage.getItem(releaseKey)===releaseVersion;}catch{}
 if(releaseNotes&&!seenRelease){
  releaseNotes.showModal();
  try{localStorage.setItem(releaseKey,releaseVersion);}catch{}
 }
 document.getElementById('close-release-notes')?.addEventListener('click',()=>releaseNotes.close());
 const dialog=document.getElementById('detail');
 const own=document.createElement('section');own.id='demo-own';
 const shift=document.getElementById('detail-shift'),peers=document.getElementById('detail-peers');
 const peerTitle=peers.previousElementSibling;
 dialog.append(own);own.append(shift,peerTitle,peers);
 const tabs=document.createElement('div');tabs.className='demo-day-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','มุมมองตารางรายวัน');
 tabs.innerHTML='<button id="demo-own-tab" type="button" role="tab" aria-controls="demo-own" aria-selected="true">กะของฉัน</button><button id="demo-team-tab" type="button" role="tab" aria-controls="demo-team" aria-selected="false">กะทั้งทีม</button>';
 own.before(tabs);
 const team=document.createElement('section');team.id='demo-team';team.hidden=true;team.setAttribute('role','tabpanel');team.setAttribute('aria-labelledby','demo-team-tab');
 team.innerHTML='<div class="demo-day-nav"><button type="button" id="demo-prev" aria-label="วันก่อนหน้า">‹</button><span id="demo-day-caption"></span><button type="button" id="demo-next" aria-label="วันถัดไป">›</button></div><p id="demo-team-status" role="status" aria-live="polite"></p><div id="demo-team-groups"></div>';
 own.setAttribute('role','tabpanel');own.setAttribute('aria-labelledby','demo-own-tab');dialog.append(team);
 const ownTab=document.getElementById('demo-own-tab'),teamTab=document.getElementById('demo-team-tab');
 const labels={D:'กลางวัน',E:'กะ E',L:'กะ L',N:'กลางคืน',R:'วันหยุด',PH:'วันหยุดสำคัญ',AL:'ลาพักร้อน',BL:'ลากิจ'};
 let date='',version=0,controller=null;
 const originalDetail=detail;
 detail=(day,shift,peers)=>{date=day;originalDetail(day,shift,peers);switchTab(false);};
 function switchTab(isTeam){own.hidden=isTeam;team.hidden=!isTeam;ownTab.setAttribute('aria-selected',String(!isTeam));teamTab.setAttribute('aria-selected',String(isTeam));dialog.className=isTeam?'demo-team-dialog':own.className;if(isTeam)loadTeam();else{version++;controller?.abort();if(date){const row=data?.rows.find(r=>r.day===date);dialog.className='code-'+(row?.code||'none');}}}
 ownTab.onclick=()=>{const row=data?.rows.find(r=>r.day===date);originalDetail(date,row,data?.peers.filter(p=>p.day===date)||[]);switchTab(false);};
 teamTab.onclick=()=>switchTab(true);
 tabs.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const target=event.key==='Home'||event.key==='ArrowLeft'?ownTab:teamTab;target.click();target.focus();};
 async function loadTeam(){const current=++version;controller?.abort();controller=new AbortController();const status=document.getElementById('demo-team-status'),groups=document.getElementById('demo-team-groups');groups.replaceChildren();status.textContent='กำลังโหลดกะทั้งทีม…';document.getElementById('demo-day-caption').textContent=new Date(date+'T12:00:00').toLocaleDateString('th-TH',{weekday:'long',day:'numeric',month:'short'});document.getElementById('detail-date').textContent=new Date(date+'T12:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric'});
 try{const response=await fetch('api.php?action=team_day&day='+encodeURIComponent(date)+demoQuery,{cache:'no-store',signal:controller.signal});const result=await response.json();if(!response.ok)throw Error(result.error||'โหลดข้อมูลไม่ได้');if(current!==version||!dialog.open)return;
 status.textContent=!result.published?'ยังไม่มีตารางเผยแพร่สำหรับเดือนนี้':!result.members.length?'ยังไม่มีข้อมูลกะของสมาชิกในวันนี้':`สมาชิก ${result.members.length} คน · ตารางฉบับที่ ${result.published.revision}`;
 if(!result.published||!result.members.length)return;
 const work=document.createElement('div');work.className='demo-work-grid';groups.append(work);
 for(const code of ['D','E','L','N']){const members=result.members.filter(p=>p.code===code);if(members.length)work.append(group(code,members));}
 const off=result.members.filter(p=>['R','PH','AL','BL'].includes(p.code));
 const offSection=document.createElement('details');offSection.className='demo-off';const summary=document.createElement('summary');summary.textContent='วันหยุด / ลา · '+off.length+' คน';offSection.append(summary);for(const code of ['R','PH','AL','BL']){const members=off.filter(p=>p.code===code);if(members.length)offSection.append(group(code,members));}if(off.length)groups.append(offSection);
 }catch(error){if(current===version&&error.name!=='AbortError')status.textContent=error.message;}}
 function group(code,members){const section=document.createElement('section');section.className='demo-shift-group code-'+code;const heading=document.createElement('h3');heading.textContent=code+' · '+labels[code];const count=document.createElement('small');count.textContent=members.length+' คน';heading.append(count);section.append(heading);if(!members.length){const empty=document.createElement('p');empty.className='demo-empty';empty.textContent='ไม่มีสมาชิกในกะนี้';section.append(empty);}for(const person of members){const item=document.createElement('div');item.className='demo-member';const name=document.createElement('span');name.textContent=person.name;if(person.employee===data?.person.employee){item.classList.add('demo-self');name.append(document.createTextNode(' · คุณ'));}item.append(avatar(person),name);section.append(item);}return section;}
 function move(delta){const next=new Date(date+'T12:00:00');next.setDate(next.getDate()+delta);const year=next.getFullYear();if(year<2000||year>2099)return;date=year+'-'+String(next.getMonth()+1).padStart(2,'0')+'-'+String(next.getDate()).padStart(2,'0');loadTeam();}
 document.getElementById('demo-prev').onclick=()=>move(-1);document.getElementById('demo-next').onclick=()=>move(1);
 dialog.addEventListener('close',()=>{version++;controller?.abort();});

 const calendarTabs=document.createElement('div');calendarTabs.className='demo-calendar-tabs';calendarTabs.setAttribute('role','group');calendarTabs.setAttribute('aria-label','มุมมองปฏิทิน');
 calendarTabs.innerHTML='<button type="button" id="demo-calendar-own" aria-pressed="true">กะของฉัน</button><button type="button" id="demo-calendar-team" aria-pressed="false">กะทั้งทีม</button>';
 const calendarHead=document.querySelector('.calendar-head');calendarHead.before(calendarTabs);
 const teamCalendar=document.createElement('div');teamCalendar.className='calendar demo-team-calendar';teamCalendar.hidden=true;teamCalendar.setAttribute('aria-label','ปฏิทินกะทั้งทีม');
 const teamMonthStatus=document.createElement('p');teamMonthStatus.className='demo-month-status';teamMonthStatus.setAttribute('role','status');teamMonthStatus.hidden=true;calendarHead.after(teamMonthStatus);
 document.getElementById('calendar').after(teamCalendar);
 let teamMode=false,monthVersion=0,monthController=null;
 const originalRender=render;
 render=month=>{originalRender(month);applyCalendarMode();};
 function applyCalendarMode(){document.getElementById('calendar').hidden=teamMode;teamCalendar.hidden=!teamMode;teamMonthStatus.hidden=!teamMode;document.getElementById('demo-calendar-own').setAttribute('aria-pressed',String(!teamMode));document.getElementById('demo-calendar-team').setAttribute('aria-pressed',String(teamMode));document.querySelector('.calendar-head .eyebrow').textContent=teamMode?'ปฏิทินกะทั้งทีม':'ปฏิทินกะของฉัน';document.querySelector('.calendar-hint').textContent=teamMode?'D/E/L/N แสดงจำนวนคน · แตะวันที่เพื่อดูรายชื่อทั้งทีม':'แตะวันที่เพื่อดูค่ากะและเพื่อนร่วมกะ';if(teamMode)loadTeamMonth();else{monthVersion++;monthController?.abort();}}
 document.getElementById('demo-calendar-own').onclick=()=>{teamMode=false;applyCalendarMode();};document.getElementById('demo-calendar-team').onclick=()=>{teamMode=true;applyCalendarMode();};
 async function loadTeamMonth(){const current=++monthVersion;const month=document.getElementById('month').value;monthController?.abort();monthController=new AbortController();teamCalendar.replaceChildren();teamMonthStatus.textContent='กำลังโหลดภาพรวมทั้งเดือน…';
 try{const response=await fetch('api.php?action=team_month&month='+encodeURIComponent(month)+demoQuery,{cache:'no-store',signal:monthController.signal});const result=await response.json();if(!response.ok)throw Error(result.error||'โหลดภาพรวมไม่ได้');if(current!==monthVersion||!teamMode||month!==document.getElementById('month').value)return;
 teamMonthStatus.textContent=result.published?'จำนวนคนในแต่ละกะ · ตารางฉบับที่ '+result.published.revision:'ยังไม่มีตารางเผยแพร่สำหรับเดือนนี้';
 const today=new Date(),todayKey=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');const [year,m]=month.split('-').map(Number),offset=(new Date(year,m-1,1).getDay()+6)%7;for(let i=0;i<offset;i++)teamCalendar.append(document.createElement('div'));
 for(let day=1;day<=new Date(year,m,0).getDate();day++){const key=month+'-'+String(day).padStart(2,'0'),records=result.counts.filter(r=>r.day===key);const occupied=records.some(r=>['D','E','L','N'].includes(r.code)&&Number(r.people)>0);if(!occupied){const blank=document.createElement('div');blank.className='demo-empty-date';if(key===todayKey){blank.classList.add('today');blank.setAttribute('aria-current','date');blank.setAttribute('aria-label',day+' วันนี้');}const number=document.createElement('span');number.textContent=day;blank.append(number);teamCalendar.append(blank);continue;}const button=document.createElement('button');button.type='button';button.className='day demo-team-day';if(key===todayKey){button.classList.add('today');button.setAttribute('aria-current','date');}button.setAttribute('aria-label',day+' ดูกะทั้งทีม');const number=document.createElement('span');number.textContent=day;button.append(number);
 if(!records.length){const empty=document.createElement('small');empty.textContent='—';empty.title='ยังไม่มีข้อมูลกะวันนี้';button.append(empty);}else for(const code of ['D','E','L','N']){const count=Number(records.find(r=>r.code===code)?.people||0);if(!count)continue;const badge=document.createElement('span');badge.className='demo-count code-'+code;badge.textContent=code+' '+count;badge.setAttribute('aria-label',code+' '+count+' คน');button.append(badge);}
 button.onclick=()=>{const row=data?.rows.find(r=>r.day===key);detail(key,row,data?.peers.filter(p=>p.day===key)||[]);switchTab(true);};teamCalendar.append(button);}
 }catch(error){if(current===monthVersion&&error.name!=='AbortError')teamMonthStatus.textContent=error.message;}}
 if(localDemo){const note=document.createElement('p');note.className='demo-banner';note.textContent='เดโมตารางจริง · กันยายน 2026 · 10 คน / 300 กะ · ข้อมูลแยกจากฐานข้อมูล · เวลาเผยแพร่เป็นค่าประกอบเดโม';document.querySelector('.intro').append(note);}
})();
