<?php
declare(strict_types=1);

function trainingText(mixed $value, int $max, bool $required = false): string
{
    if (!is_string($value) && !is_int($value)) throw new InvalidArgumentException('รูปแบบข้อมูลอบรมไม่ถูกต้อง');
    $text = trim((string)$value);
    if (($required && $text === '') || mb_strlen($text) > $max) throw new InvalidArgumentException('ข้อความอบรมว่างหรือยาวเกินกำหนด');
    return $text;
}

function trainingDate(mixed $value): ?string
{
    if ($value === null || $value === '') return null;
    if (!is_string($value) || !preg_match('/^(20\d{2})-(\d{2})-(\d{2})$/D', $value, $m)
        || !checkdate((int)$m[2], (int)$m[3], (int)$m[1])) throw new InvalidArgumentException('วันที่อบรมต้องเป็น YYYY-MM-DD หรือเว้นว่าง');
    return $value;
}

function trainingTime(mixed $value): ?string
{
    if ($value === null || $value === '') return null;
    if (!is_string($value) || !preg_match('/^([01]\d|2[0-3]):[0-5]\d(?::00)?$/D', $value)) throw new InvalidArgumentException('เวลาอบรมต้องเป็น HH:MM');
    return substr($value, 0, 5);
}

function trainingFields(array $row): array
{
    $id = trainingText($row['event_id'] ?? '', 80, true);
    if (!preg_match('/^[A-Za-z0-9_.-]+$/D', $id)) throw new InvalidArgumentException('รหัสรอบอบรมไม่ถูกต้อง');
    $start = trainingDate($row['start_date'] ?? null);
    $end = trainingDate($row['end_date'] ?? null);
    if (($start === null) !== ($end === null)) throw new InvalidArgumentException('กรุณากำหนดวันเริ่มและวันสิ้นสุด หรือเว้นว่างทั้งสองวัน');
    if ($start && $end && $end < $start) throw new InvalidArgumentException('วันสิ้นสุดก่อนวันเริ่มอบรม');
    $startTime=trainingTime($row['start_time'] ?? null); $endTime=trainingTime($row['end_time'] ?? null);
    if ($startTime !== null && $endTime !== null && $endTime <= $startTime) throw new InvalidArgumentException('เวลาสิ้นสุดต้องหลังเวลาเริ่มอบรม');
    return ['event_id'=>$id, 'module_id'=>trainingText($row['module_id'] ?? '',100),
        'title'=>trainingText($row['title'] ?? '',500,true), 'start_date'=>$start, 'end_date'=>$end,
        'start_time'=>$startTime, 'end_time'=>$endTime,
        'room'=>trainingText($row['room'] ?? '',200)];
}

function trainingNormalize(mixed $rows, array $employees, array $protected = []): array
{
    if (!is_array($rows) || !array_is_list($rows) || count($rows) > 2000 || !$rows) throw new InvalidArgumentException('เลือกรอบอบรม 1–2000 รายการ');
    $events = []; $seen = []; $issues = []; $unknown = 0; $people = 0; $total = 0; $kept = 0;
    foreach ($rows as $raw) {
        if (!is_array($raw)) throw new InvalidArgumentException('รูปแบบรอบอบรมไม่ถูกต้อง');
        $event = trainingFields($raw); $id = $event['event_id'];
        if (isset($seen[$id])) throw new InvalidArgumentException('รหัสรอบอบรมซ้ำ ต้องเลือกข้อมูลรอบเดียว: '.$id);
        $seen[$id] = true;
        $participants = $raw['participants'] ?? [];
        if (!is_array($participants) || !array_is_list($participants)) throw new InvalidArgumentException('รายชื่อผู้เข้าอบรมไม่ถูกต้อง');
        $members = [];
        foreach ($participants as $person) {
            if (++$total > 4000) throw new InvalidArgumentException('ผู้เข้าอบรมรวมเกิน 4000 รายการ');
            if (!is_array($person)) throw new InvalidArgumentException('ข้อมูลผู้เข้าอบรมไม่ถูกต้อง');
            $employee = employeeId($person['employee'] ?? '');
            if (!isset($employees[$employee])) { $unknown++; $issues[] = $id.': ไม่พบสมาชิก '.$employee; continue; }
            $participant = ['employee'=>$employee,'schedule_id'=>trainingText($person['schedule_id'] ?? '',100),'status'=>trainingText($person['status'] ?? '',100)];
            if (isset($members[$employee]) && $members[$employee] !== $participant) throw new InvalidArgumentException('ข้อมูลผู้เข้าอบรมซ้ำขัดแย้ง: '.$employee);
            $members[$employee] = $participant;
        }
        if (!$members) { $issues[] = $id.': ไม่มีสมาชิกที่นำเข้าได้'; continue; }
        if (isset($protected[$id])) { $kept++; $issues[] = $id.': เก็บรายละเอียดที่แอดมินแก้ไว้'; }
        $event['participants'] = array_values($members); $people += count($members); $events[$id] = $event;
    }
    return ['events'=>array_values($events),'issues'=>array_values(array_unique($issues)),
        'summary'=>['events'=>count($events),'participants'=>$people,'unknown'=>$unknown,'protected'=>$kept]];
}

