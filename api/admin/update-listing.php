<?php
header("Content-Type: application/json; charset=utf-8");
require __DIR__ . "/../db.php";

$publicId = $_POST["id"] ?? null;

if (!$publicId) {
  http_response_code(400);
  echo json_encode(["error" => "Missing id"]);
  exit;
}

$data = [
  "crop_type" => trim($_POST["cropType"] ?? ""),
  "variety" => trim($_POST["variety"] ?? ""),
  "region" => trim($_POST["region"] ?? ""),
  "quantity_tons" => ($_POST["quantityTons"] ?? "") !== "" ? $_POST["quantityTons"] : null,
  "price_per_kg" => ($_POST["pricePerKg"] ?? "") !== "" ? $_POST["pricePerKg"] : null,
  "price_note" => trim($_POST["priceNote"] ?? ""),
  "harvest_start" => trim($_POST["harvestStart"] ?? ""),
  "harvest_end" => trim($_POST["harvestEnd"] ?? ""),
  "seller_name" => trim($_POST["sellerName"] ?? ""),
  "seller_phone" => trim($_POST["sellerPhone"] ?? ""),
  "seller_email" => trim($_POST["sellerEmail"] ?? ""),
  "description" => trim($_POST["description"] ?? ""),
  "public_id" => $publicId
];

$stmt = $pdo->prepare("
  UPDATE listings SET
    crop_type = :crop_type,
    variety = :variety,
    region = :region,
    quantity_tons = :quantity_tons,
    price_per_kg = :price_per_kg,
    price_note = :price_note,
    harvest_start = :harvest_start,
    harvest_end = :harvest_end,
    seller_name = :seller_name,
    seller_phone = :seller_phone,
    seller_email = :seller_email,
    description = :description
  WHERE public_id = :public_id
");

$stmt->execute($data);

echo json_encode(["success" => true], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);