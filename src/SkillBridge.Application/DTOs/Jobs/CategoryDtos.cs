namespace SkillBridge.Application.DTOs.Jobs;

public record CategoryResponseDto(
    int Id,
    string Name,
    int JobCount,
    int DefaultRevisionLimit,
    string PreviewStrategy
);
