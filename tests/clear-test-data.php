<?php
declare(strict_types=1);
$config=require dirname(__DIR__).'/private/config.php';
if($config['dsn']!=='mysql:host=127.0.0.1;port=33316;dbname=shifttrack_new;charset=utf8mb4')throw new RuntimeException('Local test database only');
$pdo=new PDO($config['dsn'],$config['user'],$config['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$people=$pdo->query('SELECT employee,name FROM employees')->fetchAll(PDO::FETCH_ASSOC);
foreach($people as $p)if(!in_array($p['employee'],['001','002'],true)||$p['name']!=='Test '.$p['employee'])throw new RuntimeException('Non-test data found; stop');
$pdo->beginTransaction();
$pdo->exec('DELETE FROM shifts');$pdo->exec('DELETE FROM rosters');$pdo->exec('DELETE FROM employees');$pdo->exec('DELETE FROM login_limits');
$pdo->commit();
echo "Local test records cleared; roster and employees empty.\n";
