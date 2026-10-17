<?php
declare(strict_types=1);
$config = require dirname(__DIR__) . '/private/config.php';
if ($config['dsn'] !== 'mysql:host=127.0.0.1;port=33316;dbname=shifttrack_new;charset=utf8mb4') {
    throw new RuntimeException('Preview is restricted to the local database');
}
$pdo = new PDO($config['dsn'], $config['user'], $config['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
if ((int)$pdo->query('SELECT COUNT(*) FROM employees')->fetchColumn() !== 0) {
    echo "Existing data preserved; no preview data inserted.\n";
    exit;
}
$pdo->beginTransaction();
$person = $pdo->prepare('INSERT INTO employees(employee,name,emoji,avatar,avatar_type) VALUES(?,?,?,?,?)');
$shift = $pdo->prepare('INSERT INTO shifts(employee,day,code) VALUES(?,?,?)');
$emojis = ['🙂','😎','👩','🧑','👨','😊','🧔','👩‍🦱','👨‍🦱','😁'];
$codes = ['E','E','L','L','N','N','D','R'];
for ($i = 1; $i <= 10; $i++) {
    $id = sprintf('%03d', $i);
    $person->execute([$id, 'สมาชิกตัวอย่าง ' . $id, $emojis[$i - 1], $i === 3 ? file_get_contents(dirname(__DIR__) . '/public/assets/icon-192.png') : null, $i === 3 ? 'image/png' : null]);
    for ($day = 1; $day <= 31; $day++) {
        $shift->execute([$id, sprintf('2026-10-%02d', $day), $codes[(intdiv($i - 1, 2) + $day - 1) % count($codes)]]);
    }
}
$pdo->exec("INSERT INTO rosters(month,revision,published_at) VALUES('2026-10',1,UTC_TIMESTAMP())");
$pdo->commit();
echo "Preview ready: 10 fictional employees (001-010), October 2026.\n";
