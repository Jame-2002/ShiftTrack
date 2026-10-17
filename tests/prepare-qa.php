<?php
declare(strict_types=1);
$config=require dirname(__DIR__).'/private/config.php';
if($config['dsn']!=='mysql:host=127.0.0.1;port=33316;dbname=shifttrack_new;charset=utf8mb4')throw new RuntimeException('Local QA only');
$pdo=new PDO('mysql:host=127.0.0.1;port=33316;charset=utf8mb4',$config['user'],$config['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$pdo->exec('CREATE DATABASE IF NOT EXISTS shifttrack_qa CHARACTER SET utf8mb4');
$pdo->exec('USE shifttrack_qa');
$pdo->exec(file_get_contents(dirname(__DIR__).'/database/schema.sql'));
$config['dsn']='mysql:host=127.0.0.1;port=33316;dbname=shifttrack_qa;charset=utf8mb4';
file_put_contents(dirname(__DIR__).'/private/config.qa.php',"<?php\nreturn ".var_export($config,true).";\n");
echo "QA database ready; user database unchanged.\n";
