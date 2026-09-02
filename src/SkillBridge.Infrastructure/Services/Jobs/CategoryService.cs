using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Jobs;
using SkillBridge.Application.Interfaces.Jobs;
using SkillBridge.Infrastructure.Repositories.Interfaces;

namespace SkillBridge.Infrastructure.Services.Jobs;

public class CategoryService : ICategoryService
{
    private readonly ICategoryRepository _categoryRepository;

    public CategoryService(ICategoryRepository categoryRepository)
    {
        _categoryRepository = categoryRepository;
    }

    public async Task<IReadOnlyList<CategoryResponseDto>> GetAllCategoriesAsync()
    {
        var items = await _categoryRepository.GetAllWithJobCountAsync();
        return items.Select(item => new CategoryResponseDto(
            item.Category.Id,
            item.Category.Name,
            item.JobCount,
            item.Category.DefaultRevisionLimit,
            item.Category.PreviewStrategy
        )).ToList();
    }
}
