<?php
header("Content-Type: application/json; charset=utf-8");
require __DIR__ . "/../db.php";

$publicId = $_POST["id"] ?? null;

if (!$publicId) {
  http_response_code(400);
  echo json_encode(["error" => "Missing id"]);
  exit;
}

$stmt = $pdo->prepare("SELECT id FROM listings WHERE public_id = ? LIMIT 1");
$stmt->execute([$publicId]);
$listing = $stmt->fetch();

if (!$listing) {
  http_response_code(404);
  echo json_encode(["error" => "Listing not found"]);
  exit;
}

$listingDbId = (int)$listing["id"];

$pdo->prepare("DELETE FROM listing_images WHERE listing_id = ?")->execute([$listingDbId]);
$pdo->prepare("DELETE FROM listings WHERE id = ?")->execute([$listingDbId]);

echo json_encode(["success" => true], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);