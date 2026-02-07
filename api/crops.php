<?php
header("Content-Type: application/json; charset=utf-8");

$path = __DIR__ . "/../data/crops.json";
if (!file_exists($path)) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => "Missing data/crops.json"], JSON_UNESCAPED_UNICODE);
  exit;
}

$json = file_get_contents($path);
$data = json_decode($json, true);

if (!is_array($data) || !isset($data["crops"]) || !is_array($data["crops"])) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => "Invalid crops.json"], JSON_UNESCAPED_UNICODE);
  exit;
}

// Return normalized payload
echo json_encode(["ok" => true, "crops" => $data["crops"]], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
