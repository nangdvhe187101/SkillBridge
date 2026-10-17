-- =====================================================================
-- Seed 10 trường đại học phổ biến vào bảng `schools`
-- Dùng chung được cho cả TiDB (production) và MySQL local.
-- An toàn chạy nhiều lần: nếu `name` đã tồn tại thì chỉ cập nhật lại
-- short_name/domain/is_active, không tạo trùng bản ghi (dựa trên
-- UNIQUE KEY `uq_schools_name` đã có sẵn trong bảng schools).
--
-- BẮT BUỘC: Backup bảng schools trước khi chạy (quy tắc an toàn dữ liệu).
--   mysqldump -h <host> -P <port> -u <user> -p <database> schools > schools_backup_$(date +%Y%m%d).sql
-- =====================================================================

INSERT INTO `schools` (`code`, `name`, `short_name`, `domain`, `is_active`) VALUES
('FPT_UNIVERSITY',   'Đại học FPT',                              'FPTU', 'fpt.edu.vn',   1),
('HUST',             'Đại học Bách khoa Hà Nội',                 'HUST', 'hust.edu.vn',  1),
('NEU',              'Đại học Kinh tế Quốc dân',                 'NEU',  'neu.edu.vn',   1),
('FTU',              'Đại học Ngoại thương',                     'FTU',  'ftu.edu.vn',   1),
('RMIT',             'Đại học RMIT Việt Nam',                    'RMIT', 'rmit.edu.vn',  1),
('HAUI',             'Đại học Công nghiệp Hà Nội',                'HAUI', 'haui.edu.vn',  1),
('TDTU',             'Đại học Tôn Đức Thắng',                    'TDTU', 'tdtu.edu.vn',  1),
('HCMUT',            'Đại học Bách khoa TP.HCM',                 'HCMUT','hcmut.edu.vn', 1),
('HCMUS',            'Đại học Khoa học Tự nhiên TP.HCM',         'HCMUS','hcmus.edu.vn', 1),
('UEH',              'Đại học Kinh tế TP.HCM',                   'UEH',  'ueh.edu.vn',   1)
ON DUPLICATE KEY UPDATE
  `code` = VALUES(`code`),
  `short_name` = VALUES(`short_name`),
  `domain` = VALUES(`domain`),
  `is_active` = VALUES(`is_active`);
