<?php
declare(strict_types=1);
$fixture = json_decode(file_get_contents(__DIR__.'/real-team-demo.json'),true,32,JSON_THROW_ON_ERROR);
$fixtureRows = $fixture['rows'];
$published = ['revision'=>1,'published_at'=>'2026-09-01 00:00:00'];
if ($action === 'team_day') {
    $day = (string)($_GET['day'] ?? '');
    if (!preg_match('/^(20\d{2})-(\d{2})-(\d{2})$/D',$day,$parts) || !checkdate((int)$parts[2],(int)$parts[3],(int)$parts[1])) throw new InvalidArgumentException('วันที่ไม่ถูกต้อง');
    $members = array_values(array_filter($fixtureRows,fn($row)=>$row['day']===$day));
    output(['day'=>$day,'published'=>substr($day,0,7)===$fixture['month']?$published:null,'members'=>$members]);
}
if ($action === 'team_month') {
    $month = monthValue($_GET['month'] ?? '');
    $counts = [];
    foreach ($fixtureRows as $row) if (str_starts_with($row['day'],$month.'-')) {
        $key = $row['day'].':'.$row['code'];
        $counts[$key] ??= ['day'=>$row['day'],'code'=>$row['code'],'people'=>0];
        $counts[$key]['people']++;
    }
    output(['month'=>$month,'published'=>$month===$fixture['month']?$published:null,'counts'=>array_values($counts)]);
}
$id = employeeId($_GET['employee'] ?? '');
$month = monthValue($_GET['month'] ?? '');
$personRows = array_values(array_filter($fixtureRows,fn($row)=>$row['employee']===$id));
if (!$personRows) output(['error'=>'ไม่พบรหัสพนักงานในตารางเดโมจริง'],404);
$person = array_intersect_key($personRows[0],array_flip(['employee','name','has_avatar']));
$labels = ['D'=>'กะกลางวัน','E'=>'กะ E','L'=>'กะ L','N'=>'กะกลางคืน','R'=>'วันหยุด','PH'=>'วันหยุดสำคัญ','AL'=>'ลาพักร้อน','BL'=>'ลากิจ'];
$rates = ['E'=>80,'L'=>80,'N'=>100];
$rows=[];$peers=[];$total=0;
foreach ($personRows as $row) if (str_starts_with($row['day'],$month.'-')) {
    $amount=$rates[$row['code']]??0;$total+=$amount;
    $rows[]=['day'=>$row['day'],'code'=>$row['code'],'label'=>$labels[$row['code']],'amount'=>$amount];
    if (in_array($row['code'],['D','E','L','N'],true)) foreach ($fixtureRows as $peer) if ($peer['day']===$row['day'] && $peer['code']===$row['code']) $peers[] = array_intersect_key($peer,array_flip(['day','employee','name','has_avatar']));
}
output(['person'=>$person,'rows'=>$rows,'peers'=>$peers,'total'=>$total,'published'=>$month===$fixture['month']?$published:null]);
