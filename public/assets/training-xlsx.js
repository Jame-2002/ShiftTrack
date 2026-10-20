(() => {
 const MAX_XML=24*1024*1024;
 const key=value=>String(value??'').trim();
 function xml(bytes){const doc=new DOMParser().parseFromString(new TextDecoder().decode(bytes),'application/xml');if(doc.querySelector('parsererror'))throw Error('โครงสร้าง Excel ไม่ถูกต้อง');return doc;}
 async function unzip(file){
  if(file.size>5*1024*1024)throw Error('ไฟล์ Excel ต้องไม่เกิน 5 MB');
  const bytes=new Uint8Array(await file.arrayBuffer()),view=new DataView(bytes.buffer);let end=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(view.getUint32(i,true)===0x06054b50){end=i;break;}
  if(end<0)throw Error('เลือกไฟล์ .xlsx ที่ไม่เข้ารหัส');
  const count=view.getUint16(end+10,true);if(count>600)throw Error('ไฟล์มีส่วนประกอบมากเกินไป');
  let offset=view.getUint32(end+16,true),total=0;const entries=new Map();
  for(let i=0;i<count;i++){
   if(offset+46>bytes.length||view.getUint32(offset,true)!==0x02014b50)throw Error('ไฟล์ ZIP ไม่สมบูรณ์');
   const flags=view.getUint16(offset+8,true),method=view.getUint16(offset+10,true),packed=view.getUint32(offset+20,true),size=view.getUint32(offset+24,true),n=view.getUint16(offset+28,true),extra=view.getUint16(offset+30,true),comment=view.getUint16(offset+32,true),local=view.getUint32(offset+42,true);
   const name=new TextDecoder().decode(bytes.subarray(offset+46,offset+46+n));offset+=46+n+extra+comment;total+=size;
   if(total>MAX_XML||size>12*1024*1024||flags&1||name.includes('..')||entries.has(name))throw Error('ไฟล์ใหญ่เกินไป เข้ารหัส หรือมีโครงสร้างซ้ำ');
   entries.set(name,{local,method,packed,size});
  }
  return async name=>{
   const e=entries.get(name);if(!e)return null;const p=e.local;
   if(p+30>bytes.length||view.getUint32(p,true)!==0x04034b50)throw Error('ไฟล์ Excel ไม่สมบูรณ์');
   const start=p+30+view.getUint16(p+26,true)+view.getUint16(p+28,true);if(start+e.packed>bytes.length)throw Error('ไฟล์ Excel ไม่สมบูรณ์');
   let result=bytes.subarray(start,start+e.packed);
   if(e.method===8){const reader=new Blob([result]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader(),chunks=[];let length=0;while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>e.size||length>MAX_XML){await reader.cancel();throw Error('ขนาดข้อมูลหลังแตกไฟล์ไม่ถูกต้อง');}chunks.push(value);}result=new Uint8Array(length);let pos=0;for(const chunk of chunks){result.set(chunk,pos);pos+=chunk.length;}}
   else if(e.method!==0)throw Error('รูปแบบบีบอัดไม่รองรับ');
   if(result.length!==e.size)throw Error('ขนาดข้อมูล Excel ไม่ถูกต้อง');return result;
  };
 }
 window.parseTrainingWorkbook=async file=>{
  if(!/\.xlsx$/i.test(file.name))throw Error('รองรับไฟล์ .xlsx เท่านั้น');
  const read=await unzip(file),bookBytes=await read('xl/workbook.xml'),relBytes=await read('xl/_rels/workbook.xml.rels');if(!bookBytes||!relBytes)throw Error('ไม่พบสมุดงาน Excel');
  const book=xml(bookBytes),rels=xml(relBytes),epoch=book.querySelector('workbookPr')?.getAttribute('date1904');
  const stringsBytes=await read('xl/sharedStrings.xml');const strings=stringsBytes?[...xml(stringsBytes).getElementsByTagName('si')].map(el=>[...el.getElementsByTagName('t')].map(t=>t.textContent).join('')):[];
  const styleBytes=await read('xl/styles.xml'),styles=styleBytes?xml(styleBytes):null;
  const formats=new Map(styles?[...styles.getElementsByTagName('numFmt')].map(el=>[el.getAttribute('numFmtId'),el.getAttribute('formatCode')]):[]);
  const styleFormats=styles?[...styles.getElementsByTagName('cellXfs')[0]?.children??[]].map(el=>formats.get(el.getAttribute('numFmtId'))||''):[];
  async function sheet(name){const s=[...book.getElementsByTagName('sheet')].find(el=>el.getAttribute('name')===name);if(!s)throw Error('ไม่พบชีต '+name);const id=s.getAttribute('r:id');const rel=[...rels.getElementsByTagName('Relationship')].find(el=>el.getAttribute('Id')===id);if(!rel||rel.getAttribute('TargetMode')==='External')throw Error('ชีตไม่ถูกต้อง');const target=rel.getAttribute('Target');const path=target.startsWith('/')?target.slice(1):'xl/'+target;if(path.includes('..'))throw Error('เส้นทางชีตไม่ถูกต้อง');const content=await read(path);if(!content)throw Error('ไม่พบข้อมูลชีต');const rows=[];
   for(const r of xml(content).getElementsByTagName('row')){if(rows.length>5000)throw Error('จำนวนแถวมากเกินไป');const row=[];for(const c of r.getElementsByTagName('c')){const ref=c.getAttribute('r')||'',letters=ref.match(/^[A-Z]+/)?.[0];if(!letters)continue;let col=0;for(const letter of letters)col=col*26+letter.charCodeAt(0)-64;if(col>100)continue;const type=c.getAttribute('t'),v=c.getElementsByTagName('v')[0]?.textContent??'';let value=type==='s'?strings[Number(v)]:type==='inlineStr'?[...c.getElementsByTagName('t')].map(t=>t.textContent).join(''):v;if((!type||type==='n')&&value!==''&&Number.isSafeInteger(Number(value)))value=String(Number(value));const format=styleFormats[Number(c.getAttribute('s')||0)];if((!type||type==='n')&&/^0+$/.test(format)&&/^\d+$/.test(value))value=value.padStart(format.length,'0');row[col-1]=value;}rows.push(row);}return rows;
  }
  function date(value){if(!key(value)||/^TBC\b/i.test(key(value)))return null;if(/^\d+(\.\d+)?$/.test(value)){const serial=Number(value);if(serial<1||serial>80000)throw Error('วันที่ Excel เกินช่วงที่รองรับ');return new Date(Date.UTC(epoch==='1'||epoch==='true'?1904:1899,epoch==='1'||epoch==='true'?0:11,epoch==='1'||epoch==='true'?1:30)+Math.floor(serial)*86400000).toISOString().slice(0,10);}if(/^20\d{2}-\d{2}-\d{2}$/.test(value))return value;throw Error('วันที่ไม่รองรับ '+key(value));}
  function time(value){if(!key(value)||/^TBC\b/i.test(key(value)))return null;if(/^\d*\.?\d+$/.test(value)&&Number(value)<1){const minutes=Math.round(Number(value)*1440);if(minutes<0||minutes>=1440)throw Error('เวลาไม่ถูกต้อง');return String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');}const named=key(value).match(/^(\d{1,2})[.:](\d{2})(?::\d{2})?(?:\s*hr)?$/i);if(named){const h=Number(named[1]),m=Number(named[2]);if(h<24&&m<60)return String(h).padStart(2,'0')+':'+named[2];}throw Error('เวลาไม่รองรับ');}
  function records(rows,required){const header=rows[0]?.map(key)||[];for(const field of required)if(!header.includes(field))throw Error('ไม่พบคอลัมน์ '+field);return rows.slice(1).map((row,i)=>({line:i+2,...Object.fromEntries(header.map((h,c)=>[h,row[c]??'']))}));}
  const schedule=records(await sheet('ScheduleDB'),['ScheduleID','EventID','TraineeID','StartDate','EndDate']);
  const eventsSource=records(await sheet('EventDB'),['EventID','Module Name','StartDate','EndDate']);
  const lookup=new Map(),blocked=new Set(),issues=[];
  for(const r of eventsSource){const id=key(r.EventID);if(!id)continue;try{const event={event_id:id,module_id:key(r.ModuleID),title:key(r['Module Name']),start_date:date(r.StartDate),end_date:date(r.EndDate),start_time:time(r.StartTime),end_time:time(r.EndTime),room:key(r.Room)};if(Boolean(event.start_date)!==Boolean(event.end_date)||event.start_date&&event.end_date<event.start_date)throw Error('วันเริ่มและสิ้นสุดไม่ถูกต้อง');if(event.start_time&&event.end_time&&event.end_time<=event.start_time)throw Error('เวลาสิ้นสุดต้องหลังเวลาเริ่ม');if(lookup.has(id)&&JSON.stringify(lookup.get(id))!==JSON.stringify(event)){blocked.add(id);issues.push('EventDB: '+id+' มีข้อมูลขัดแย้ง กรุณาแก้ Excel ก่อนนำเข้ารอบนี้');}else lookup.set(id,event);}catch(error){blocked.add(id);issues.push('EventDB แถว '+r.line+': '+error.message);}}
  const grouped=new Map(),scheduleIds=new Set(),memberKeys=new Set();
  for(const r of schedule){if(!key(r.ScheduleID))continue;const id=key(r.EventID),employee=key(r.TraineeID);if(scheduleIds.has(key(r.ScheduleID))){issues.push('ScheduleID ซ้ำ '+key(r.ScheduleID));continue;}scheduleIds.add(key(r.ScheduleID));if(blocked.has(id))continue;const source=lookup.get(id);if(!source){issues.push('ไม่พบ EventID '+id);continue;}try{const start=date(r.StartDate),end=date(r.EndDate);if(start!==source.start_date||end!==source.end_date){issues.push('วันที่ไม่ตรงกันใน '+key(r.ScheduleID));continue;}const memberKey=id+'|'+employee;if(memberKeys.has(memberKey)){issues.push('ผู้เข้าร่วมซ้ำ '+memberKey);continue;}memberKeys.add(memberKey);if(!grouped.has(id))grouped.set(id,{...source,participants:[]});grouped.get(id).participants.push({employee,schedule_id:key(r.ScheduleID),status:key(r.Status)});}catch(error){issues.push('ScheduleDB แถว '+r.line+': '+error.message);}}
  return {events:[...grouped.values()],issues};
 };
})();
