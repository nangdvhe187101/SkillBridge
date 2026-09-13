namespace SkillBridge.Application.Common;

public static class PaymentConstants
{
    // Trạng thái gói thuê bao
    public const string ActiveSubscriptionStatus = "active";
    public const string CancelledSubscriptionStatus = "cancelled";

    // Từ khóa nhận diện gói (legacy compatibility)
    public const string VipPlanKeyword = "VIP";
    public const string ProPlanKeyword = "Pro";
    public const string GrowthPlanKeyword = "Growth";
    public const string MasterPlanKeyword = "Master";
    public const string StarterPlanKeyword = "Starter";

    // Mã gói chuẩn (Plan Codes)
    public const string PlanEmpStarter = "EMP_STARTER";
    public const string PlanEmpGrowth = "EMP_GROWTH";
    public const string PlanEmpVip = "EMP_VIP";

    public const string PlanStuStarter = "STU_STARTER";
    public const string PlanStuPro = "STU_PRO";
    public const string PlanStuMaster = "STU_MASTER";

    // Tên hiển thị của gói (Plan Names)
    public const string PlanNameEmpStarter = "Employer Starter";
    public const string PlanNameEmpGrowth = "Employer Growth";
    public const string PlanNameEmpVip = "VIP Business Suite";

    public const string PlanNameStuStarter = "Student Starter";
    public const string PlanNameStuPro = "Freelance Pro";
    public const string PlanNameStuMaster = "Master Talent";

    // Giá thuê bao hàng tháng (VNĐ)
    public const decimal PriceEmpStarter = 49000m;
    public const decimal PriceEmpGrowth = 89000m;
    public const decimal PriceEmpVip = 149000m;

    public const decimal PriceStuStarter = 29000m;
    public const decimal PriceStuPro = 49000m;
    public const decimal PriceStuMaster = 99000m;

    // Tỷ lệ phí hoa hồng nền tảng (Commission Rates)
    public const decimal DefaultCommissionRate = 0.10m;  // 10%
    public const decimal StarterCommissionRate = 0.08m;  // 8%
    public const decimal ProOrVipCommissionRate = 0.05m; // 5%
    public const decimal MasterCommissionRate = 0.03m;   // 3%
}


