<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => '僅支援 POST 請求']);
    exit;
}

require_once 'config.php';

$allowedTypes = ['gltf', 'glb', 'obj', 'stl'];
$maxSize = 50 * 1024 * 1024;

if (!isset($_FILES['modelFile']) || $_FILES['modelFile']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['error' => '檔案上傳失敗']);
    exit;
}

$file = $_FILES['modelFile'];
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

if (!in_array($ext, $allowedTypes)) {
    echo json_encode(['error' => '不支援的檔案格式']);
    exit;
}

if ($file['size'] > $maxSize) {
    echo json_encode(['error' => '檔案大小超過 50MB']);
    exit;
}

$uniqueName = uniqid('model_', true) . '.' . $ext;
$uploadDir = 'models/';
$targetPath = $uploadDir . $uniqueName;

if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    echo json_encode(['error' => '儲存檔案失敗']);
    exit;
}

try {
    $stmt = $pdo->prepare("
        INSERT INTO uploaded_models (filename, original_name, file_path, file_type)
        VALUES (?, ?, ?, ?)
    ");
    $stmt->execute([$uniqueName, $file['name'], $targetPath, $ext]);

    echo json_encode([
        'success' => true,
        'message' => '上傳成功',
        'fileUrl' => $targetPath
    ]);
} catch (Exception $e) {
    unlink($targetPath);
    echo json_encode(['error' => '資料庫錯誤: ' . $e->getMessage()]);
}
?>