function trainingRevision(bool $lock): int
{
    $revision=query('SELECT revision FROM training_state WHERE id=1'.($lock ? ' FOR UPDATE' : ''))->fetchColumn();
    if ($revision === false || (int)$revision < 1) throw new RuntimeException('Training migration incomplete');
    return (int)$revision;
}

function trainingReviewReasons(array $event): array
{
    $missing=[];
    if(empty($event['start_date'])||empty($event['end_date']))$missing[]='วันเริ่ม / วันสิ้นสุด';
    if(empty($event['start_time'])||empty($event['end_time']))$missing[]='เวลาเริ่ม / เวลาสิ้นสุด';
    if(trim((string)($event['room']??''))==='')$missing[]='ห้องอบรม';
    return $missing;
}
if (defined('SHIFTTRACK_TRAINING_TEST')) return;

$trainingRead = ['training_list','training_admin'];
$trainingWrite = ['training_preview','training_import','training_update'];
if (!in_array($action,array_merge($trainingRead,$trainingWrite),true)) output(['error'=>'ไม่พบคำสั่ง'],404);
if ($_SERVER['REQUEST_METHOD'] !== (in_array($action,$trainingRead,true) ? 'GET' : 'POST')) output(['error'=>'Method not allowed'],405);
if ($action !== 'training_list') owner();

