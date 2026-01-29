<?php
header("Content-Type: application/json; charset=utf-8");

require __DIR__ . "/db.php";

function bad($msg, $extra = []) {
  http_response_code(400);
  echo json_encode(array_merge(["ok" => false, "error" => $msg], $extra), JSON_UNESCAPED_UNICODE);
  exit;
}

function make_public_id($crop, $region) {
  // simple slug (latin-safe). We'll keep it basic for now.
  $base = strtolower(trim($crop . "-" . $region));
  $base = preg_replace('/[^a-z0-9]+/i', '-', $base);
  $base = trim($base, '-');
  if ($base === "") $base = "listing";
  $rand = substr(bin2hex(random_bytes(3)), 0, 6);
  return $base . "-" . $rand;
}

// ---- Read fields ----
$cropType = trim($_POST["cropType"] ?? "");
$region   = trim($_POST["region"] ?? "");
$quantityTons = $_POST["quantityTons"] ?? "";
$pricePerKg   = $_POST["pricePerKg"] ?? "";
$priceNote    = trim($_POST["priceNote"] ?? "");
$harvestStart = trim($_POST["harvestStart"] ?? "");
$harvestEnd   = trim($_POST["harvestEnd"] ?? "");
$sellerName   = trim($_POST["sellerName"] ?? "");
$sellerPhone  = trim($_POST["sellerPhone"] ?? "");
$sellerEmail  = trim($_POST["sellerEmail"] ?? "");
$description  = trim($_POST["description"] ?? "");

// ---- Validate minimal ----
if ($cropType === "") bad("cropType is required");
if ($region === "") bad("region is required");
if ($sellerName === "") bad("sellerName is required");

if ($quantityTons === "" || !is_numeric($quantityTons) || floatval($quantityTons) <= 0) {
  bad("quantityTons must be a positive number");
}
$quantityTons = floatval($quantityTons);

$pricePerKg = trim((string)$pricePerKg);
if ($pricePerKg === "") {
  $pricePerKgVal = null;
} else {
  if (!is_numeric($pricePerKg) || floatval($pricePerKg) < 0) bad("pricePerKg must be a number >= 0");
  $pricePerKgVal = floatval($pricePerKg);
}

if ($harvestStart !== "" && !preg_match('/^\d{4}-\d{2}$/', $harvestStart)) bad("harvestStart must be YYYY-MM");
if ($harvestEnd !== "" && !preg_match('/^\d{4}-\d{2}$/', $harvestEnd)) bad("harvestEnd must be YYYY-MM");

// ---- Handle uploads ----
$uploadDirFs = realpath(__DIR__ . "/../uploads/listings");
if ($uploadDirFs === false) bad("Upload folder missing on server");

$maxFiles = 8;
$maxBytes = 3 * 1024 * 1024; // 3MB each
$allowed = ["image/jpeg" => "jpg", "image/png" => "png", "image/webp" => "webp"];

$storedPaths = [];

if (isset($_FILES["images"]) && is_array($_FILES["images"]["name"])) {
  $count = count($_FILES["images"]["name"]);
  if ($count > $maxFiles) bad("Too many images (max $maxFiles)");

  for ($i = 0; $i < $count; $i++) {
    $err = $_FILES["images"]["error"][$i];
    if ($err === UPLOAD_ERR_NO_FILE) continue;
    if ($err !== UPLOAD_ERR_OK) bad("Upload error", ["code" => $err]);

    $tmp = $_FILES["images"]["tmp_name"][$i];
    $size = (int)$_FILES["images"]["size"][$i];
    if ($size <= 0 || $size > $maxBytes) bad("Each image must be <= 3MB");

    $mime = mime_content_type($tmp);
    if (!isset($allowed[$mime])) bad("Unsupported image type. Use JPG, PNG, or WEBP.");

    $ext = $allowed[$mime];
    $fileName = "l_" . date("Ymd_His") . "_" . substr(bin2hex(random_bytes(4)), 0, 8) . "." . $ext;

    $destFs = $uploadDirFs . DIRECTORY_SEPARATOR . $fileName;
    if (!move_uploaded_file($tmp, $destFs)) bad("Failed to store uploaded image");

    // public path from web root
    $storedPaths[] = "uploads/listings/" . $fileName;
  }
}

// ---- Insert listing + images ----
$publicId = make_public_id($cropType, $region);

try {
  $pdo->beginTransaction();

  $stmt = $pdo->prepare("
    INSERT INTO listings
      (public_id, crop_type, region, quantity_tons, price_per_kg, price_note,
       harvest_start, harvest_end, seller_name, seller_phone, seller_email,
       description, created_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  ");

  $stmt->execute([
    $publicId,
    $cropType,
    $region,
    $quantityTons,
    $pricePerKgVal,
    $priceNote === "" ? null : $priceNote,
    $harvestStart === "" ? null : $harvestStart,
    $harvestEnd === "" ? null : $harvestEnd,
    $sellerName,
    $sellerPhone === "" ? null : $sellerPhone,
    $sellerEmail === "" ? null : $sellerEmail,
    $description === "" ? null : $description
  ]);

  $listingId = (int)$pdo->lastInsertId();

  if (!empty($storedPaths)) {
    $imgStmt = $pdo->prepare("INSERT INTO listing_images (listing_id, path, sort_order) VALUES (?, ?, ?)");
    $order = 0;
    foreach ($storedPaths as $p) {
      $imgStmt->execute([$listingId, $p, $order]);
      $order++;
    }
  }

  $pdo->commit();
} catch (Throwable $e) {
  $pdo->rollBack();
  // NOTE: We don't delete uploaded files here; can be improved later.
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => "Server error"], JSON_UNESCAPED_UNICODE);
  exit;
}

echo json_encode(["ok" => true, "id" => $publicId], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);