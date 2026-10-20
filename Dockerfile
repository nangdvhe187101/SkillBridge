# Stage 1: Build & Publish
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Sao chép các tệp csproj để tận dụng Docker layer caching khi restore
COPY ["src/SkillBridge.Domain/SkillBridge.Domain.csproj", "src/SkillBridge.Domain/"]
COPY ["src/SkillBridge.Application/SkillBridge.Application.csproj", "src/SkillBridge.Application/"]
COPY ["src/SkillBridge.Infrastructure/SkillBridge.Infrastructure.csproj", "src/SkillBridge.Infrastructure/"]
COPY ["src/SkillBridge.AdminAPI/SkillBridge.AdminAPI.csproj", "src/SkillBridge.AdminAPI/"]
COPY ["src/SkillBridge.API/SkillBridge.API.csproj", "src/SkillBridge.API/"]

# Khôi phục dependencies
RUN dotnet restore "src/SkillBridge.API/SkillBridge.API.csproj"

# Sao chép toàn bộ mã nguồn liên quan
COPY ["src/SkillBridge.Domain/", "src/SkillBridge.Domain/"]
COPY ["src/SkillBridge.Application/", "src/SkillBridge.Application/"]
COPY ["src/SkillBridge.Infrastructure/", "src/SkillBridge.Infrastructure/"]
COPY ["src/SkillBridge.AdminAPI/", "src/SkillBridge.AdminAPI/"]
COPY ["src/SkillBridge.API/", "src/SkillBridge.API/"]

# Build và publish Release
WORKDIR "/src/src/SkillBridge.API"
RUN dotnet publish "SkillBridge.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

# Tesseract OCR cho tính năng nhận diện thẻ sinh viên (thay Apple Vision Framework,
# vốn chỉ chạy trên macOS và không hoạt động trên container Linux này).
# tesseract-ocr-vie: gói ngôn ngữ tiếng Việt; tesseract-ocr-eng: chữ Latin/số không dấu.
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr tesseract-ocr-vie tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

# Render mặc định định tuyến qua cổng 8080 (hoặc qua biến PORT)
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "SkillBridge.API.dll"]
