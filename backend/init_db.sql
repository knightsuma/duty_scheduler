-- MariaDB 초기 DB 생성 (root 계정으로 실행)
CREATE DATABASE IF NOT EXISTS duty_scheduler
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'duty_user'@'localhost' IDENTIFIED BY 'duty_pass123';
GRANT ALL PRIVILEGES ON duty_scheduler.* TO 'duty_user'@'localhost';
FLUSH PRIVILEGES;
