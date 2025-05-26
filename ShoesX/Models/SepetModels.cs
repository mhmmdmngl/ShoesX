// ===== CART & PRODUCT DETAIL MODELS =====

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using WholesaleShoeStore.ViewModels;

namespace WholesaleShoeStore.Models
{
    // Cart entity
    public class Cart : BaseEntity
    {
        public int? CustomerId { get; set; }

        [MaxLength(255)]
        public string? SessionId { get; set; }

        [Required]
        [MaxLength(50)]
        public string ProductCode { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Color { get; set; } = string.Empty;

        [Required]
        [Range(35, 50)]
        public int Size { get; set; }

        [Required]
        [Range(1, 1000)]
        public int Quantity { get; set; } = 1;

        [Required]
        [Range(0.01, 10000)]
        public decimal Price { get; set; }

        [Required]
        [Range(0.01, 10000)]
        public decimal FinalPrice { get; set; }

        public bool IsAssorted { get; set; } = false;

        public int BoxQuantity { get; set; } = 1;

        public decimal Weight { get; set; } = 0;

        [MaxLength(20)]
        public string Unit { get; set; } = "PCS";

        public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddHours(24);

    }

    // Cart Summary entity
    public class CartSummary : BaseEntity
    {
        public int? CustomerId { get; set; }

        [MaxLength(255)]
        public string? SessionId { get; set; }

        public int TotalItems { get; set; } = 0;
        public int TotalQuantity { get; set; } = 0;
        public decimal SubTotal { get; set; } = 0.00m;
        public decimal DiscountAmount { get; set; } = 0.00m;
        public decimal TotalAmount { get; set; } = 0.00m;
        public decimal TotalWeight { get; set; } = 0.00m;
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;

        // Navigation property
        public Customer? Customer { get; set; }
    }

    // Cart History entity
    public class CartHistory : BaseEntity
    {
        public int? CustomerId { get; set; }

        [MaxLength(255)]
        public string? SessionId { get; set; }

        [Required]
        [MaxLength(50)]
        public string ProductCode { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Color { get; set; } = string.Empty;

        [Required]
        public int Size { get; set; }

        [Required]
        public int Quantity { get; set; }

        [Required]
        public decimal Price { get; set; }

        [Required]
        [MaxLength(20)]
        public string Action { get; set; } = string.Empty; // ADDED, REMOVED, UPDATED, CHECKOUT, EXPIRED

        public DateTime ActionDate { get; set; } = DateTime.UtcNow;

        // Navigation property
        public Customer? Customer { get; set; }
    }

    // Product Views entity
    public class ProductView : BaseEntity
    {
        public int? CustomerId { get; set; }

        [MaxLength(255)]
        public string? SessionId { get; set; }

        [Required]
        [MaxLength(50)]
        public string ProductCode { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Color { get; set; } = string.Empty;

        public int ViewCount { get; set; } = 1;
        public DateTime LastViewedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        public Customer? Customer { get; set; }
    }
}

// ===== VIEW MODELS & DTOS =====

namespace WholesaleShoeStore.ViewModels
{
    #region Cart ViewModels

    // Add to cart request
    public class AddToCartRequest
    {
        [Required]
        [MaxLength(50)]
        public string ProductCode { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Color { get; set; } = string.Empty;

        [Required]
        [Range(35, 50)]
        public int Size { get; set; }

        [Required]
        [Range(1, 1000)]
        public int Quantity { get; set; } = 1;

        public string? SessionId { get; set; }
    }

    // Update cart item request
    public class UpdateCartRequest
    {
        [Required]
        public int CartId { get; set; }

        [Required]
        [Range(1, 1000)]
        public int Quantity { get; set; }
    }

    // Remove from cart request
    public class RemoveFromCartRequest
    {
        [Required]
        public int CartId { get; set; }

        public string? SessionId { get; set; }
    }

