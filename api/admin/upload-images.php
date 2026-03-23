<?php
header("Content-Type: application/json; charset=utf-8");

require __DIR__ . "/../db.php";

$publicId = trim($_POST["id"] ?? "");

if ($publicId === "") {
  http_response_code(400);
  echo json_encode(["error" => "Missing listing id"], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$stmt = $pdo->prepare("
  SELECT id
  FROM listings
  WHERE public_id = ?
  LIMIT 1
");
$stmt->execute([$publicId]);
$listing = $stmt->fetch();

if (!$listing) {
  http_response_code(404);
  echo json_encode(["error" => "Listing not found"], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$listingDbId = (int)$listing["id"];

if (!isset($_FILES["images"])) {
  http_response_code(400);
  echo json_encode(["error" => "No images uploaded"], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$uploadDir = dirname(__DIR__, 2) . "/uploads/listings/";
if (!is_dir($uploadDir)) {
  mkdir($uploadDir, 0777, true);
}

$allowedMime = [
  "image/jpeg" => "jpg",
  "image/png" => "png",
  "image/webp" => "webp"
];

$countStmt = $pdo->prepare("SELECT COUNT(*) FROM listing_images WHERE listing_id = ?");
$countStmt->execute([$listingDbId]);
$currentCount = (int)$countStmt->fetchColumn();

$maxImages = 6;

$files = $_FILES["images"];
$uploaded = [];

$sortStmt = $pdo->prepare("SELECT COALESCE(MAX(sort_order), -1) FROM listing_images WHERE listing_id = ?");
$sortStmt->execute([$listingDbId]);
$nextSortOrder = ((int)$sortStmt->fetchColumn()) + 1;

for ($i = 0; $i < count($files["name"]); $i++) {
  if ($currentCount >= $maxImages) {
    break;
  }

  if (($files["error"][$i] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    continue;
  }

  $tmpPath = $files["tmp_name"][$i];
  $mime = mime_content_type($tmpPath);

  if (!isset($allowedMime[$mime])) {
    continue;
  }

  $ext = $allowedMime[$mime];
  $fileName = "listing_" . $listingDbId . "_" . time() . "_" . bin2hex(random_bytes(4)) . "." . $ext;
  $targetAbsolute = $uploadDir . $fileName;
  $targetRelative = "uploads/listings/" . $fileName;

  if (!move_uploaded_file($tmpPath, $targetAbsolute)) {
    continue;
  }

  $insert = $pdo->prepare("
    INSERT INTO listing_images (listing_id, path, sort_order)
    VALUES (?, ?, ?)
  ");
  $insert->execute([$listingDbId, $targetRelative, $nextSortOrder]);

  $uploaded[] = [
    "id" => (int)$pdo->lastInsertId(),
    "path" => $targetRelative,
    "sort_order" => $nextSortOrder
  ];

  $nextSortOrder++;
  $currentCount++;
}

echo json_encode([
  "success" => true,
  "uploaded" => $uploaded
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);