<?php
header("Content-Type: application/json; charset=utf-8");

require __DIR__ . "/../db.php";

$imageId = isset($_POST["imageId"]) ? (int)$_POST["imageId"] : 0;

if (!$imageId) {
  http_response_code(400);
  echo json_encode(["error" => "Missing imageId"], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$stmt = $pdo->prepare("
  SELECT id, path
  FROM listing_images
  WHERE id = ?
  LIMIT 1
");
$stmt->execute([$imageId]);
$image = $stmt->fetch();

if (!$image) {
  http_response_code(404);
  echo json_encode(["error" => "Image not found"], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$relativePath = (string)$image["path"];
$cleanRelativePath = ltrim(str_replace(["../", "..\\"], "", $relativePath), "/\\");
$absolutePath = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . $cleanRelativePath;

$pdo->prepare("DELETE FROM listing_images WHERE id = ?")->execute([$imageId]);

if (is_file($absolutePath)) {
  @unlink($absolutePath);
}

echo json_encode(["success" => true], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);