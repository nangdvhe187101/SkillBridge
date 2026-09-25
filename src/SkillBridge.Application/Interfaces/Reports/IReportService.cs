using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Reports;

namespace SkillBridge.Application.Interfaces.Reports;

public interface IReportService
{
    Task<ReportResponse> CreateReportAsync(int reporterId, CreateReportRequest request, CancellationToken cancellationToken = default);
}
