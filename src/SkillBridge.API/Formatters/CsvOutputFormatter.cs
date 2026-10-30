using System.Collections;
using System.Reflection;
using System.Text;
using Microsoft.AspNetCore.Mvc.Formatters;
using Microsoft.Net.Http.Headers;

namespace SkillBridge.API.Formatters;

/// <summary>
/// Custom Output Formatter hỗ trợ xuất dữ liệu ra định dạng CSV (text/csv).
/// Hỗ trợ cả danh sách (IEnumerable) và đối tượng đơn lẻ.
/// </summary>
public class CsvOutputFormatter : TextOutputFormatter
{
    public CsvOutputFormatter()
    {
        SupportedMediaTypes.Add(MediaTypeHeaderValue.Parse("text/csv"));
        SupportedEncodings.Add(Encoding.UTF8);
        SupportedEncodings.Add(Encoding.Unicode);
    }

    protected override bool CanWriteType(Type? type)
    {
        if (type == null)
            return false;

        // Cho phép định dạng hầu hết các class/DTO/collections, ngoại trừ kiểu nguyên thủy thuần
        return !type.IsPrimitive && type != typeof(string);
    }

    public override async Task WriteResponseBodyAsync(OutputFormatterWriteContext context, Encoding selectedEncoding)
    {
        var response = context.HttpContext.Response;
        var buffer = new StringBuilder();

        if (context.Object is IEnumerable enumerable && context.Object is not string)
        {
            var enumerator = enumerable.GetEnumerator();
            if (enumerator.MoveNext())
            {
                var firstItem = enumerator.Current;
                if (firstItem != null)
                {
                    var properties = firstItem.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance)
                        .Where(p => p.CanRead && IsSimpleType(p.PropertyType))
                        .ToList();

                    // Header row
                    buffer.AppendLine(string.Join(",", properties.Select(p => EscapeCsvValue(p.Name))));

                    // First data row
                    buffer.AppendLine(string.Join(",", properties.Select(p => EscapeCsvValue(p.GetValue(firstItem)?.ToString()))));

                    // Subsequent rows
                    while (enumerator.MoveNext())
                    {
                        var item = enumerator.Current;
                        if (item != null)
                        {
                            buffer.AppendLine(string.Join(",", properties.Select(p => EscapeCsvValue(p.GetValue(item)?.ToString()))));
                        }
                    }
                }
            }
        }
        else if (context.Object != null)
        {
            var item = context.Object;
            var properties = item.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance)
                .Where(p => p.CanRead && IsSimpleType(p.PropertyType))
                .ToList();

            buffer.AppendLine(string.Join(",", properties.Select(p => EscapeCsvValue(p.Name))));
            buffer.AppendLine(string.Join(",", properties.Select(p => EscapeCsvValue(p.GetValue(item)?.ToString()))));
        }

        await response.WriteAsync(buffer.ToString(), selectedEncoding);
    }

    private static bool IsSimpleType(Type type)
    {
        var underlying = Nullable.GetUnderlyingType(type) ?? type;
        return underlying.IsPrimitive
               || underlying.IsEnum
               || underlying == typeof(string)
               || underlying == typeof(decimal)
               || underlying == typeof(DateTime)
               || underlying == typeof(DateTimeOffset)
               || underlying == typeof(TimeSpan)
               || underlying == typeof(Guid);
    }

    private static string EscapeCsvValue(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return string.Empty;

        if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }

        return value;
    }
}
