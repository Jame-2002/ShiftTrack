<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
$destination=getenv('SHIFTTRACK_CONFIG_DESTINATION');
$owner=getenv('SHIFTTRACK_OWNER_PASSWORD');
$mysql=getenv('SHIFTTRACK_MYSQL_PASSWORD');
if(!$destination||!$owner||strlen($owner)<12||!$mysql)throw new RuntimeException('Missing values');
$config=['dsn'=>'mysql:host=sql206.byethost9.com;dbname=b9_43121649_shifttrack;charset=utf8mb4','user'=>'b9_43121649','password'=>$mysql,'admin_hash'=>password_hash($owner,PASSWORD_DEFAULT),'secure_cookies'=>true];
if(file_put_contents($destination,"<?php\nreturn ".var_export($config,true).";\n")===false)throw new RuntimeException('Unable to save');
echo "Host configuration written securely.\n";
