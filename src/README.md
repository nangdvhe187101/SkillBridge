## Cấu hình secrets (bắt buộc trước khi chạy)

Sau khi clone, chạy các lệnh sau trong `src/SkillBridge.API`:

\`\`\`
dotnet user-secrets init
dotnet user-secrets set "Jwt:Key" "<tự tạo bằng: openssl rand -base64 32>"
dotnet user-secrets set "Smtp:Username" "<Gmail của bạn>"
dotnet user-secrets set "Smtp:Password" "<App Password 16 ký tự, xem hướng dẫn tạo tại myaccount.google.com/apppasswords>"
\`\`\`

Đồng thời copy `appsettings.Development.json.example` thành `appsettings.Development.json`, điền mật khẩu MySQL của bạn.