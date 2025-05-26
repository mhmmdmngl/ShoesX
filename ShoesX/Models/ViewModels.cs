using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace WholesaleShoeStore.ViewModels
{
    #region Request Models

    // Login request
    public class LoginRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;
    }

    // Register customer request
    public class RegisterCustomerRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]
        public string Password { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string CompanyName { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string ContactName { get; set; } = string.Empty;

        [MaxLength(30)]
        public string? TaxId { get; set; }

        [MaxLength(255)]
        public string? Address { get; set; }

        [MaxLength(50)]
        public string? City { get; set; }

        [MaxLength(50)]
        public string? Country { get; set; }

        [MaxLength(20)]
        public string? PostalCode { get; set; }
    }

    // Register admin request
    public class RegisterAdminRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]
        public string Password { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? Position { get; set; }
    }

    // Refresh token request
    public class RefreshTokenRequest
    {
        [Required]
        public string RefreshToken { get; set; } = string.Empty;
    }

    // Brand oluşturma/güncelleme
    public class CreateBrandRequest
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        [MaxLength(255)]
        public string? LogoUrl { get; set; }

        [MaxLength(100)]
        public string? Country { get; set; }
    }

    // Ayakkabı oluşturma/güncelleme
    public class CreateShoeRequest
    {
        [Required]
        public int BrandId { get; set; }

        [Required]
        [MaxLength(50)]
        public string ProductCode { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Gender { get; set; } = string.Empty;

        [Required]
        [MaxLength(30)]
        public string Color { get; set; } = string.Empty;

        [Required]
        [Range(0.01, 10000)]
        public decimal Price { get; set; }

        [MaxLength(255)]
        public string? ImageUrl { get; set; }

        public string? Description { get; set; }

        [MaxLength(100)]
        public string? InnerMaterial { get; set; }

        [MaxLength(100)]
        public string? OuterMaterial { get; set; }

        [MaxLength(100)]
        public string? SoleMaterial { get; set; }

        public decimal Weight { get; set; } = 0;

        public int PiecesPerBox { get; set; } = 1;

        public bool IsAssorted { get; set; } = false;

        [MaxLength(20)]
        public string MainUnit { get; set; } = "ADET";

        public List<InitialStockRequest> InitialStocks { get; set; } = new();
    }

    // İlk stok girişi
    public class InitialStockRequest
    {
        [Required]
        [Range(35, 50)]
        public int Size { get; set; }

        [Required]
        [Range(0, 1000)]
        public int Quantity { get; set; }
    }

    // Stok hareketi oluşturma
    public class CreateStockMovementRequest
    {
        [Required]
        public int ShoeId { get; set; }

        [Required]
        [Range(35, 50)]
        public int Size { get; set; }

        [Required]
        [MaxLength(20)]
        public string MovementType { get; set; } = string.Empty;

        [Required]
        public int Quantity { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }

        [MaxLength(100)]
        public string? Reference { get; set; }
    }

    #endregion

    #region Response Models

    // Login response
    public class LoginResponse
    {
        public int UserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string UserType { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public DateTime TokenExpires { get; set; }
        public DateTime RefreshTokenExpires { get; set; }
    }

    // API response wrapper
    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public T? Data { get; set; }
        public List<string> Errors { get; set; } = new();

        public static ApiResponse<T> SuccessResponse(T data, string message = "İşlem başarıyla tamamlandı")
        {
            return new ApiResponse<T>
            {
                Success = true,
                Message = message,
                Data = data,
                Errors = new List<string>()
            };
        }

        public static ApiResponse<T> ErrorResponse(string message, List<string>? errors = null)
        {
            return new ApiResponse<T>
            {
                Success = false,
                Message = message,
                Data = default,
                Errors = errors ?? new List<string>()
            };
        }
    }

    #endregion

    #region Filter Models

    // Base filter
    public class BaseFilter
    {
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public string SortBy { get; set; } = "Id";
        public bool SortAscending { get; set; } = true;
    }

    // Brand filtresi
    public class BrandFilter : BaseFilter
    {
        public string? NameContains { get; set; }
        public string? Country { get; set; }
    }

    // Shoe filter
    public class ShoeFilter : BaseFilter
    {
        public List<int>? BrandIds { get; set; }
        public List<string>? Brands { get; set; }
        public List<string>? Types { get; set; }
        public List<string>? Genders { get; set; }
        public List<string>? Colors { get; set; }
        public List<int>? Sizes { get; set; }
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public string? ProductCodeContains { get; set; }
        public string? NameContains { get; set; }
        public bool? IsAssorted { get; set; }
        public bool? HasStock { get; set; }
        public string? InnerMaterial { get; set; }
        public string? OuterMaterial { get; set; }
    }

    // Stok hareketi filtresi
    public class StockMovementFilter : BaseFilter
    {
        public int? ShoeId { get; set; }
        public List<string>? MovementTypes { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? Reference { get; set; }
        public int? UserId { get; set; }
    }

    // ShoeBox filter
    public class ShoeBoxFilter : BaseFilter
    {
        public string? NameContains { get; set; }
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public int? MinTotalPairs { get; set; }
        public int? MaxTotalPairs { get; set; }
    }

    // Order filter
    public class OrderFilter : BaseFilter
    {
        public int? CustomerId { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public List<string>? Statuses { get; set; }
        public List<string>? PaymentStatuses { get; set; }
        public decimal? MinAmount { get; set; }
        public decimal? MaxAmount { get; set; }
    }

    // Customer filter
    public class CustomerFilter : BaseFilter
    {
        public string? CompanyNameContains { get; set; }
        public string? ContactNameContains { get; set; }
        public string? Country { get; set; }
        public string? City { get; set; }
    }

    #endregion

    #region Pagination

    // Paged result
    public class PagedResult<T>
    {
        public List<T> Items { get; set; } = new();
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public int TotalCount { get; set; }
        public int TotalPages { get; set; }

        public bool HasPreviousPage => PageNumber > 1;
        public bool HasNextPage => PageNumber < TotalPages;

        public static PagedResult<T> Create(List<T> items, int totalCount, int pageNumber, int pageSize)
        {
            return new PagedResult<T>
            {
                Items = items,
                PageNumber = pageNumber,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            };
        }
    }

    #endregion

    #region DTO Models

    // Brand DTO
    public class BrandDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? LogoUrl { get; set; }
        public string? Country { get; set; }
        public int ShoeCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // Shoe DTO
    public class ShoeDto
    {
        public int Id { get; set; }
        public int BrandId { get; set; }
        public string BrandName { get; set; } = string.Empty;
        public string ProductCode { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string? ImageUrl { get; set; }
        public string? Description { get; set; }
        public string? InnerMaterial { get; set; }
        public string? OuterMaterial { get; set; }
        public string? SoleMaterial { get; set; }
        public decimal Weight { get; set; }
        public int PiecesPerBox { get; set; }
        public bool IsAssorted { get; set; }
        public string MainUnit { get; set; } = string.Empty;
        public int TotalStockQuantity { get; set; }
        public List<ShoeStockDto> SizeStocks { get; set; } = new();
        public DateTime CreatedAt { get; set; }
    }

    // Stok DTO
    public class ShoeStockDto
    {
        public int Id { get; set; }
        public int ShoeId { get; set; }
        public int Size { get; set; }
        public int StockQuantity { get; set; }
        public int ReservedQuantity { get; set; }
        public int AvailableQuantity { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // Stok hareketi DTO
    public class StockMovementDto
    {
        public int Id { get; set; }
        public int ShoeId { get; set; }
        public string ShoeProductCode { get; set; } = string.Empty;
        public string ShoeName { get; set; } = string.Empty;
        public string BrandName { get; set; } = string.Empty;
        public int Size { get; set; }
        public string MovementType { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public int PreviousStock { get; set; }
        public int NewStock { get; set; }
        public string? Notes { get; set; }
        public string? Reference { get; set; }
        public DateTime CreatedAt { get; set; }
        public string UserName { get; set; } = string.Empty;
    }

    // ShoeBox DTO
    public class ShoeBoxDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? BoxCode { get; set; }
        public string? Description { get; set; }
        public decimal Price { get; set; }
        public int TotalPairs { get; set; }
        public string? ImageUrl { get; set; }
        public decimal TotalWeight { get; set; }
        public string BoxType { get; set; } = string.Empty;
        public List<ShoeBoxItemDto> Items { get; set; } = new();
    }

    // ShoeBoxItem DTO
    public class ShoeBoxItemDto
    {
        public int ShoeId { get; set; }
        public string Brand { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public int Quantity { get; set; }
    }

    // Order DTO
    public class OrderDto
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public string CustomerCompanyName { get; set; } = string.Empty;
        public DateTime OrderDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public string? ShippingAddress { get; set; }
        public string? ShippingCity { get; set; }
        public string? ShippingCountry { get; set; }
        public string? ShippingPostalCode { get; set; }
        public string? PaymentMethod { get; set; }
        public string PaymentStatus { get; set; } = string.Empty;
        public List<OrderItemDto> Items { get; set; } = new();
    }

    // OrderItem DTO
    public class OrderItemDto
    {
        public int Id { get; set; }
        public int ShoeBoxId { get; set; }
        public string ShoeBoxName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal Price { get; set; }
        public decimal Subtotal { get; set; }
    }

    // Customer DTO
    public class CustomerDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
        public string ContactName { get; set; } = string.Empty;
        public string? TaxId { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? Country { get; set; }
        public string? PostalCode { get; set; }
    }

    // Admin DTO
    public class AdminDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Position { get; set; }
    }

    #endregion
}