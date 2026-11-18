/* =====================================================================
   00_create_database.sql — Tạo cơ sở dữ liệu ToeicDb
   Chạy khi đang kết nối vào database master. Cần SQL Server 2017 trở lên.
   Collation Vietnamese_100_CI_AS: sắp xếp và so sánh chuỗi tiếng Việt, không phân biệt hoa thường
   (Email, Lemma, tên nhóm... không bị trùng chỉ vì khác hoa thường).
   ===================================================================== */
IF DB_ID(N'ToeicDb') IS NULL
    CREATE DATABASE ToeicDb COLLATE Vietnamese_100_CI_AS;
GO
PRINT N'00_create_database.sql: ToeicDb sẵn sàng.';
GO
