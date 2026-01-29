<?php
// api/db.php


$host = "localhost";
$db = "agrora";
$user = "root";
$pass = ""; // default for XAMPP
$charset = "utf8mb4";


$dsn = "mysql:host=$host;dbname=$db;charset=$charset";


$options = [
PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
PDO::ATTR_EMULATE_PREPARES => false,
];


try {
$pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
http_response_code(500);
echo json_encode([
"error" => "Database connection failed",
"details" => $e->getMessage()
]);
exit;
}