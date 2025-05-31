// ===== CART & PRODUCT DETAIL MODELS - GÜNCEL VE EKSİKSİZ =====

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;

namespace WholesaleShoeStore.Models
{
    // ===== CART ENTITY =====
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

        // ✅ JSON'dan gelen TotalPieces değeri (kutudaki parça sayısı)
        public int TotalPieces { get; set; } = 1;

        public decimal Weight { get; set; } = 0;

        [MaxLength(20)]
        public string Unit { get; set; } = "KUTU";

        public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddHours(24);

        // Navigation property
        public Customer? Customer { get; set; }

        // ✅ HESAPLANAN ÖZELLİKLER
        public decimal PricePerPiece => IsAssorted && TotalPieces > 0 ? FinalPrice / TotalPieces : FinalPrice;
        public decimal PricePerBox => IsAssorted ? FinalPrice * TotalPieces : FinalPrice;
        public decimal Subtotal => Quantity * PricePerBox;
        public int TotalPiecesOrdered => Quantity * TotalPieces;
        public decimal TotalWeight => Weight * Quantity;
        public bool HasDiscount => Price > FinalPrice;
        public decimal DiscountAmount => HasDiscount ? (Price - FinalPrice) * Quantity : 0;
    }

    // ===== CART SUMMARY ENTITY =====
    public class CartSummary : BaseEntity
    {
        public int? CustomerId { get; set; }

        [MaxLength(255)]
        public string? SessionId { get; set; }

        public int TotalItems { get; set; } = 0;
        public int TotalQuantity { get; set; } = 0;
        public int TotalPieces { get; set; } = 0; // ✅ TOPLAM PARÇA SAYISI
        public decimal SubTotal { get; set; } = 0.00m;
        public decimal DiscountAmount { get; set; } = 0.00m;
        public decimal TotalAmount { get; set; } = 0.00m;
        public decimal TotalWeight { get; set; } = 0.00m;
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;

        // Navigation property
        public Customer? Customer { get; set; }
    }

    // ===== CART HISTORY ENTITY =====
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

    // ===== PRODUCT VIEWS ENTITY =====
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

    // ===== HELPER SINIFLAR =====

    public class ProductInfo
    {
        public string ProductCode { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public decimal CampaignPrice { get; set; }
        public decimal FinalPrice { get; set; }
        public bool IsAssorted { get; set; }
        public int BoxQuantity { get; set; } = 1;
        public int TotalPieces { get; set; } = 1; // ✅ JSON'dan gelen kutudaki parça sayısı
        public int ActualStock { get; set; } // ✅ Hesaplanan stok (TotalPieces × BoxQuantity)
        public decimal Weight { get; set; }
        public string Unit { get; set; } = "KUTU";
        public Dictionary<string, int> Sizes { get; set; } = new();
        public string OuterMaterial { get; set; } = string.Empty;
        public string InnerMaterial { get; set; } = string.Empty;
        public string SoleMaterial { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public string ProductGroup { get; set; } = string.Empty;

        // ✅ Hesaplanan özellikler
        public decimal PricePerPiece => IsAssorted && TotalPieces > 0 ? FinalPrice / TotalPieces : FinalPrice;
        public decimal PricePerBox => IsAssorted ? FinalPrice * TotalPieces : FinalPrice;
        public bool HasDiscount => CampaignPrice > 0 && CampaignPrice < Price;
        public decimal DiscountPercent => HasDiscount ? Math.Round(((Price - CampaignPrice) / Price) * 100, 2) : 0;
    }

    public class CartCalculationResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public CartItemCalculations? Data { get; set; }

        public static CartCalculationResult SuccessResult(CartItemCalculations data)
        {
            return new CartCalculationResult { Success = true, Data = data };
        }

        public static CartCalculationResult ErrorResult(string message)
        {
            return new CartCalculationResult { Success = false, Message = message };
        }
    }

    public class CartItemCalculations
    {
        public string ProductCode { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public int Size { get; set; }
        public int RequestedQuantity { get; set; }
        public bool IsAssorted { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal PricePerPiece { get; set; }
        public decimal PricePerBox { get; set; }
        public int PiecesPerBox { get; set; }
        public int TotalBoxes { get; set; }
        public int TotalPieces { get; set; }
        public decimal TotalPrice { get; set; }
        public decimal Weight { get; set; }
        public string Unit { get; set; } = "KUTU";
        public string OuterMaterial { get; set; } = string.Empty;
        public string InnerMaterial { get; set; } = string.Empty;
        public string SoleMaterial { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public string ProductGroup { get; set; } = string.Empty;
    }
}

// ===== VIEW MODELS & DTOS =====

namespace WholesaleShoeStore.ViewModels
{
    #region Cart ViewModels

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

    public class UpdateCartRequest
    {
        [Required]
        public int CartId { get; set; }

        [Required]
        [Range(1, 1000)]
        public int Quantity { get; set; }
    }

    public class RemoveFromCartRequest
    {
        [Required]
        public int CartId { get; set; }

        public string? SessionId { get; set; }
    }

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

        // ✅ AYAKKABI SEKTÖRÜ İÇİN KRİTİK ALANLAR
        public int TotalPieces { get; set; } = 1; // JSON'dan gelen kutudaki parça sayısı
        public int TotalPiecesOrdered { get; set; } // Toplam sipariş edilen parça (Quantity × TotalPieces)
        public decimal PricePerPiece { get; set; } // Parça başı fiyat
        public decimal PricePerBox { get; set; } // Kutu başı fiyat

        public decimal Weight { get; set; }
        public decimal TotalWeight { get; set; }
        public string Unit { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }

        // Product details
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

    public class CartSummaryDto
    {
        public int TotalItems { get; set; }
        public int TotalQuantity { get; set; }
        public int TotalPieces { get; set; } // ✅ TOPLAM PARÇA SAYISI
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

    public class ProductDetailRequest
    {
        [Required]
        [MaxLength(50)]
        public string ProductCode { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? Color { get; set; }

        public string? SessionId { get; set; }
    }

    public class ProductVariantDto
    {
        public string Color { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public decimal FinalPrice { get; set; }
        public decimal ActualStock { get; set; } // ✅ Hesaplanan stok (TotalPieces × BoxQuantity)
        public int BoxQuantity { get; set; }
        public int TotalPieces { get; set; } = 1; // ✅ JSON'dan gelen kutudaki parça sayısı
        public decimal Weight { get; set; }
        public string Unit { get; set; } = string.Empty;
        public bool IsOnSale => Price > FinalPrice;
        public decimal DiscountPercentage => IsOnSale ? Math.Round(((Price - FinalPrice) / Price) * 100, 0) : 0;
        public Dictionary<int, int> SizeStocks { get; set; } = new();
        public List<int> AvailableSizes => SizeStocks.Where(s => s.Value > 0).Select(s => s.Key).OrderBy(s => s).ToList();
    }

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

    public class ProductImageDto
    {
        public string Url { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public bool IsPrimary { get; set; }
        public string AltText { get; set; } = string.Empty;
    }

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