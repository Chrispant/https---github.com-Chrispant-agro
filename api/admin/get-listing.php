<?php
header("Content-Type: application/json; charset=utf-8");
require __DIR__ . "/../db.php";

$publicId = $_GET["id"] ?? null;

if (!$publicId) {
  http_response_code(400);
  echo json_encode(["error" => "Missing id"]);
  exit;
}

$stmt = $pdo->prepare("
  SELECT *
  FROM listings
  WHERE public_id = ?
  LIMIT 1
");
$stmt->execute([$publicId]);
$listing = $stmt->fetch();

if (!$listing) {
  http_response_code(404);
  echo json_encode(["error" => "Listing not found"]);
  exit;
}

$imgStmt = $pdo->prepare("
  SELECT id, path, sort_order
  FROM listing_images
  WHERE listing_id = ?
  ORDER BY sort_order ASC, id ASC
");
$imgStmt->execute([$listing["id"]]);
$images = $imgStmt->fetchAll();

echo json_encode([
  "listing" => $listing,
  "images" => $images
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);