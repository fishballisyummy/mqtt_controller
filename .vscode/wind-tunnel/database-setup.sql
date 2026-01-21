CREATE DATABASE IF NOT EXISTS wind_tunnel;
USE wind_tunnel;

CREATE TABLE uploaded_models (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(10) NOT NULL,
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);