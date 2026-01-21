<?php
$host = 'localhost';
$dbname = 'wind_tunnel';
$username = 'root';          // ← 改成你的 MySQL 使用者
$password = 'root';              // ← 改成你的密碼（XAMPP 預設為空）

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("資料庫連線失敗: " . $e->getMessage());
}
?>