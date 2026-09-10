using System;
using System.Collections.Generic;
using System.IO;
using Microsoft.Extensions.Logging;
using PdfSharpCore.Drawing;
using PdfSharpCore.Pdf.IO;
using SkiaSharp;
using SkillBridge.Application.Interfaces.Media;

namespace SkillBridge.Infrastructure.Services.Media;

public class WatermarkService : IWatermarkService
{
    private readonly ILogger<WatermarkService> _logger;

    private static readonly HashSet<string> ImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".png", ".jpg", ".jpeg", ".webp"
    };

    public WatermarkService(ILogger<WatermarkService> logger)
    {
        _logger = logger;
    }

    public bool IsSupported(string fileExtension)
    {
        var ext = fileExtension.StartsWith('.') ? fileExtension : "." + fileExtension;
        return ImageExtensions.Contains(ext) || string.Equals(ext, ".pdf", StringComparison.OrdinalIgnoreCase);
    }

    public Stream? ApplyWatermark(Stream inputStream, string fileExtension, int jobId)
    {
        var ext = (fileExtension.StartsWith('.') ? fileExtension : "." + fileExtension).ToLowerInvariant();

        if (ImageExtensions.Contains(ext))
        {
            return ApplyImageWatermark(inputStream, ext, jobId);
        }

        if (string.Equals(ext, ".pdf", StringComparison.OrdinalIgnoreCase))
        {
            return ApplyPdfWatermark(inputStream, jobId);
        }

        return null;
    }

    private Stream? ApplyImageWatermark(Stream inputStream, string ext, int jobId)
    {
        try
        {
            inputStream.Position = 0;
            using var originalBitmap = SKBitmap.Decode(inputStream);
            if (originalBitmap == null) return null;

            using var surface = SKSurface.Create(new SKImageInfo(originalBitmap.Width, originalBitmap.Height));
            var canvas = surface.Canvas;

            // 1. Vẽ ảnh gốc
            using var originalImage = SKImage.FromBitmap(originalBitmap);
            canvas.DrawImage(originalImage, 0, 0, new SKSamplingOptions());

            // 2. Cấu hình chữ Watermark thanh mảnh, trong suốt tinh tế (không che lấp chi tiết ảnh)
            var fontSize = Math.Max(16f, originalBitmap.Width / 26f);
            using var typeface = SKTypeface.FromFamilyName("Arial", SKFontStyleWeight.SemiBold, SKFontStyleWidth.Normal, SKFontStyleSlant.Upright);
            using var font = new SKFont(typeface, fontSize);

            using var fillPaint = new SKPaint
            {
                Color = new SKColor(255, 255, 255, 48), // Màu trắng mờ tinh tế ~18%
                IsAntialias = true
            };

            using var strokePaint = new SKPaint
            {
                Color = new SKColor(0, 0, 0, 26), // Viền tối siêu mờ
                IsAntialias = true,
                Style = SKPaintStyle.Stroke,
                StrokeWidth = 1
            };

            var mainLabel = $"SKILLBRIDGE · BẢN XEM TRƯỚC · Job #{jobId}";

            // 3. Vẽ 1 đường chéo thanh mảnh chạy qua trung tâm ảnh
            canvas.Save();
            canvas.Translate(originalBitmap.Width / 2f, originalBitmap.Height / 2f);
            canvas.RotateDegrees(-22);

            canvas.DrawText(mainLabel, 0, 0, SKTextAlign.Center, font, strokePaint);
            canvas.DrawText(mainLabel, 0, 0, SKTextAlign.Center, font, fillPaint);

            canvas.Restore();

            // 4. Vẽ huy hiệu bản quyền nhỏ kín đáo ở góc dưới bên phải
            var badgeFontSize = Math.Max(11f, fontSize * 0.45f);
            using var badgeFont = new SKFont(typeface, badgeFontSize);
            var badgeLabel = $"© SkillBridge Protected · Job #{jobId}";
            var badgeMargin = 16f;
            canvas.DrawText(badgeLabel, originalBitmap.Width - badgeMargin, originalBitmap.Height - badgeMargin, SKTextAlign.Right, badgeFont, fillPaint);

            using var image = surface.Snapshot();
            var encodedFormat = ext switch
            {
                ".png" => SKEncodedImageFormat.Png,
                ".webp" => SKEncodedImageFormat.Webp,
                _ => SKEncodedImageFormat.Jpeg
            };

            using var data = image.Encode(encodedFormat, 85);
            var memoryStream = new MemoryStream();
            data.SaveTo(memoryStream);
            memoryStream.Position = 0;
            return memoryStream;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Lỗi khi đóng watermark hình ảnh cho Job {JobId}.", jobId);
            return null;
        }
    }

    private Stream? ApplyPdfWatermark(Stream inputStream, int jobId)
    {
        try
        {
            inputStream.Position = 0;
            using var document = PdfReader.Open(inputStream, PdfDocumentOpenMode.Modify);

            var font = new XFont("Helvetica", 22, XFontStyle.Bold);
            var watermarkColor = XColor.FromArgb(45, 99, 102, 241);
            var brush = new XSolidBrush(watermarkColor);
            var text = $"SKILLBRIDGE · BẢN XEM TRƯỚC · Job #{jobId}";

            for (int i = 0; i < document.Pages.Count; i++)
            {
                var page = document.Pages[i];
                using var gfx = XGraphics.FromPdfPage(page);

                var size = gfx.MeasureString(text, font);
                var centerX = page.Width.Point / 2;
                var centerY = page.Height.Point / 2;

                gfx.Save();
                gfx.TranslateTransform(centerX, centerY);
                gfx.RotateTransform(-30);
                gfx.DrawString(text, font, brush, -size.Width / 2, size.Height / 2);
                gfx.Restore();

                var badgeFont = new XFont("Helvetica", 10, XFontStyle.Regular);
                var badgeText = $"© SkillBridge Protected · Job #{jobId}";
                gfx.DrawString(badgeText, badgeFont, brush, page.Width.Point - 180, page.Height.Point - 18);
            }

            var outputStream = new MemoryStream();
            document.Save(outputStream, false);
            outputStream.Position = 0;
            return outputStream;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Lỗi khi đóng watermark PDF cho Job {JobId}.", jobId);
            return null;
        }
    }
}
