using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace WholesaleShoeStore.Models
{
    // Base Entity
    public class BaseEntity
    {
        public int Id { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public bool IsActive { get; set; } = true;
    }

    // User entity
    public class User : BaseEntity
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        public string UserType { get; set; } = string.Empty;

        // Navigation properties
        public Customer? Customer { get; set; }
        public Admin? Admin { get; set; }
        public List<StockMovement> StockMovements { get; set; } = new();
    }

    // Customer entity
    public class Customer : BaseEntity
    {
        public int UserId { get; set; }

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

        // Navigation properties
        public User User { get; set; } = null!;
        public List<Order> Orders { get; set; } = new();
    }

    // Admin entity
    public class Admin : BaseEntity
    {
        public int UserId { get; set; }

        [Required]
        [MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? Position { get; set; }

        // Navigation property
        public User User { get; set; } = null!;
    }

    // Brand entity
    public class Brand : BaseEntity
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

        // Navigation properties
        public List<Shoe> Shoes { get; set; } = new();
    }

    // Shoe entity - Excel uyumlu
    public class Shoe : BaseEntity
    {
        public int BrandId { get; set; }

        [Required]
        [MaxLength(50)]
        public string ProductCode { get; set; } = string.Empty; // Kart Kodu

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
        public string? InnerMaterial { get; set; } // İç Malzeme

        [MaxLength(100)]
        public string? OuterMaterial { get; set; } // Dış Malzeme

        [MaxLength(100)]
        public string? SoleMaterial { get; set; }

        public decimal Weight { get; set; } = 0; // KG

        public int PiecesPerBox { get; set; } = 1; // 1 Koli

        public bool IsAssorted { get; set; } = false; // Asorti

        [MaxLength(20)]
        public string MainUnit { get; set; } = "ADET"; // Ana Birim

        public int TotalStockQuantity { get; set; } = 0;

        // Navigation properties
        public Brand Brand { get; set; } = null!;
        public List<ShoeStock> ShoeStocks { get; set; } = new();
        public List<ShoeBoxItem> ShoeBoxItems { get; set; } = new();
        public List<StockMovement> StockMovements { get; set; } = new();
    }

    // ShoeStock entity - Numara bazında stok
    public class ShoeStock : BaseEntity
    {
        public int ShoeId { get; set; }

        [Required]
        [Range(35, 50)]
        public int Size { get; set; } // 40, 41, 42, 43, 44, 45

        [Range(0, 1000)]
        public int StockQuantity { get; set; } = 0;

        [Range(0, 1000)]
        public int ReservedQuantity { get; set; } = 0;

        public int AvailableQuantity => StockQuantity - ReservedQuantity;

        // Navigation property
        public Shoe Shoe { get; set; } = null!;
    }

    // StockMovement entity
    public class StockMovement : BaseEntity
    {
        public int ShoeId { get; set; }
        public int Size { get; set; }

        [Required]
        [MaxLength(20)]
        public string MovementType { get; set; } = string.Empty; // "IN", "OUT", "RESERVED", "ADJUSTMENT"

        [Required]
        public int Quantity { get; set; }

        public int PreviousStock { get; set; }
        public int NewStock { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }

        [MaxLength(100)]
        public string? Reference { get; set; }

        public int? UserId { get; set; }

        // Navigation properties
        public Shoe Shoe { get; set; } = null!;
        public User? User { get; set; }
    }

    // ShoeBox entity
    public class ShoeBox : BaseEntity
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? BoxCode { get; set; }

        public string? Description { get; set; }

        [Required]
        [Range(0.01, 100000)]
        public decimal Price { get; set; }

        [Required]
        [Range(1, 1000)]
        public int TotalPairs { get; set; }

        [MaxLength(255)]
        public string? ImageUrl { get; set; }

        public decimal TotalWeight { get; set; } = 0;

        [MaxLength(20)]
        public string BoxType { get; set; } = "ASSORTED";

        // Navigation properties
        public List<ShoeBoxItem> Items { get; set; } = new();
        public List<OrderItem> OrderItems { get; set; } = new();
    }

    // ShoeBoxItem entity
    public class ShoeBoxItem : BaseEntity
    {
        public int ShoeBoxId { get; set; }
        public int ShoeId { get; set; }

        [Required]
        [Range(1, 1000)]
        public int Quantity { get; set; }

        // Navigation properties
        public ShoeBox ShoeBox { get; set; } = null!;
        public Shoe Shoe { get; set; } = null!;
    }

    // Order entity
    public class Order : BaseEntity
    {
        public int CustomerId { get; set; }

        public DateTime OrderDate { get; set; } = DateTime.UtcNow;

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Pending";

        [Required]
        [Range(0.01, 1000000)]
        public decimal TotalAmount { get; set; }

        [MaxLength(255)]
        public string? ShippingAddress { get; set; }

        [MaxLength(50)]
        public string? ShippingCity { get; set; }

        [MaxLength(50)]
        public string? ShippingCountry { get; set; }

        [MaxLength(20)]
        public string? ShippingPostalCode { get; set; }

        [MaxLength(50)]
        public string? PaymentMethod { get; set; }

        [MaxLength(20)]
        public string PaymentStatus { get; set; } = "Pending";

        public string? Notes { get; set; }

        // Navigation properties
        public Customer Customer { get; set; } = null!;
        public List<OrderItem> Items { get; set; } = new();
    }

    // OrderItem entity
    public class OrderItem : BaseEntity
    {
        public int OrderId { get; set; }

        // ShoeBoxId artık opsiyonel (sepet sistemi için)
        public int? ShoeBoxId { get; set; }

        // YENİ ALANLAR - Sepet sistemi için
        [MaxLength(50)]
        public string? ProductCode { get; set; }

        [MaxLength(50)]
        public string? Color { get; set; }

        [Range(35, 50)]
        public int? Size { get; set; }

        public decimal Weight { get; set; } = 0;

        [MaxLength(20)]
        public string Unit { get; set; } = "PCS";

        public bool IsAssorted { get; set; } = false;

        // MEVCUT ALANLAR
        [Required]
        [Range(1, 1000)]
        public int Quantity { get; set; }

        [Required]
        [Range(0.01, 100000)]
        public decimal Price { get; set; }

        [Required]
        [Range(0.01, 1000000)]
        public decimal Subtotal { get; set; }

        // Navigation properties
        public Order Order { get; set; } = null!;
        public ShoeBox? ShoeBox { get; set; }
    }
    // RefreshToken entity
    public class RefreshToken : BaseEntity
    {
        public int UserId { get; set; }
        public string Token { get; set; } = string.Empty;
        public DateTime Expires { get; set; }
        public DateTime Created { get; set; }
        public DateTime? Revoked { get; set; }
        public string? ReplacedByToken { get; set; }

        public bool IsExpired => DateTime.UtcNow >= Expires;
        public new bool IsActive => Revoked == null && !IsExpired;

        public User User { get; set; } = null!;

        public void UpdateComputedProperties()
        {
            // Hesaplanmış özellikler otomatik
        }
    }
}