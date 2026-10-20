<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') exit(1);
$root=dirname(__DIR__);
$config=require $root.'/private/config.php';
if (!str_contains($config['dsn'],'host=127.0.0.1') && !str_contains($config['dsn'],'host=localhost')) throw new RuntimeException('Local database only');
$pdo=new PDO($config['dsn'],$config['user'],$config['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$pdo->exec(file_get_contents($root.'/database/training.sql'));
echo "Training tables installed in local database. Existing shifts unchanged.\n";
