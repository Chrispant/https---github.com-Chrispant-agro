<?php
header("Content-Type: application/json; charset=utf-8");

$path = __DIR__ . "/../data/regions.json";
if (!file_exists($path)) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => "Missing data/regions.json"], JSON_UNESCAPED_UNICODE);
  exit;
}

$data = json_decode(file_get_contents($path), true);

if (!is_array($data) || !isset($data["groups"]) || !is_array($data["groups"])) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => "Invalid regions.json format (expected groups)"], JSON_UNESCAPED_UNICODE);
  exit;
}

$items = [];
foreach ($data["groups"] as $g) {
  if (!isset($g["items"]) || !is_array($g["items"])) continue;
  foreach ($g["items"] as $it) {
    if (!isset($it["value"])) continue;
    $items[] = $it;
  }
}

echo json_encode([
  "ok" => true,
  "version" => $data["version"] ?? null,
  "updatedAt" => $data["updatedAt"] ?? null,
  "groups" => $data["groups"],
  "items" => $items
], JSON_UNESCAPED_UNICODE);
