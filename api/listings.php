<?php
header("Content-Type: application/json; charset=utf-8");

require __DIR__ . "/db.php";

// 1) Get listings
$listingsSql = "
  SELECT
    id,
    public_id,
    crop_type,
    region,
    quantity_tons,
    price_per_kg,
    price_note,
    harvest_start,
    harvest_end,
    seller_name,
    seller_phone,
    seller_email,
    description,
    created_at
  FROM listings
  ORDER BY created_at DESC
";
$listStmt = $pdo->query($listingsSql);
$listRows = $listStmt->fetchAll();

if (!$listRows) {
  echo json_encode([], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

// map listing_id -> output object
$outById = [];
$listingIds = [];

foreach ($listRows as $r) {
  $listingId = (int)$r["id"];
  $listingIds[] = $listingId;

  $outById[$listingId] = [
    "id" => $r["public_id"],
    "cropType" => $r["crop_type"],
    "region" => $r["region"],
    "quantityTons" => (float)$r["quantity_tons"],
    "pricePerKg" => $r["price_per_kg"] === null ? null : (float)$r["price_per_kg"],
    "priceNote" => $r["price_note"],
    "harvestStart" => $r["harvest_start"],
    "harvestEnd" => $r["harvest_end"],
    "image" => "images/listings/placeholder.jpg", // will be replaced if images exist
    "images" => [],
    "seller" => [
      "name" => $r["seller_name"],
      "phone" => $r["seller_phone"],
      "email" => $r["seller_email"],
    ],
    "createdAt" => substr((string)$r["created_at"], 0, 10), // YYYY-MM-DD
    "description" => $r["description"],
  ];
}

// 2) Get images for those listings (ordered)
$in = implode(",", array_fill(0, count($listingIds), "?"));
$imgSql = "
  SELECT listing_id, path
  FROM listing_images
  WHERE listing_id IN ($in)
  ORDER BY listing_id ASC, sort_order ASC, id ASC
";
$imgStmt = $pdo->prepare($imgSql);
$imgStmt->execute($listingIds);
$imgRows = $imgStmt->fetchAll();

foreach ($imgRows as $img) {
  $lid = (int)$img["listing_id"];
  if (!isset($outById[$lid])) continue;
  $outById[$lid]["images"][] = $img["path"];
}

// 3) Set legacy "image" = first image (keep your existing frontend working)
foreach ($outById as &$item) {
  if (!empty($item["images"])) {
    $item["image"] = $item["images"][0];
  }
}
unset($item);

// 4) Output as array
echo json_encode(array_values($outById), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);