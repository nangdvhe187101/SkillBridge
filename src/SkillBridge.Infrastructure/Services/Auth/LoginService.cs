using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs;
using SkillBridge.Application.Interfaces;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Repositories.Interfaces;

namespace SkillBridge.Infrastructure.Services
{
    public class LoginService : ILoginService
    {
        private readonly IUserRepository userRepository;
        private readonly IJwtService jwtService;
        private readonly IAuthTokenRepository authTokenRepository;

        public LoginService(IUserRepository _userRepository, IJwtService _jwtService, IAuthTokenRepository _authTokenRepository)
        {
            userRepository = _userRepository;
            jwtService = _jwtService;
            authTokenRepository = _authTokenRepository;
        }

        public async Task<(AuthResponseDto Result, string RefreshToken)> LoginAsync(LoginDto dto)
        {
            if (string.IsNullOrEmpty(dto.Email) || string.IsNullOrEmpty(dto.Password))
                throw new BusinessException("Vui lòng nhập email và mật khẩu");

            var user = await userRepository.GetByEmailWithRoleAsync(dto.Email);
            if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                throw new BusinessException("Email hoặc mật khẩu không đúng");

            if (user.AccountStatus == "pending")
                throw new BusinessException("Tài khoản chưa được kích hoạt, vui lòng kiểm tra email để xác thực trước khi đăng nhập");
            if (user.AccountStatus == "locked" || user.AccountStatus == "blacklisted")
                throw new BusinessException("Tài khoản đã bị khóa, vui lòng liên hệ hỗ trợ");

            var accessToken = jwtService.GenerateToken(user.Id, user.Email, user.Role.Code);
            var refreshToken = jwtService.GenerateRefreshTokenString();

            await authTokenRepository.AddAsync(new AuthToken
            {
                UserId = user.Id,
                TokenType = "refresh",
                TokenHash = TokenHasher.HashToken(refreshToken),
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                CreatedAt = DateTime.UtcNow
            });

            await authTokenRepository.SaveChangesAsync();

            var result = new AuthResponseDto
            {
                Token = accessToken,
                UserId = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                RoleCode = user.Role.Code
            };

            return (result, refreshToken);
        }
    }
}