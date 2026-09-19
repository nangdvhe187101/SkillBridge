# SkillBridge — Nền Tảng Kết Nối Việc Làm & Tài Chính Sinh Viên

## 1. Yêu Cầu Cấu Hình Bảo Mật (Zero Secret Policy)

Hệ thống tuân thủ nghiêm ngặt **SEC-01 (Zero Secret Policy)**. Tuyệt đối không commit credentials, secret keys hoặc private keys vào mã nguồn hoặc file `appsettings.json`.

### Cấu hình biến môi trường hoặc `dotnet user-secrets`

Trước khi khởi chạy backend API, hãy cấu hình các khóa bảo mật thông qua biến môi trường hoặc .NET Secret Manager:

```bash
# Đối với SkillBridge.API:
cd src/SkillBridge.API
dotnet user-secrets set "Encryption:Key" "Your32CharacterSecretKeyHere12345"
dotnet user-secrets set "SePay:ApiKey" "YourSePayApiKeyHere"
dotnet user-secrets set "VNPay:HashSecret" "YourVNPayHashSecretHere"

# Đối với SkillBridge.AdminAPI:
cd ../SkillBridge.AdminAPI
dotnet user-secrets set "Encryption:Key" "Your32CharacterSecretKeyHere12345"
```

Hoặc qua biến môi trường của hệ điều hành:
```bash
export ENCRYPTION_KEY="Your32CharacterSecretKeyHere12345"
```

> [!IMPORTANT]
> Trong môi trường production (`ASPNETCORE_ENVIRONMENT != Development`), hệ thống áp dụng **Fail-Closed Startup Validation**: Nếu `Encryption:Key` bị thiếu hoặc ngắn hơn 16 ký tự, hoặc `VNPay:HashSecret` chứa giá trị mặc định / test, backend sẽ tự động dừng khởi động để bảo vệ an toàn tài sản và dữ liệu PII.

---

## 2. Cấu Hình Cơ Sở Dữ Liệu MySQL

Để đảm bảo triệt tiêu hiện tượng Stale Read Snapshot và hỗ trợ tối ưu các câu lệnh khóa hàng `SELECT ... FOR UPDATE`, cấu hình MySQL server (`my.cnf` hoặc `my.ini`):

```ini
[mysqld]
# Bắt buộc cho giao dịch tài chính đa luồng
binlog_format = ROW

# Khuyến nghị mức cô lập giao dịch
transaction-isolation = READ-COMMITTED
```

---

## 3. Khởi Chạy Dự Án

### Backend
```bash
dotnet restore
dotnet build
dotnet test tests/SkillBridge.Tests/SkillBridge.Tests.csproj
```

### Frontend User
```bash
cd frontend-user
npm install
npm run dev
```

### Frontend Admin
```bash
cd frontend-admin
npm install
npm run dev
```
