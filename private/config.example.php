<?php
return [
    'dsn' => 'mysql:host=YOUR_MYSQL_HOST;dbname=YOUR_DATABASE;charset=utf8mb4',
    'user' => 'YOUR_DATABASE_USER',
    'password' => 'YOUR_DATABASE_PASSWORD',
    // Generate locally: php -r "echo password_hash(readline('Password: '), PASSWORD_DEFAULT);"
    'admin_hash' => 'REPLACE_WITH_PASSWORD_HASH',
    'secure_cookies' => true,
];
