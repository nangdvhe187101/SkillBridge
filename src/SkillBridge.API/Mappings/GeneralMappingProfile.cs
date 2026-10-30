using AutoMapper;
using SkillBridge.Application.DTOs.Jobs;
using SkillBridge.Application.DTOs.Payments;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.API.Mappings;

/// <summary>
/// AutoMapper Profile ánh xạ hai chiều giữa Data Entities và Application DTOs.
/// </summary>
public class GeneralMappingProfile : Profile
{
    public GeneralMappingProfile()
    {
        // 1. Category Mapping
        CreateMap<Category, CategoryResponseDto>()
            .ConstructUsing(src => new CategoryResponseDto(
                src.Id,
                src.Name,
                src.Jobs != null ? src.Jobs.Count : 0,
                src.DefaultRevisionLimit,
                src.PreviewStrategy
            ));

        // 2. Job Mapping
        CreateMap<Job, JobODataDto>()
            .ForMember(dest => dest.CategoryName, opt => opt.MapFrom(src => src.Category != null ? src.Category.Name : null));

        // 3. SubscriptionPlanConfig Mapping
        CreateMap<SubscriptionPlanConfig, SubscriptionPlanConfigDto>()
            .ForMember(dest => dest.Features, opt => opt.MapFrom(src =>
                string.IsNullOrWhiteSpace(src.FeaturesJson)
                    ? new List<string>()
                    : System.Text.Json.JsonSerializer.Deserialize<List<string>>(src.FeaturesJson, (System.Text.Json.JsonSerializerOptions?)null) ?? new List<string>()));
    }
}

/// <summary>
/// DTO phẳng tối ưu hóa cho truy vấn OData ($select, $filter, $orderby)
/// </summary>
public class JobODataDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public string? Location { get; set; }
    public decimal Budget { get; set; }
    public bool IsUrgent { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? DeadlineAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
