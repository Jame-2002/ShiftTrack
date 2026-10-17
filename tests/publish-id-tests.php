<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') exit(1);

$source = in_array('--baseline', $argv, true)
    ? shell_exec('git show HEAD:public/api.php')
    : file_get_contents(dirname(__DIR__) . '/public/api.php');
$bootstrap = file_get_contents(dirname(__DIR__) . '/private/bootstrap.php');
$functionStart = strpos($bootstrap, 'function employeeId(');
$functionEnd = strpos($bootstrap, 'function monthValue(', $functionStart);
eval(substr($bootstrap, $functionStart, $functionEnd - $functionStart));

$start = strpos($source, '$known=array_column');
$end = strpos($source, 'db()->beginTransaction();', $start);
$validation = substr($source, $start, $end - $start);
$insertStart = strpos($source, '        foreach(', $end);
$insertEnd = strpos($source, "\n", $insertStart);
$insertion = substr($source, $insertStart, $insertEnd - $insertStart);
$inserted = [];
function query(string $sql, array $params = []): object
{
    global $inserted;
    if (str_starts_with($sql, 'INSERT INTO shifts')) $inserted[] = $params;
    return new class {
        public function fetchAll(): array { return [['employee'=>'001']]; }
    };
}

$month = '2026-10';
$rows = [['employee'=>' 001 ', 'date'=>'2026-10-01', 'code'=>'E']];
eval($validation);
eval($insertion);
if (($inserted[0][0] ?? null) !== '001') {
    fwrite(STDERR, "FAIL: validated employee ID must be normalized before insertion\n");
    exit(1);
}
$rows[] = ['employee'=>'001', 'date'=>'2026-10-01', 'code'=>'N'];
try {
    eval($validation);
    throw new RuntimeException('Duplicate normalized IDs were accepted');
} catch (InvalidArgumentException $error) {
    if (!str_contains($error->getMessage(), 'รายการซ้ำ')) throw $error;
}
echo "PASS: padded ID inserts canonical ID and normalized duplicates are rejected\n";
