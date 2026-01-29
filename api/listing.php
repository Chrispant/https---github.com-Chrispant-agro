<?php
header("Content-Type: application/json; charset=utf-8");
require __DIR__ . "/db.php";

$raw = $_GET["id"] ?? "";
$id = trim((string)$raw);

if ($id === "") {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Missing id"], JSON_UNESCAPED_UNICODE);
  exit;
}

// Try by public_id first
$stmt = $pdo->prepare("
  SELECT
    id, public_id, crop_type, region, quantity_tons, price_per_kg, price_note,
    harvest_start, harvest_end, seller_name, seller_phone, seller_email,
    description, created_at
  FROM listings
  WHERE public_id = ?
  LIMIT 1
");
$stmt->execute([$id]);
$r = $stmt->fetch();

// Fallback: if URL id is numeric, try by numeric primary key
if (!$r && ctype_digit($id)) {
  $stmt2 = $pdo->prepare("
    SELECT
      id, public_id, crop_type, region, quantity_tons, price_per_kg, price_note,
      harvest_start, harvest_end, seller_name, seller_phone, seller_email,
      description, created_at
    FROM listings
    WHERE id = ?
    LIMIT 1
  ");
  $stmt2->execute([(int)$id]);
  $r = $stmt2->fetch();
}

if (!$r) {
  http_response_code(404);
  echo json_encode(["ok" => false, "error" => "Not found", "requested" => $id], JSON_UNESCAPED_UNICODE);
  exit;
}

$listingId = (int)$r["id"];

$imgStmt = $pdo->prepare("
  SELECT path
  FROM listing_images
  WHERE listing_id = ?
  ORDER BY sort_order ASC, id ASC
");
$imgStmt->execute([$listingId]);
$images = array_map(fn($row) => $row["path"], $imgStmt->fetchAll());

echo json_encode([
  "ok" => true,
  "listing" => [
    "id" => $r["public_id"],
    "cropType" => $r["crop_type"],
    "region" => $r["region"],
    "quantityTons" => (float)$r["quantity_tons"],
    "pricePerKg" => $r["price_per_kg"] === null ? null : (float)$r["price_per_kg"],
    "priceNote" => $r["price_note"],
    "harvestStart" => $r["harvest_start"],
    "harvestEnd" => $r["harvest_end"],
    "image" => $images[0] ?? "images/listings/placeholder.jpg",
    "images" => $images,
    "seller" => [
      "name" => $r["seller_name"],
      "phone" => $r["seller_phone"],
      "email" => $r["seller_email"],
    ],
    "createdAt" => substr((string)$r["created_at"], 0, 10),
    "description" => $r["description"],
  ]
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);