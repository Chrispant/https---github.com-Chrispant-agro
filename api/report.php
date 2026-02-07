<?php
header("Content-Type: application/json; charset=utf-8");
require __DIR__ . "/db.php";

// Expect JSON body
$body = json_decode(file_get_contents("php://input"), true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(["ok" => false, "error" => "Invalid JSON"]);
    exit;
}

$listingId = trim($body["listingId"] ?? "");
$reporterName = trim($body["name"] ?? "");
$reporterContact = trim($body["contact"] ?? "");
$description = trim($body["description"] ?? "");

if ($listingId === "" || $description === "") {
    http_response_code(422);
    echo json_encode(["ok" => false, "error" => "Missing required fields"]);
    exit;
}

// insert
$stmt = $pdo->prepare("
  INSERT INTO reports (listing_public_id, reporter_name, reporter_contact, description)
  VALUES (?, ?, ?, ?)
");
$stmt->execute([$listingId, $reporterName, $reporterContact, $description]);

echo json_encode(["ok" => true]);
