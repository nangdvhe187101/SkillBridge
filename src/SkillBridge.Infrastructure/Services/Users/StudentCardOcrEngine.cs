using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Tesseract;

namespace SkillBridge.Infrastructure.Services.Users;

/// <summary>
/// Một dòng/khối chữ nhận diện được từ ảnh, kèm vị trí đã chuẩn hoá về tỉ lệ 0-1
/// (gốc toạ độ ở góc dưới-trái, tăng lên trên — cùng quy ước với CGRect của Apple
/// Vision Framework mà script OCR cũ (scripts/student_card_ocr.swift) sử dụng, để
/// logic ghép dòng tên trong StudentVerificationService không cần đổi).
/// </summary>
public record OcrTextBlock(string Text, double X, double Y, double Width, double Height);

public interface IStudentCardOcrEngine
{
    Task<List<OcrTextBlock>> RecognizeAsync(string imagePath, CancellationToken ct = default);
}

/// <summary>
/// Nhận diện chữ trên ảnh thẻ sinh viên bằng Tesseract OCR (self-host, chạy được trên
/// Linux/Render). Thay thế cho Apple Vision Framework (scripts/student_card_ocr.swift)
/// vốn chỉ chạy được trên macOS — không hoạt động trên container production.
/// </summary>
public class TesseractStudentCardOcrEngine : IStudentCardOcrEngine
{
    private readonly ILogger<TesseractStudentCardOcrEngine> _logger;
    private const string TessDataPath = "/usr/share/tesseract-ocr/5/tessdata";

    public TesseractStudentCardOcrEngine(ILogger<TesseractStudentCardOcrEngine> logger)
    {
        _logger = logger;
    }

    public Task<List<OcrTextBlock>> RecognizeAsync(string imagePath, CancellationToken ct = default)
    {
        // Thư viện Tesseract (libtesseract wrapper) chạy đồng bộ/blocking theo thiết kế
        // gốc; bọc trong Task.Run để không chặn thread pool của ASP.NET khi gọi await.
        return Task.Run(() =>
        {
            var blocks = new List<OcrTextBlock>();

            using var engine = new TesseractEngine(TessDataPath, "vie+eng", EngineMode.Default);
            using var img = Pix.LoadFromFile(imagePath);
            var imageWidth = (double)img.Width;
            var imageHeight = (double)img.Height;

            using var page = engine.Process(img, PageSegMode.SparseText);
            using var iterator = page.GetIterator();
            iterator.Begin();

            do
            {
                ct.ThrowIfCancellationRequested();

                var text = iterator.GetText(PageIteratorLevel.TextLine)?.Trim();
                if (string.IsNullOrWhiteSpace(text))
                {
                    continue;
                }

                if (!iterator.TryGetBoundingBox(PageIteratorLevel.TextLine, out var rect))
                {
                    continue;
                }

                // Tesseract: gốc (0,0) ở góc trên-trái, Y tăng xuống dưới (đơn vị pixel).
                // Vision Framework (CGRect cũ): gốc (0,0) ở góc dưới-trái, Y tăng lên trên,
                // toạ độ đã chuẩn hoá 0-1. Quy đổi + lật trục Y để logic ghép dòng tên
                // (so sánh centerDiff/yGap) trong StudentVerificationService không đổi.
                var normalizedX = rect.X1 / imageWidth;
                var normalizedWidth = (rect.X2 - rect.X1) / imageWidth;
                var normalizedHeight = (rect.Y2 - rect.Y1) / imageHeight;
                var normalizedY = 1.0 - (rect.Y2 / imageHeight);

                blocks.Add(new OcrTextBlock(text, normalizedX, normalizedY, normalizedWidth, normalizedHeight));
            }
            while (iterator.Next(PageIteratorLevel.TextLine));

            return blocks;
        }, ct);
    }
}
