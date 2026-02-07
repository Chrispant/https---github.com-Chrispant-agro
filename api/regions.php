<?php
header("Content-Type: application/json; charset=utf-8");

$path = __DIR__ . "/../data/regions.json";
if (!file_exists($path)) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => "Missing data/regions.json"], JSON_UNESCAPED_UNICODE);
  exit;
}

$json = file_get_contents($path);
$data = json_decode($json, true);

if (!is_array($data) || !isset($data["regions"]) || !is_array($data["regions"])) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => "Invalid regions.json"], JSON_UNESCAPED_UNICODE);
  exit;
}

echo json_encode(["ok" => true, "regions" => $data["regions"]], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
