<?php
header("Content-Type: application/json");


require __DIR__ . "/db.php";


$stmt = $pdo->query("SELECT COUNT(*) AS total FROM listings");
$row = $stmt->fetch();


echo json_encode([
"status" => "ok",
"listings_in_db" => $row["total"]
]);