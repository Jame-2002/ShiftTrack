<?php
declare(strict_types=1);
date_default_timezone_set('UTC');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' blob: data:; worker-src 'self' blob:; connect-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
$configPath = getenv('SHIFTTRACK_CONFIG_PATH') ?: __DIR__ . '/config.php';
if (!is_file($configPath)) {
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'ยังไม่ได้ตั้งค่าฐานข้อมูลและผู้ดูแล ดู DEPLOY_BYETHOST.md']);
    exit;
}
$config = require $configPath;
session_set_cookie_params(['httponly' => true, 'secure' => (bool)$config['secure_cookies'], 'samesite' => 'Strict', 'path' => '/']);
session_start();
if (!isset($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
function db(): PDO
{
    static $pdo;
    global $config;
    return $pdo ??= new PDO($config['dsn'], $config['user'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}
function output(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}
function query(string $sql, array $params = []): PDOStatement
{
    $statement = db()->prepare($sql);
    $statement->execute($params);
    return $statement;
}
function owner(): void
{
    if (empty($_SESSION['owner']) || time() - ($_SESSION['seen'] ?? 0) > 1800) {
        unset($_SESSION['owner']);
        output(['error' => 'กรุณาเข้าสู่หน้าจัดการอีกครั้ง'], 401);
    }
    $_SESSION['seen'] = time();
}
function employeeId(mixed $value): string
{
    $value = trim((string)$value);
    if (!preg_match('/^[A-Za-z0-9_-]{1,20}$/D', $value)) throw new InvalidArgumentException('รหัสพนักงานต้องเป็นตัวอักษรอังกฤษ ตัวเลข _ หรือ - ไม่เกิน 20 ตัว');
    return $value;
}
function monthValue(mixed $value): string
{
    $value = (string)$value;
    if (!preg_match('/^(20\d{2})-(0[1-9]|1[0-2])$/D', $value)) throw new InvalidArgumentException('เดือนต้องเป็น YYYY-MM');
    return $value;
}
