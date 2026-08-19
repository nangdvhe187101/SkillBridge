using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs;

namespace SkillBridge.Application.Interfaces.Auth
{
    public interface IForgotPasswordService
    {
        Task<string> RequestOtpAsync(ForgotPasswordRequestDto dto);
        Task<VerifyOtpResultDto> VerifyOtpAsync(VerifyOtpDto dto);
        Task<string> ResetPasswordAsync(ResetPasswordDto dto);
    }
}