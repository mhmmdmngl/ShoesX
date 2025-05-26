using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Dapper;
using Microsoft.IdentityModel.Tokens;
using WholesaleShoeStore.Models;
using WholesaleShoeStore.Repositories;
using WholesaleShoeStore.ViewModels;
using BC = BCrypt.Net.BCrypt;

namespace WholesaleShoeStore.Services
{
    public interface IAuthService
    {
        Task<LoginResponse> LoginAsync(LoginRequest request);
        Task<LoginResponse> RegisterCustomerAsync(RegisterCustomerRequest request);
        Task<bool> RegisterAdminAsync(RegisterAdminRequest request);
        Task<LoginResponse> RefreshTokenAsync(string refreshToken);
        Task<bool> RevokeTokenAsync(string refreshToken);
        Task<bool> ValidateTokenAsync(string token);
    }

    public class AuthService : IAuthService
    {
        private readonly IGenericRepository<User> _userRepository;
        private readonly IGenericRepository<Customer> _customerRepository;
        private readonly IGenericRepository<Admin> _adminRepository;
        private readonly IGenericRepository<RefreshToken> _refreshTokenRepository;
        private readonly IConfiguration _configuration;

        public AuthService(
            IGenericRepository<User> userRepository,
            IGenericRepository<Customer> customerRepository,
            IGenericRepository<Admin> adminRepository,
            IGenericRepository<RefreshToken> refreshTokenRepository,
            IConfiguration configuration)
        {
            _userRepository = userRepository;
            _customerRepository = customerRepository;
            _adminRepository = adminRepository;
            _refreshTokenRepository = refreshTokenRepository;
            _configuration = configuration;
        }

        public async Task<LoginResponse> LoginAsync(LoginRequest request)
        {
            // Kullanıcıyı email ile bul
            var user = await _userRepository.QuerySingleOrDefaultAsync(
                "SELECT * FROM Users WHERE Email = @Email",
                new { Email = request.Email });

            if (user == null)
            {
                return null; // Kullanıcı bulunamadı
            }
            var sonuc = BC.HashPassword("Test123!");
            // Şifreyi doğrula
            if (!BC.Verify(request.Password, user.PasswordHash))
            {
                return null; // Şifre yanlış
            }

            // JWT token oluştur
            var (token, tokenExpires) = GenerateJwtToken(user);

            // Refresh token oluştur
            var refreshToken = GenerateRefreshToken();
            refreshToken.UserId = user.Id;

            // Refresh token'ı kaydet
            await _refreshTokenRepository.AddAsync(refreshToken);

            // Login yanıtını oluştur
            return new LoginResponse
            {
                UserId = user.Id,
                Email = user.Email,
                UserType = user.UserType,
                Token = token,
                RefreshToken = refreshToken.Token,
                TokenExpires = tokenExpires,
                RefreshTokenExpires = refreshToken.Expires
            };
        }