    // Cart item DTO
    public class CartItemDto
    {
        public int Id { get; set; }
        public string ProductCode { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public int Size { get; set; }
        public int Quantity { get; set; }
        public decimal Price { get; set; }
        public decimal FinalPrice { get; set; }
        public decimal Subtotal { get; set; }
        public decimal DiscountAmount { get; set; }
        public bool IsAssorted { get; set; }
        public int BoxQuantity { get; set; }
        public decimal Weight { get; set; }
        public decimal TotalWeight { get; set; }
        public string Unit { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }

        // Product details (joined from product data)
        public string ProductName { get; set; } = string.Empty;
        public string BrandName { get; set; } = string.Empty;
        public string OuterMaterial { get; set; } = string.Empty;
        public string InnerMaterial { get; set; } = string.Empty;
        public string SoleMaterial { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public string ProductGroup { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
        public bool HasDiscount => Price > FinalPrice;
        public decimal DiscountPercentage => HasDiscount ? Math.Round(((Price - FinalPrice) / Price) * 100, 0) : 0;
    }

    // Cart summary DTO
    public class CartSummaryDto
    {
        public int TotalItems { get; set; }
        public int TotalQuantity { get; set; }
        public decimal SubTotal { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal TotalWeight { get; set; }
        public DateTime LastUpdated { get; set; }
        public List<CartItemDto> Items { get; set; } = new();

        // Calculated properties
        public bool HasItems => TotalItems > 0;
        public bool HasDiscounts => DiscountAmount > 0;
        public decimal AverageItemPrice => TotalItems > 0 ? TotalAmount / TotalItems : 0;
    }

    #endregion

    #region Product Detail ViewModels

    // Product detail request
    public class ProductDetailRequest
    {
        [Required]
        [MaxLength(50)]
        public string ProductCode { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? Color { get; set; }

        public string? SessionId { get; set; }
    }

    // Product variant DTO
    public class ProductVariantDto
    {
        public string Color { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public decimal FinalPrice { get; set; }
        public decimal ActualStock { get; set; }
        public int BoxQuantity { get; set; }
        public decimal Weight { get; set; }
        public string Unit { get; set; } = string.Empty;
        public bool IsOnSale => Price > FinalPrice;
        public decimal DiscountPercentage => IsOnSale ? Math.Round(((Price - FinalPrice) / Price) * 100, 0) : 0;
        public Dictionary<int, int> SizeStocks { get; set; } = new();
        public List<int> AvailableSizes => SizeStocks.Where(s => s.Value > 0).Select(s => s.Key).OrderBy(s => s).ToList();
    }

    // Product detail DTO
    public class ProductDetailDto
    {
        public string ProductCode { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string BrandName { get; set; } = string.Empty;
        public string OuterMaterial { get; set; } = string.Empty;
        public string InnerMaterial { get; set; } = string.Empty;
        public string SoleMaterial { get; set; } = string.Empty;
        public string ProductGroup { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public bool IsAssorted { get; set; }
        public string Description { get; set; } = string.Empty;
        public List<ProductVariantDto> Variants { get; set; } = new();
        public ProductVariantDto? PrimaryVariant => Variants.OrderByDescending(v => v.ActualStock).FirstOrDefault();
        public List<string> AvailableColors => Variants.Select(v => v.Color).Distinct().ToList();
        public Dictionary<int, int> AllSizeStocks { get; set; } = new();
        public List<int> AllAvailableSizes => AllSizeStocks.Where(s => s.Value > 0).Select(s => s.Key).OrderBy(s => s).ToList();
        public decimal MinPrice => Variants.Any() ? Variants.Min(v => v.FinalPrice) : 0;
        public decimal MaxPrice => Variants.Any() ? Variants.Max(v => v.FinalPrice) : 0;
        public decimal TotalStock => Variants.Sum(v => v.ActualStock);
        public bool HasMultipleVariants => Variants.Count > 1;
        public bool HasStock => TotalStock > 0;
        public List<ProductImageDto> Images { get; set; } = new();
        public List<RelatedProductDto> RelatedProducts { get; set; } = new();
        public ProductStatsDto Stats { get; set; } = new();
    }

    // Product image DTO
    public class ProductImageDto
    {
        public string Url { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public bool IsPrimary { get; set; }
        public string AltText { get; set; } = string.Empty;
    }

    // Related product DTO
    public class RelatedProductDto
    {
        public string ProductCode { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string BrandName { get; set; } = string.Empty;
        public string PrimaryColor { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public decimal FinalPrice { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        public bool IsOnSale => Price > FinalPrice;
    }

    // Product statistics DTO
    public class ProductStatsDto
    {
        public int ViewCount { get; set; }
        public int CartAddCount { get; set; }
        public int OrderCount { get; set; }
        public DateTime LastViewedAt { get; set; }
        public double AverageRating { get; set; } = 0;
        public int ReviewCount { get; set; } = 0;
    }

    #endregion

    #region Checkout ViewModels

    // Checkout request
    public class CheckoutRequest
    {
        public string? SessionId { get; set; }

        [Required]
        [MaxLength(255)]
        public string ShippingAddress { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string ShippingCity { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string ShippingCountry { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? ShippingPostalCode { get; set; }

        [MaxLength(50)]
        public string PaymentMethod { get; set; } = "Cash";

        public string? Notes { get; set; }
    }

    // Checkout summary DTO
    public class CheckoutSummaryDto
    {
        public CartSummaryDto Cart { get; set; } = new();
        public decimal ShippingCost { get; set; } = 0;
        public decimal TaxAmount { get; set; } = 0;
        public decimal FinalTotal { get; set; } = 0;
        public List<string> PaymentMethods { get; set; } = new() { "Cash", "Bank Transfer", "Credit Card" };
        public string EstimatedDelivery { get; set; } = string.Empty;
    }

    #endregion
}