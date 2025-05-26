using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WholesaleShoeStore.Models;
using WholesaleShoeStore.Services;
using WholesaleShoeStore.ViewModels;

namespace WholesaleShoeStore.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        public async Task<ActionResult<ApiResponse<LoginResponse>>> Login([FromBody] LoginRequest request)
        {
            try
            {
                // Giriş bilgilerini doğrula
                if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
                {
                    return BadRequest(ApiResponse<LoginResponse>.ErrorResponse("Email ve şifre gereklidir"));
                }

                // Giriş işlemini gerçekleştir
                var response = await _authService.LoginAsync(request);

                if (response == null)
                {
                    return Unauthorized(ApiResponse<LoginResponse>.ErrorResponse("Geçersiz email veya şifre"));
                }

                return Ok(ApiResponse<LoginResponse>.SuccessResponse(response));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<LoginResponse>.ErrorResponse($"Bir hata oluştu: {ex.Message}"));
            }
        }

        [HttpPost("register/customer")]
        public async Task<ActionResult<ApiResponse<LoginResponse>>> RegisterCustomer([FromBody] RegisterCustomerRequest request)
        {
            try
            {
                // İstek doğrulaması (basit)
                if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
                {
                    return BadRequest(ApiResponse<LoginResponse>.ErrorResponse("Email ve şifre gereklidir"));
                }

                if (string.IsNullOrEmpty(request.CompanyName) || string.IsNullOrEmpty(request.ContactName))
                {
                    return BadRequest(ApiResponse<LoginResponse>.ErrorResponse("Şirket adı ve iletişim adı gereklidir"));
                }

                // Müşteri kaydı işlemini gerçekleştir
                var response = await _authService.RegisterCustomerAsync(request);

                if (response == null)
                {
                    return BadRequest(ApiResponse<LoginResponse>.ErrorResponse("Email zaten kullanımda"));
                }

                return Ok(ApiResponse<LoginResponse>.SuccessResponse(response));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<LoginResponse>.ErrorResponse($"Bir hata oluştu: {ex.Message}"));
            }
        }

        [HttpPost("register/admin")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<ApiResponse<bool>>> RegisterAdmin([FromBody] RegisterAdminRequest request)
        {
            try
            {
                // İstek doğrulaması (basit)
                if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
                {
                    return BadRequest(ApiResponse<bool>.ErrorResponse("Email ve şifre gereklidir"));
                }

                if (string.IsNullOrEmpty(request.FullName))
                {
                    return BadRequest(ApiResponse<bool>.ErrorResponse("Tam ad gereklidir"));
                }

                // Admin kaydı işlemini gerçekleştir
                var result = await _authService.RegisterAdminAsync(request);

                if (!result)
                {
                    return BadRequest(ApiResponse<bool>.ErrorResponse("Email zaten kullanımda"));
                }

                return Ok(ApiResponse<bool>.SuccessResponse(true, "Admin başarıyla kaydedildi"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<bool>.ErrorResponse($"Bir hata oluştu: {ex.Message}"));
            }
        }

        [HttpPost("refresh-token")]
        public async Task<ActionResult<ApiResponse<LoginResponse>>> RefreshToken([FromBody] RefreshTokenRequest request)
        {
            try
            {
                // İstek doğrulaması
                if (string.IsNullOrEmpty(request.RefreshToken))
                {
                    return BadRequest(ApiResponse<LoginResponse>.ErrorResponse("Refresh token gereklidir"));
                }

                // Token yenileme işlemini gerçekleştir
                var response = await _authService.RefreshTokenAsync(request.RefreshToken);

                if (response == null)
                {
                    return Unauthorized(ApiResponse<LoginResponse>.ErrorResponse("Geçersiz veya süresi dolmuş refresh token"));
                }

                return Ok(ApiResponse<LoginResponse>.SuccessResponse(response));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<LoginResponse>.ErrorResponse($"Bir hata oluştu: {ex.Message}"));
            }
        }

        [HttpPost("revoke-token")]
        [Authorize]
        public async Task<ActionResult<ApiResponse<bool>>> RevokeToken([FromBody] RefreshTokenRequest request)
        {
            try
            {
                // İstek doğrulaması
                if (string.IsNullOrEmpty(request.RefreshToken))
                {
                    return BadRequest(ApiResponse<bool>.ErrorResponse("Refresh token gereklidir"));
                }

                // Token iptal işlemini gerçekleştir
                var result = await _authService.RevokeTokenAsync(request.RefreshToken);

                if (!result)
                {
                    return BadRequest(ApiResponse<bool>.ErrorResponse("Geçersiz veya zaten iptal edilmiş token"));
                }

                return Ok(ApiResponse<bool>.SuccessResponse(true, "Token başarıyla iptal edildi"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<bool>.ErrorResponse($"Bir hata oluştu: {ex.Message}"));
            }
        }

        [HttpGet("validate-token")]
        public async Task<ActionResult<ApiResponse<bool>>> ValidateToken([FromQuery] string token)
        {
            try
            {
                // Token doğrulaması
                if (string.IsNullOrEmpty(token))
                {
                    return BadRequest(ApiResponse<bool>.ErrorResponse("Token gereklidir"));
                }

                // Token geçerlilik kontrolü
                var isValid = await _authService.ValidateTokenAsync(token);

                return Ok(ApiResponse<bool>.SuccessResponse(isValid));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<bool>.ErrorResponse($"Bir hata oluştu: {ex.Message}"));
            }
        }

        [HttpGet("current-user")]
        [Authorize]
        public ActionResult<ApiResponse<UserInfo>> GetCurrentUser()
        {
            try
            {
                // Kullanıcı bilgilerini al
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
                var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;

                if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(email) || string.IsNullOrEmpty(role))
                {
                    return Unauthorized(ApiResponse<UserInfo>.ErrorResponse("Kullanıcı bilgileri bulunamadı"));
                }

                var userInfo = new UserInfo
                {
                    Id = int.Parse(userId),
                    Email = email,
                    UserType = role
                };

                return Ok(ApiResponse<UserInfo>.SuccessResponse(userInfo));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<UserInfo>.ErrorResponse($"Bir hata oluştu: {ex.Message}"));
            }
        }
    }

    // Kullanıcı bilgilerini döndürmek için yardımcı sınıf
    public class UserInfo
    {
        public int Id { get; set; }
        public string Email { get; set; }
        public string UserType { get; set; }
    }
}