        public async Task<LoginResponse> RegisterCustomerAsync(RegisterCustomerRequest request)
        {
            // Email'in kullanımda olup olmadığını kontrol et
            var existingUser = await _userRepository.QuerySingleOrDefaultAsync(
                "SELECT * FROM Users WHERE Email = @Email",
                new { Email = request.Email });

            if (existingUser != null)
            {
                return null; // Email zaten kullanımda
            }

            // Yeni kullanıcı oluştur
            var user = new User
            {
                Email = request.Email,
                PasswordHash = BC.HashPassword(request.Password),
                UserType = "Customer",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Transaction ile kullanıcı ve müşteri oluştur
            var userId = await _userRepository.ExecuteTransactionAsync<int>(async (connection, transaction) =>
            {
                // Kullanıcıyı ekle
                var userSql = @"
                    INSERT INTO Users (Email, PasswordHash, UserType, CreatedAt, UpdatedAt) 
                    VALUES (@Email, @PasswordHash, @UserType, @CreatedAt, @UpdatedAt);
                    SELECT LAST_INSERT_ID();";

                var newUserId = await connection.ExecuteScalarAsync<int>(userSql, user, transaction);

                // Müşteri bilgilerini ekle
                var customerSql = @"
                    INSERT INTO Customers (UserId, CompanyName, ContactName, TaxId, Address, City, Country, PostalCode, IsActive) 
                    VALUES (@UserId, @CompanyName, @ContactName, @TaxId, @Address, @City, @Country, @PostalCode, @IsActive)";

                var customer = new Customer
                {
                    UserId = newUserId,
                    CompanyName = request.CompanyName,
                    ContactName = request.ContactName,
                    TaxId = request.TaxId,
                    Address = request.Address,
                    City = request.City,
                    Country = request.Country,
                    PostalCode = request.PostalCode,
                    IsActive = true
                };

                await connection.ExecuteAsync(customerSql, customer, transaction);

                return newUserId;
            });

            // Id'yi ayarla
            user.Id = userId;

            // JWT token oluştur
            var (token, tokenExpires) = GenerateJwtToken(user);

            // Refresh token oluştur
            var refreshToken = GenerateRefreshToken();
            refreshToken.UserId = user.Id;

            // Refresh token'ı kaydet
            await _refreshTokenRepository.AddAsync(refreshToken);

            // Login yanıtını oluştur
            return new LoginResponse
            {
                UserId = user.Id,
                Email = user.Email,
                UserType = user.UserType,
                Token = token,
                RefreshToken = refreshToken.Token,
                TokenExpires = tokenExpires,
                RefreshTokenExpires = refreshToken.Expires
            };
        }

        public async Task<bool> RegisterAdminAsync(RegisterAdminRequest request)
        {
            // Email'in kullanımda olup olmadığını kontrol et
            var existingUser = await _userRepository.QuerySingleOrDefaultAsync(
                "SELECT * FROM Users WHERE Email = @Email",
                new { Email = request.Email });

            if (existingUser != null)
            {
                return false; // Email zaten kullanımda
            }

            // Yeni kullanıcı oluştur
            var user = new User
            {
                Email = request.Email,
                PasswordHash = BC.HashPassword(request.Password),
                UserType = "Admin",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Transaction ile kullanıcı ve admin oluştur
            var userId = await _userRepository.ExecuteTransactionAsync<int>(async (connection, transaction) =>
            {
                // Kullanıcıyı ekle
                var userSql = @"
                    INSERT INTO Users (Email, PasswordHash, UserType, CreatedAt, UpdatedAt) 
                    VALUES (@Email, @PasswordHash, @UserType, @CreatedAt, @UpdatedAt);
                    SELECT LAST_INSERT_ID();";

                var newUserId = await connection.ExecuteScalarAsync<int>(userSql, user, transaction);

                // Admin bilgilerini ekle
                var adminSql = @"
                    INSERT INTO Admins (UserId, FullName, Position) 
                    VALUES (@UserId, @FullName, @Position)";

                var admin = new Admin
                {
                    UserId = newUserId,
                    FullName = request.FullName,
                    Position = request.Position
                };

                await connection.ExecuteAsync(adminSql, admin, transaction);

                return newUserId;
            });

            return userId > 0;
        }

        public async Task<LoginResponse> RefreshTokenAsync(string refreshToken)
        {
            // Refresh token'ı bul
            var token = await _refreshTokenRepository.QuerySingleOrDefaultAsync(
                "SELECT * FROM RefreshTokens WHERE Token = @Token",
                new { Token = refreshToken });

            if (token == null || token.Revoked != null || DateTime.UtcNow >= token.Expires)
            {
                return null; // Token geçersiz veya süresi dolmuş
            }

            // Kullanıcıyı bul
            var user = await _userRepository.GetByIdAsync(token.UserId);
            if (user == null)
            {
                return null; // Kullanıcı bulunamadı
            }

            // Yeni JWT token oluştur
            var (newToken, tokenExpires) = GenerateJwtToken(user);

            // Yeni refresh token oluştur
            var newRefreshToken = GenerateRefreshToken();
            newRefreshToken.UserId = user.Id;

            // Eski refresh token'ı iptal et ve yenisiyle değiştir
            await _refreshTokenRepository.ExecuteTransactionAsync(async (connection, transaction) =>
            {
                // Eski token'ı güncelle
                var updateSql = @"
                    UPDATE RefreshTokens 
                    SET Revoked = @Revoked, ReplacedByToken = @ReplacedByToken 
                    WHERE Id = @Id";

                await connection.ExecuteAsync(updateSql, new
                {
                    Id = token.Id,
                    Revoked = DateTime.UtcNow,
                    ReplacedByToken = newRefreshToken.Token
                }, transaction);

                // Yeni token'ı ekle
                var insertSql = @"
                    INSERT INTO RefreshTokens (UserId, Token, Expires, Created) 
                    VALUES (@UserId, @Token, @Expires, @Created)";

                await connection.ExecuteAsync(insertSql, newRefreshToken, transaction);
            });

            // Login yanıtını oluştur
            return new LoginResponse
            {
                UserId = user.Id,
                Email = user.Email,
                UserType = user.UserType,
                Token = newToken,
                RefreshToken = newRefreshToken.Token,
                TokenExpires = tokenExpires,
                RefreshTokenExpires = newRefreshToken.Expires
            };
        }

        public async Task<bool> RevokeTokenAsync(string refreshToken)
        {
            // Refresh token'ı bul
            var token = await _refreshTokenRepository.QuerySingleOrDefaultAsync(
                "SELECT * FROM RefreshTokens WHERE Token = @Token",
                new { Token = refreshToken });

            if (token == null || token.Revoked != null)
            {
                return false; // Token bulunamadı veya zaten iptal edilmiş
            }

            // Token'ı iptal et
            var sql = @"
                UPDATE RefreshTokens 
                SET Revoked = @Revoked 
                WHERE Id = @Id";

            var result = await _refreshTokenRepository.ExecuteAsync(sql, new
            {
                Id = token.Id,
                Revoked = DateTime.UtcNow
            });

            return result > 0;
        }

        public async Task<bool> ValidateTokenAsync(string token)
        {
            if (string.IsNullOrEmpty(token))
                return false;

            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"]);

            try
            {
                tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = true,
                    ValidIssuer = _configuration["Jwt:Issuer"],
                    ValidateAudience = true,
                    ValidAudience = _configuration["Jwt:Audience"],
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                }, out SecurityToken validatedToken);

                return true;
            }
            catch
            {
                return false;
            }
        }

        private (string token, DateTime expires) GenerateJwtToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"]);
            var expires = DateTime.UtcNow.AddMinutes(Convert.ToDouble(_configuration["Jwt:ExpiryMinutes"]));

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.UserType)
            };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = expires,
                Issuer = _configuration["Jwt:Issuer"],
                Audience = _configuration["Jwt:Audience"],
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return (tokenHandler.WriteToken(token), expires);
        }

        private RefreshToken GenerateRefreshToken()
        {
            var token = new RefreshToken
            {
                Token = Convert.ToBase64String(Guid.NewGuid().ToByteArray()),
                Expires = DateTime.UtcNow.AddDays(Convert.ToDouble(_configuration["Jwt:RefreshTokenExpiryDays"])),
                Created = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Hesaplanmış özellikleri güncelle
            token.UpdateComputedProperties();

            return token;
        }
    }
}