if ($action === 'training_list') {
    $id = employeeId($_GET['employee'] ?? '');
    $person=query('SELECT employee,name,avatar IS NOT NULL AS has_avatar FROM employees WHERE employee=? AND active=1',[$id])->fetch();
    if (!$person) output(['error'=>'ไม่พบรหัสพนักงานนี้'],404);
    $month = (string)($_GET['month'] ?? ''); $params = [$id]; $filter = '';
    if ($month !== '') {
        $month = monthValue($month); $next = date('Y-m-d',strtotime($month.'-01 +1 month'));
        $filter = ' AND (t.start_date IS NULL OR t.end_date IS NULL OR (t.start_date<? AND t.end_date>=?))';
        $params[]=$next; $params[]=$month.'-01';
    }
    $rows = query('SELECT t.*,p.status,(SELECT COUNT(*) FROM training_enrollments x WHERE x.event_id=t.event_id) AS participants FROM training_events t JOIN training_enrollments p ON p.event_id=t.event_id WHERE p.employee=?'.$filter.' ORDER BY t.start_date IS NULL,t.start_date,t.title',$params)->fetchAll();
    $dated=[]; $undated=[];
    foreach ($rows as $row) {
        if (trainingReviewReasons($row)) continue;
        if ($row['start_date'] === null || $row['end_date'] === null) $undated[]=$row;
        else $dated[]=$row;
    }
    output(['events'=>$dated,'undated'=>$undated,'month'=>$month,'person'=>$person]);
}
if ($action === 'training_admin') {
    query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ'); db()->beginTransaction();
    $events = query('SELECT * FROM training_events ORDER BY start_date IS NULL,start_date,title')->fetchAll();
    $members = query('SELECT p.*,e.name FROM training_enrollments p JOIN employees e ON e.employee=p.employee ORDER BY e.name')->fetchAll();
    $byEvent=[]; foreach($members as $member) $byEvent[$member['event_id']][]=$member;
    foreach($events as &$event) { $event['participants']=$byEvent[$event['event_id']] ?? []; $event['review_reasons']=trainingReviewReasons($event); }
    unset($event);
    $revision=trainingRevision(false); db()->commit();
    output(['events'=>$events,'revision'=>$revision]);
}
if ($action === 'training_preview' || $action === 'training_import') {
    if ($action === 'training_import' && ($input['reviewed'] ?? false) !== true) throw new InvalidArgumentException('กรุณาตรวจรายการก่อนเผยแพร่');
    db()->beginTransaction();
    $revision=trainingRevision(true);
    if ($action === 'training_import' && (!is_int($input['revision'] ?? null) || $input['revision'] !== $revision)) { db()->rollBack(); output(['error'=>'ข้อมูลเปลี่ยนแล้ว กรุณาตรวจรายการใหม่'],409); }
    $employees=array_fill_keys(query('SELECT employee FROM employees')->fetchAll(PDO::FETCH_COLUMN),true);
    $protected=array_fill_keys(query('SELECT event_id FROM training_events WHERE edited=1')->fetchAll(PDO::FETCH_COLUMN),true);
    $preview=trainingNormalize($input['events'] ?? null,$employees,$protected);
    if ($action === 'training_preview') { db()->commit(); output($preview+['revision'=>$revision]); }
    foreach($preview['events'] as $event) {
        $id=$event['event_id'];
        if (!isset($protected[$id])) {
            query('INSERT INTO training_events(event_id,module_id,title,start_date,end_date,start_time,end_time,room,updated_at) VALUES(?,?,?,?,?,?,?,?,UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE module_id=VALUES(module_id),title=VALUES(title),start_date=VALUES(start_date),end_date=VALUES(end_date),start_time=VALUES(start_time),end_time=VALUES(end_time),room=VALUES(room),revision=revision+1,updated_at=UTC_TIMESTAMP()',array_values(array_diff_key($event,['participants'=>true])));
        } else {
            query('UPDATE training_events SET revision=revision+1,updated_at=UTC_TIMESTAMP() WHERE event_id=?',[$id]);
        }
        foreach($event['participants'] as $person) query('INSERT INTO training_enrollments(event_id,employee,schedule_id,status) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE schedule_id=VALUES(schedule_id),status=VALUES(status)',[$id,$person['employee'],$person['schedule_id'],$person['status']]);
    }
    query('UPDATE training_state SET revision=revision+1 WHERE id=1'); db()->commit();
    output(['ok'=>true,'revision'=>$revision+1,'summary'=>$preview['summary'],'issues'=>$preview['issues']]);
}
if ($action === 'training_update') {
    db()->beginTransaction(); trainingRevision(true);
    $id=trainingText($input['event_id'] ?? '',80,true);
    $old=query('SELECT * FROM training_events WHERE event_id=? FOR UPDATE',[$id])->fetch();
    if (!$old) { db()->rollBack(); output(['error'=>'ไม่พบรอบอบรม'],404); }
    if (!is_int($input['revision'] ?? null) || $input['revision'] !== (int)$old['revision']) { db()->rollBack(); output(['error'=>'รายการถูกแก้ไขแล้ว กรุณาโหลดใหม่'],409); }
    $event=trainingFields(array_merge($input,['module_id'=>$old['module_id']]));
    query('UPDATE training_events SET title=?,start_date=?,end_date=?,start_time=?,end_time=?,room=?,revision=revision+1,edited=1,updated_at=UTC_TIMESTAMP() WHERE event_id=?',[$event['title'],$event['start_date'],$event['end_date'],$event['start_time'],$event['end_time'],$event['room'],$id]);
    query('INSERT INTO training_audit(event_id,changed_at,old_value,new_value) VALUES(?,UTC_TIMESTAMP(),?,?)',[$id,json_encode($old,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),json_encode($event,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
    query('UPDATE training_state SET revision=revision+1 WHERE id=1');
    $participants=(int)query('SELECT COUNT(*) FROM training_enrollments WHERE event_id=?',[$id])->fetchColumn(); db()->commit();
    output(['ok'=>true,'revision'=>(int)$old['revision']+1,'participants'=>$participants]);
}
