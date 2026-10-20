<?php
declare(strict_types=1);
define('SHIFTTRACK_TRAINING_TEST',true);
function employeeId(mixed $value): string {
    $value=trim((string)$value);
    if (!preg_match('/^[A-Za-z0-9_-]{1,20}$/D',$value)) throw new InvalidArgumentException('employee');
    return $value;
}
require dirname(__DIR__).'/private/training.php';
$checks=0;
function check(bool $condition,string $message): void { global $checks; $checks++; if (!$condition) throw new RuntimeException($message); }
function rejects(callable $callback,string $message): void {
    try { $callback(); } catch(InvalidArgumentException) { check(true,$message); return; }
    check(false,$message);
}
$event=['event_id'=>'EVT-10801','module_id'=>'COM','title'=>'Overview','start_date'=>'2026-10-26','end_date'=>'2026-10-27','start_time'=>'08:00','end_time'=>'17:00','room'=>'Room 19','participants'=>[['employee'=>'001','schedule_id'=>'S1','status'=>'Scheduled'],['employee'=>'999','schedule_id'=>'S2','status'=>'Scheduled']]];
$result=trainingNormalize([$event],['001'=>true],['EVT-10801'=>true]);
check($result['summary']===['events'=>1,'participants'=>1,'unknown'=>1,'protected'=>1],'Unknown members excluded and manual edits reported');
check($result['events'][0]['participants'][0]['employee']==='001','Leading zero preserved');
check($result['events'][0]['participants'][0]['status']==='Scheduled','Status preserved');
$unknown=$event; $unknown['start_date']=null; $unknown['end_date']=null;
check(trainingNormalize([$unknown],['001'=>true])['events'][0]['start_date']===null,'Pending date remains null');
rejects(fn()=>trainingNormalize([$event,$event],['001'=>true]),'Duplicate event rejected');
$bad=$event; $bad['end_date']='2026-10-01';
rejects(fn()=>trainingNormalize([$bad],['001'=>true]),'Reversed date rejected');
$bad=$event; $bad['start_date']='2026-02-30';
rejects(fn()=>trainingNormalize([$bad],['001'=>true]),'Invalid calendar date rejected');
$bad=$event; $bad['start_time']='25:00';
rejects(fn()=>trainingNormalize([$bad],['001'=>true]),'Invalid clock rejected');
$bad=$event; $bad['end_date']=null;
rejects(fn()=>trainingNormalize([$bad],['001'=>true]),'Partial date rejected');
$bad=$event; $bad['end_time']='07:00';
rejects(fn()=>trainingNormalize([$bad],['001'=>true]),'Reversed time rejected');
$bad=$event; $bad['participants'][]=['employee'=>'001','schedule_id'=>'different','status'=>'Scheduled'];
rejects(fn()=>trainingNormalize([$bad],['001'=>true]),'Conflicting participant rejected');
$bad=$event; $bad['participants']=array_fill(0,4001,$event['participants'][0]);
rejects(fn()=>trainingNormalize([$bad],['001'=>true]),'Participant bound enforced');
check(trainingNormalize([$event],[])['events']===[],'No implicit employee creation');
echo "Training validation: $checks checks passed\n";
