<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') exit(1);
$source = in_array('--baseline', $argv, true)
    ? shell_exec('git show HEAD:public/api.php')
    : file_get_contents(dirname(__DIR__) . '/public/api.php');
$start = strpos($source, "    if (\$action === 'roster') {");
$end = strpos($source, '    owner();', $start);
$controller = substr($source, $start, $end - $start);
$liveRevision = 1;
$connection = new class {
    public ?int $snapshot = null;
    public function beginTransaction(): void { global $liveRevision; $this->snapshot = $liveRevision; }
    public function commit(): void { $this->snapshot = null; }
};
function db(): object { global $connection; return $connection; }
function employeeId(mixed $value): string { return (string)$value; }
function monthValue(mixed $value): string { return (string)$value; }
function query(string $sql, array $params = []): object
{
    global $liveRevision;
    $version = db()->snapshot ?? $liveRevision;
    $value = [];
    if (str_contains($sql, 'SELECT employee,name')) $value = ['employee'=>'001','name'=>'Test'];
    if (str_contains($sql, 'SELECT s.day')) {
        $value = [['day'=>'2026-10-01','code'=>$version===1?'E':'N','label'=>'Test','amount'=>$version===1?80:100]];
        $liveRevision = 2;
    }
    if (str_contains($sql, 'SELECT b.day')) $value = [['day'=>'2026-10-01','employee'=>$version===1?'002':'003','name'=>'Peer']];
    if (str_contains($sql, 'SELECT revision,published_at')) $value = ['revision'=>$version,'published_at'=>'2026-10-01 00:00:00'];
    return new class($value) {
        public function __construct(private array $value) {}
        public function fetch(): array { return $this->value; }
        public function fetchAll(): array { return $this->value; }
    };
}
class CompletedResponse extends RuntimeException
{
    public function __construct(public array $body) { parent::__construct('response'); }
}
function output(array $body, int $status = 200): never { throw new CompletedResponse($body); }
$action = 'roster';
$_GET = ['employee'=>'001','month'=>'2026-10'];
try {
    eval($controller);
    throw new RuntimeException('Missing roster response');
} catch (CompletedResponse $response) {
    $body = $response->body;
    if ($body['rows'][0]['code']!=='E' || $body['peers'][0]['employee']!=='002' || $body['published']['revision']!==1 || $body['total']!=80) {
        fwrite(STDERR,"FAIL: roster response mixed versions during concurrent publication\n");
        exit(1);
    }
    if (db()->snapshot!==null) throw new RuntimeException('Read transaction was not closed');
}
echo "PASS: roster, allowance, peers and revision stay consistent across a simulated concurrent publication\n";
