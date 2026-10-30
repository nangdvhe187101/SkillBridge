using AutoMapper;
using AutoMapper.QueryableExtensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Query;
using Microsoft.AspNetCore.OData.Routing.Controllers;
using Microsoft.EntityFrameworkCore;
using SkillBridge.API.Mappings;
using SkillBridge.Infrastructure.Data;

namespace SkillBridge.API.Controllers.odata;

/// <summary>
/// OData Controller hỗ trợ truy vấn dữ liệu linh hoạt bằng OData protocol ($select, $filter, $orderby, $top, $skip, $count)
/// Endpoint: GET /api/odata/jobs
/// </summary>
[ApiController]
[Route("api/odata/jobs")]
[Produces("application/json", "application/xml", "text/csv")]
public class JobsODataController : ControllerBase
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly IMapper _mapper;

    public JobsODataController(SkillBridgeDbContext dbContext, IMapper mapper)
    {
        _dbContext = dbContext;
        _mapper = mapper;
    }

    /// <summary>
    /// Lấy danh sách công việc có hỗ trợ OData Query.
    /// Ví dụ: /api/odata/jobs?$select=id,title,budget&$filter=budget gt 500000&$orderby=budget desc
    /// </summary>
    [HttpGet]
    [EnableQuery(PageSize = 50)]
    public ActionResult<IQueryable<JobODataDto>> Get()
    {
        var query = _dbContext.Jobs
            .AsNoTracking()
            .Include(j => j.Category)
            .ProjectTo<JobODataDto>(_mapper.ConfigurationProvider);

        return Ok(query);
    }
}
