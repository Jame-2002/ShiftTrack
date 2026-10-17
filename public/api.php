<?php
declare(strict_types=1);
// Prefer the private sibling during development; shared hosting may use a denied folder.
$bootstrap = dirname(__DIR__) . '/private/bootstrap.php';
if (!is_file($bootstrap)) $bootstrap = __DIR__ . '/private/bootstrap.php';
require $bootstrap;
try {
    $action = $_GET['action'] ?? 'session';
    $input = [];
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!hash_equals($_SESSION['csrf'], $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) output(['error' => 'คำขอหมดอายุ กรุณาโหลดหน้าใหม่'], 403);
        $raw = file_get_contents('php://input');
        if (strlen($raw) > 2_000_000) output(['error' => 'ข้อมูลใหญ่เกินไป'], 413);
        $input = str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') ? json_decode($raw, true, 32, JSON_THROW_ON_ERROR) : $_POST;
    }
    $writeActions = ['login','logout','employee','rates','publish'];
    if (in_array($action, $writeActions, true) && $_SERVER['REQUEST_METHOD'] !== 'POST') output(['error' => 'Method not allowed'], 405);
    if ($action === 'session') output(['csrf' => $_SESSION['csrf'], 'owner' => !empty($_SESSION['owner']) && time() - ($_SESSION['seen'] ?? 0) <= 1800]);
    if ($action === 'login') {
        $ip = hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown');
        query('INSERT IGNORE INTO login_limits(ip_hash,started_at) VALUES(?,?)', [$ip,time()]);
        query('UPDATE login_limits SET failures=0,started_at=? WHERE ip_hash=? AND started_at<?', [time(),$ip,time()-900]);
        $limit = query('SELECT * FROM login_limits WHERE ip_hash=?', [$ip])->fetch();
        if ($limit['failures'] >= 5) output(['error' => 'ลองเข้าสู่ระบบมากเกินไป กรุณารอ 15 นาที'], 429);
        if (!password_verify((string)($input['password'] ?? ''), $config['admin_hash'])) {
            query('UPDATE login_limits SET failures=failures+1 WHERE ip_hash=?', [$ip]);
            output(['error' => 'รหัสผ่านผู้ดูแลไม่ถูกต้อง'], 401);
        }
        query('DELETE FROM login_limits WHERE ip_hash=?', [$ip]);
        session_regenerate_id(true);
        $_SESSION['owner'] = true; $_SESSION['seen'] = time();
        output(['ok' => true]);
    }
    if ($action === 'logout') {
        $_SESSION = []; session_regenerate_id(true);
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        output(['ok' => true]);
    }
    if ($action === 'avatar') {
        $id = employeeId($_GET['employee'] ?? '');
        $person = query('SELECT avatar,avatar_type FROM employees WHERE employee=? AND active=1', [$id])->fetch();
        if (!$person || !$person['avatar']) { http_response_code(404); exit; }
        header('Content-Type: ' . $person['avatar_type']);
        echo $person['avatar']; exit;
    }
    if ($action === 'roster') {
        $id = employeeId($_GET['employee'] ?? ''); $month = monthValue($_GET['month'] ?? '');
        $person = query('SELECT employee,name,avatar IS NOT NULL AS has_avatar FROM employees WHERE employee=? AND active=1', [$id])->fetch();
        if (!$person) output(['error' => 'ไม่พบรหัสพนักงานนี้'],404);
        $start = $month . '-01'; $end = date('Y-m-d', strtotime($start . ' +1 month'));
        $rows = query('SELECT s.day,s.code,t.label,t.amount FROM shifts s JOIN shift_types t ON t.code=s.code WHERE s.employee=? AND s.day>=? AND s.day<? ORDER BY s.day', [$id,$start,$end])->fetchAll();
        $peers = query("SELECT b.day,e.employee,e.name,e.avatar IS NOT NULL AS has_avatar FROM shifts a JOIN shifts b ON a.day=b.day AND a.code=b.code JOIN employees e ON e.employee=b.employee AND e.active=1 WHERE a.employee=? AND a.day>=? AND a.day<? AND a.code IN ('D','E','L','N') ORDER BY b.day,e.name", [$id,$start,$end])->fetchAll();
        $total = 0; $complete = true;
        foreach ($rows as $row) { if ($row['amount'] === null) $complete = false; else $total += (int)round((float)$row['amount']*100); }
        output(['person'=>$person,'rows'=>$rows,'peers'=>$peers,'total'=>$complete ? $total/100 : null,'published'=>query('SELECT revision,published_at FROM rosters WHERE month=?',[$month])->fetch() ?: null]);
    }
    owner();
    if ($action === 'admin') {
        output(['employees'=>query('SELECT employee,name,active,avatar IS NOT NULL AS has_avatar FROM employees ORDER BY name')->fetchAll(),'rates'=>query('SELECT * FROM shift_types ORDER BY code')->fetchAll()]);
    }
    if ($action === 'employee') {
        $id = employeeId($input['employee'] ?? ''); $name = trim((string)($input['name'] ?? ''));
        if ($name === '' || mb_strlen($name) > 100) throw new InvalidArgumentException('ตรวจชื่อสมาชิก');
        $active = !empty($input['active']) ? 1 : 0;
        $avatar = null; $type = null;
        if (!empty($input['avatar'])) {
            if (!preg_match('#^data:(image/(?:jpeg|png|webp));base64,(.+)$#D', $input['avatar'], $matches)) throw new InvalidArgumentException('รูปต้องเป็น JPEG PNG หรือ WebP');
            $avatar = base64_decode($matches[2], true);
            $info = $avatar === false ? false : getimagesizefromstring($avatar);
            if (!$info || strlen($avatar)>200000 || $info[0]>512 || $info[1]>512 || $info['mime'] !== $matches[1]) throw new InvalidArgumentException('รูปไม่ถูกต้องหรือใหญ่เกินไป');
            $type = $info['mime'];
        }
        query('INSERT INTO employees(employee,name,active) VALUES(?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),active=VALUES(active)',[$id,$name,$active]);
        if ($avatar !== null || !empty($input['remove_avatar'])) query('UPDATE employees SET avatar=?,avatar_type=? WHERE employee=?',[$avatar,$type,$id]);
        output(['ok'=>true]);
    }
    if ($action === 'rates') {
        db()->beginTransaction();
        foreach ($input['rates'] ?? [] as $rate) {
            if (!in_array($rate['code'] ?? '', ['D','E','L','N','R','PH','AL','BL'],true)) throw new InvalidArgumentException('รหัสกะไม่ถูกต้อง');
            $amount = $rate['amount'] ?? null;
            if ($amount !== null && (!preg_match('/^\d{1,6}(\.\d{1,2})?$/D',(string)$amount))) throw new InvalidArgumentException('ค่ากะต้องเป็นจำนวนเงินตั้งแต่ 0 ไม่เกิน 999999.99');
            query('UPDATE shift_types SET amount=? WHERE code=?',[$amount,$rate['code']]);
        }
        db()->commit(); output(['ok'=>true]);
    }
    if ($action === 'draft') {
        $month=monthValue($_GET['month'] ?? '');
        output(['revision'=>(int)(query('SELECT revision FROM rosters WHERE month=?',[$month])->fetchColumn() ?: 0),'rows'=>query('SELECT s.employee,e.name,s.day AS date,s.code FROM shifts s JOIN employees e ON e.employee=s.employee WHERE s.day>=? AND s.day<? ORDER BY s.employee,s.day',[$month.'-01',date('Y-m-d',strtotime($month.'-01 +1 month'))])->fetchAll()]);
    }
    if ($action === 'publish') {
        $month = monthValue($input['month'] ?? ''); $rows=$input['rows'] ?? [];
        if (empty($input['reviewed']) || !is_array($rows) || count($rows)<1 || count($rows)>3000) throw new InvalidArgumentException('ตรวจตารางและยืนยันก่อนเผยแพร่');
        $known=array_column(query('SELECT employee FROM employees WHERE active=1')->fetchAll(),'employee');
        $seen=[];
        foreach ($rows as $row) {
            $id=employeeId($row['employee'] ?? ''); $day=(string)($row['date'] ?? '');
            if (!in_array($id,$known,true)) throw new InvalidArgumentException('รหัส '.$id.' ยังไม่มีในสมาชิกที่เปิดใช้งาน');
            if (!preg_match('/^'.preg_quote($month,'/').'-(\d{2})$/D',$day,$m) || !checkdate((int)substr($month,5,2),(int)$m[1],(int)substr($month,0,4))) throw new InvalidArgumentException('วันที่ไม่ตรงกับเดือน');
            if (!in_array($row['code'] ?? '',['D','E','L','N','R','PH','AL','BL'],true)) throw new InvalidArgumentException('มีกะไม่ชัดเจน กรุณาตรวจแก้');
            $key=$id.':'.$day; if(isset($seen[$key])) throw new InvalidArgumentException('รายการซ้ำ '.$key); $seen[$key]=true;
        }
        db()->beginTransaction();
        query('INSERT IGNORE INTO rosters(month,revision,published_at) VALUES(?,0,UTC_TIMESTAMP())',[$month]);
        $revision=(int)query('SELECT revision FROM rosters WHERE month=? FOR UPDATE',[$month])->fetchColumn();
        if($revision !== (int)($input['revision'] ?? -1)) { db()->rollBack(); output(['error'=>'มีการเผยแพร่เดือนนี้ระหว่างที่แก้ไข กรุณาโหลดตารางล่าสุด'],409); }
        query('DELETE FROM shifts WHERE day>=? AND day<?',[$month.'-01',date('Y-m-d',strtotime($month.'-01 +1 month'))]);
        foreach($rows as $row) query('INSERT INTO shifts(employee,day,code) VALUES(?,?,?)',[$row['employee'],$row['date'],$row['code']]);
        query('UPDATE rosters SET revision=revision+1,published_at=UTC_TIMESTAMP() WHERE month=?',[$month]);
        db()->commit(); output(['ok'=>true]);
    }
    output(['error'=>'ไม่พบคำสั่ง'],404);
} catch (InvalidArgumentException | JsonException $e) {
    if (isset($config) && db()->inTransaction()) db()->rollBack();
    output(['error'=>$e->getMessage()],422);
} catch (Throwable $e) {
    if (isset($config)) { try { if(db()->inTransaction()) db()->rollBack(); } catch(Throwable) {} }
    error_log('ShiftTrack: '.$e->getMessage());
    output(['error'=>'ระบบยังไม่พร้อม กรุณาตรวจการติดตั้งหรือติดต่อผู้ดูแล'],503);
}


