using System.Collections.Generic;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Jobs;

namespace SkillBridge.Application.Interfaces.Jobs;

public interface ICategoryService
{
    Task<IReadOnlyList<CategoryResponseDto>> GetAllCategoriesAsync();
}
