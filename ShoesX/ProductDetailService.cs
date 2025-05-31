// ===== CART & PRODUCT DETAIL BACKEND SERVICES - ORIJINAL + TOTAL PIECES FIX =====

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WholesaleShoeStore.Models;
using WholesaleShoeStore.ViewModels;
using WholesaleShoeStore.Repositories;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace WholesaleShoeStore.Services
{
    #region Service Interfaces

    public interface ICartService
    {
        Task<ApiResponse<CartItemDto>> AddToCartAsync(int? customerId, string? sessionId, AddToCartRequest request);
        Task<ApiResponse<CartSummaryDto>> GetCartAsync(int? customerId, string? sessionId);
        Task<ApiResponse<bool>> UpdateCartItemAsync(int? customerId, string? sessionId, UpdateCartRequest request);
        Task<ApiResponse<bool>> RemoveFromCartAsync(int? customerId, string? sessionId, int cartId);
        Task<ApiResponse<bool>> ClearCartAsync(int? customerId, string? sessionId);
        Task<ApiResponse<int>> GetCartItemCountAsync(int? customerId, string? sessionId);
        Task<ApiResponse<CheckoutSummaryDto>> GetCheckoutSummaryAsync(int? customerId, string? sessionId);
        Task<ApiResponse<int>> CheckoutAsync(int customerId, string? sessionId, CheckoutRequest request);
        Task<bool> CleanupExpiredCartsAsync();
    }

    public interface IProductDetailService
    {
        Task<ApiResponse<ProductDetailDto>> GetProductDetailAsync(string productCode, string? color = null);
        Task<ApiResponse<List<RelatedProductDto>>> GetRelatedProductsAsync(string productCode, int count = 8);
        Task<ApiResponse<bool>> RecordProductViewAsync(int? customerId, string? sessionId, string productCode, string color);
        Task<ApiResponse<List<ProductVariantDto>>> GetProductVariantsAsync(string productCode);
    }

    #endregion

    #region Cart Service Implementation

    public class CartService : ICartService
    {
        private readonly IGenericRepository<Cart> _cartRepository;
        private readonly IGenericRepository<CartSummary> _cartSummaryRepository;
        private readonly IGenericRepository<CartHistory> _cartHistoryRepository;
        private readonly IGenericRepository<Order> _orderRepository;
        private readonly IGenericRepository<OrderItem> _orderItemRepository;
        private readonly ILogger<CartService> _logger;
        private readonly string _productsJsonPath;

        // In-memory cache for products (you can replace with Redis or other cache)
        private static List<dynamic>? _cachedProducts;
        private static DateTime _cacheLastUpdated = DateTime.MinValue;

        public CartService(
            IGenericRepository<Cart> cartRepository,
            IGenericRepository<CartSummary> cartSummaryRepository,
            IGenericRepository<CartHistory> cartHistoryRepository,
            IGenericRepository<Order> orderRepository,
            IGenericRepository<OrderItem> orderItemRepository,
            ILogger<CartService> logger)
        {
            _cartRepository = cartRepository;
            _cartSummaryRepository = cartSummaryRepository;
            _cartHistoryRepository = cartHistoryRepository;
            _orderRepository = orderRepository;
            _orderItemRepository = orderItemRepository;
            _logger = logger;
            _productsJsonPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "data", "shoes.json");
        }

        public async Task<ApiResponse<CartItemDto>> AddToCartAsync(int? customerId, string? sessionId, AddToCartRequest request)
        {
            try
            {
                _logger.LogInformation($"Adding to cart: CustomerId={customerId}, SessionId={sessionId}, Product={request.ProductCode}-{request.Color}-{request.Size}");

                // Eğer customerId null ise hata döndür
                if (!customerId.HasValue && string.IsNullOrEmpty(sessionId))
                {
                    return ApiResponse<CartItemDto>.ErrorResponse("Customer ID or Session ID is required");
                }

                // Get product information
                var productInfo = await GetProductInfoAsync(request.ProductCode, request.Color);
                if (productInfo == null)
                {
                    return ApiResponse<CartItemDto>.ErrorResponse("Product variant not found");
                }

                // Check if item already exists in cart
                var existingItem = await GetExistingCartItemAsync(customerId, sessionId,
                    request.ProductCode, request.Color, request.Size);

                CartItemDto cartItemDto;

                if (existingItem != null)
                {
                    // Update existing item
                    existingItem.Quantity += request.Quantity;
                    existingItem.UpdatedAt = DateTime.UtcNow;
                    existingItem.ExpiresAt = DateTime.UtcNow.AddHours(24);

                    await _cartRepository.UpdateAsync(existingItem);
                    cartItemDto = await MapToCartItemDtoAsync(existingItem);

                    await RecordCartHistoryAsync(customerId, sessionId, request.ProductCode,
                        request.Color, request.Size, request.Quantity, productInfo.FinalPrice, "UPDATED");
                }
                else
                {
                    // Create new cart item - CustomerId'yi kesinlikle set et
                    var newItem = new Cart
                    {
                        CustomerId = customerId, // Bu değer null olmamalı
                        SessionId = sessionId,
                        ProductCode = request.ProductCode,
                        Color = request.Color,
                        Size = request.Size,
                        Quantity = request.Quantity,
                        Price = productInfo.Price,
                        FinalPrice = productInfo.FinalPrice,
                        IsAssorted = productInfo.IsAssorted,
                        BoxQuantity = productInfo.BoxQuantity,

                        // ✅ YENİ EKLENEN: TotalPieces field
                        TotalPieces = productInfo.TotalPieces,

                        Weight = productInfo.Weight,
                        Unit = productInfo.Unit,
                        ExpiresAt = DateTime.UtcNow.AddHours(24),
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                        IsActive = true
                    };

                    var newId = await _cartRepository.AddAsync(newItem);
                    newItem.Id = newId;
                    cartItemDto = await MapToCartItemDtoAsync(newItem);

                    _logger.LogInformation($"Cart item created with ID: {newId}, CustomerId: {newItem.CustomerId}");

                    await RecordCartHistoryAsync(customerId, sessionId, request.ProductCode,
                        request.Color, request.Size, request.Quantity, productInfo.FinalPrice, "ADDED");
                }

                // Update cart summary
                await UpdateCartSummaryAsync(customerId, sessionId);

                return ApiResponse<CartItemDto>.SuccessResponse(cartItemDto, "Item added to cart successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding item to cart");
                return ApiResponse<CartItemDto>.ErrorResponse($"Error adding item to cart: {ex.Message}");
            }
        }

        public async Task<ApiResponse<CartSummaryDto>> GetCartAsync(int? customerId, string? sessionId)
        {
            try
            {
                var cartItems = await GetCartItemsAsync(customerId, sessionId);

                var summary = new CartSummaryDto
                {
                    TotalItems = cartItems.Count,
                    TotalQuantity = cartItems.Sum(c => c.Quantity),

                    // ✅ YENİ EKLENEN: TotalPieces calculation
                    TotalPieces = cartItems.Sum(c => c.Quantity * c.TotalPieces),

                    SubTotal = cartItems.Sum(c => c.Price * c.Quantity),
                    DiscountAmount = cartItems.Sum(c => (c.Price - c.FinalPrice) * c.Quantity),
                    TotalAmount = cartItems.Sum(c => c.FinalPrice * c.Quantity),
                    TotalWeight = cartItems.Sum(c => c.Weight * c.Quantity),
                    LastUpdated = cartItems.Any() ? cartItems.Max(c => c.UpdatedAt) : DateTime.UtcNow
                };

                var cartItemDtos = new List<CartItemDto>();
                foreach (var item in cartItems)
                {
                    var dto = await MapToCartItemDtoAsync(item);
                    cartItemDtos.Add(dto);
                }

                summary.Items = cartItemDtos;

                return ApiResponse<CartSummaryDto>.SuccessResponse(summary);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting cart");
                return ApiResponse<CartSummaryDto>.ErrorResponse($"Error getting cart: {ex.Message}");
            }
        }

        public async Task<ApiResponse<bool>> UpdateCartItemAsync(int? customerId, string? sessionId, UpdateCartRequest request)
        {
            try
            {
                var cartItem = await _cartRepository.GetByIdAsync(request.CartId);
                if (cartItem == null || !cartItem.IsActive)
                {
                    return ApiResponse<bool>.ErrorResponse("Cart item not found");
                }

                // Verify ownership
                if (!VerifyCartItemOwnership(cartItem, customerId, sessionId))
                {
                    return ApiResponse<bool>.ErrorResponse("Unauthorized access to cart item");
                }

                var oldQuantity = cartItem.Quantity;
                cartItem.Quantity = request.Quantity;
                cartItem.UpdatedAt = DateTime.UtcNow;
                cartItem.ExpiresAt = DateTime.UtcNow.AddHours(24);

                await _cartRepository.UpdateAsync(cartItem);

                await RecordCartHistoryAsync(cartItem.CustomerId, cartItem.SessionId, cartItem.ProductCode,
                    cartItem.Color, cartItem.Size, request.Quantity - oldQuantity, cartItem.FinalPrice, "UPDATED");

                await UpdateCartSummaryAsync(customerId, sessionId);

                return ApiResponse<bool>.SuccessResponse(true, "Cart item updated successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating cart item");
                return ApiResponse<bool>.ErrorResponse($"Error updating cart item: {ex.Message}");
            }
        }

        public async Task<ApiResponse<bool>> RemoveFromCartAsync(int? customerId, string? sessionId, int cartId)
        {
            try
            {
                var cartItem = await _cartRepository.GetByIdAsync(cartId);
                if (cartItem == null || !cartItem.IsActive)
                {
                    return ApiResponse<bool>.ErrorResponse("Cart item not found");
                }

                // Verify ownership
                if (!VerifyCartItemOwnership(cartItem, customerId, sessionId))
                {
                    return ApiResponse<bool>.ErrorResponse("Unauthorized access to cart item");
                }

                // Record history before removal
                await RecordCartHistoryAsync(cartItem.CustomerId, cartItem.SessionId, cartItem.ProductCode,
                    cartItem.Color, cartItem.Size, cartItem.Quantity, cartItem.FinalPrice, "REMOVED");

                // Soft delete
                cartItem.IsActive = false;
                cartItem.UpdatedAt = DateTime.UtcNow;
                await _cartRepository.UpdateAsync(cartItem);

                await UpdateCartSummaryAsync(customerId, sessionId);

                return ApiResponse<bool>.SuccessResponse(true, "Item removed from cart successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing cart item");
                return ApiResponse<bool>.ErrorResponse($"Error removing cart item: {ex.Message}");
            }
        }

        public async Task<ApiResponse<bool>> ClearCartAsync(int? customerId, string? sessionId)
        {
            try
            {
                var cartItems = await GetCartItemsAsync(customerId, sessionId);

                foreach (var item in cartItems)
                {
                    await RecordCartHistoryAsync(item.CustomerId, item.SessionId, item.ProductCode,
                        item.Color, item.Size, item.Quantity, item.FinalPrice, "CLEARED");

                    item.IsActive = false;
                    item.UpdatedAt = DateTime.UtcNow;
                    await _cartRepository.UpdateAsync(item);
                }

                // Clear cart summary
                await ClearCartSummaryAsync(customerId, sessionId);

                return ApiResponse<bool>.SuccessResponse(true, "Cart cleared successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error clearing cart");
                return ApiResponse<bool>.ErrorResponse($"Error clearing cart: {ex.Message}");
            }
        }

        public async Task<ApiResponse<int>> GetCartItemCountAsync(int? customerId, string? sessionId)
        {
            try
            {
                var whereClause = "";
                object parameters;

                if (customerId.HasValue)
                {
                    whereClause = "CustomerId = @CustomerId AND IsActive = 1";
                    parameters = new { CustomerId = customerId.Value };
                }
                else if (!string.IsNullOrEmpty(sessionId))
                {
                    whereClause = "SessionId = @SessionId AND IsActive = 1";
                    parameters = new { SessionId = sessionId };
                }
                else
                {
                    return ApiResponse<int>.SuccessResponse(0);
                }

                var count = await _cartRepository.CountAsync(whereClause, parameters);
                return ApiResponse<int>.SuccessResponse(count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting cart count");
                return ApiResponse<int>.ErrorResponse($"Error getting cart count: {ex.Message}");
            }
        }

        public async Task<ApiResponse<CheckoutSummaryDto>> GetCheckoutSummaryAsync(int? customerId, string? sessionId)
        {
            try
            {
                var cartResponse = await GetCartAsync(customerId, sessionId);
                if (!cartResponse.Success || cartResponse.Data == null)
                {
                    return ApiResponse<CheckoutSummaryDto>.ErrorResponse(cartResponse.Message);
                }

                var cart = cartResponse.Data;
                var summary = new CheckoutSummaryDto
                {
                    Cart = cart,
                    ShippingCost = CalculateShippingCost(cart),
                    TaxAmount = CalculateTaxAmount(cart),
                    PaymentMethods = new List<string> { "Cash", "Bank Transfer", "Credit Card" },
                    EstimatedDelivery = "3-5 business days"
                };

                summary.FinalTotal = cart.TotalAmount + summary.ShippingCost + summary.TaxAmount;

                return ApiResponse<CheckoutSummaryDto>.SuccessResponse(summary);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting checkout summary");
                return ApiResponse<CheckoutSummaryDto>.ErrorResponse($"Error getting checkout summary: {ex.Message}");
            }
        }

        public async Task<ApiResponse<int>> CheckoutAsync(int customerId, string? sessionId, CheckoutRequest request)
        {
            try
            {
                var cartResponse = await GetCartAsync(customerId, sessionId);
                if (!cartResponse.Success || !cartResponse.Data!.HasItems)
                {
                    return ApiResponse<int>.ErrorResponse("Cart is empty");
                }

                var checkoutSummary = await GetCheckoutSummaryAsync(customerId, sessionId);
                if (!checkoutSummary.Success)
                {
                    return ApiResponse<int>.ErrorResponse(checkoutSummary.Message);
                }

                // Create order
                var order = new Order
                {
                    CustomerId = customerId,
                    OrderDate = DateTime.UtcNow,
                    Status = "Pending",
                    TotalAmount = checkoutSummary.Data!.FinalTotal,
                    ShippingAddress = request.ShippingAddress,
                    ShippingCity = request.ShippingCity,
                    ShippingCountry = request.ShippingCountry,
                    ShippingPostalCode = request.ShippingPostalCode,
                    PaymentMethod = request.PaymentMethod,
                    PaymentStatus = "Pending",
                    Notes = request.Notes
                };

                var orderId = await _orderRepository.AddAsync(order);

                // Create order items from cart
                var cart = cartResponse.Data!;
                foreach (var cartItem in cart.Items)
                {
                    var orderItem = new OrderItem
                    {
                        OrderId = orderId,
                        ProductCode = cartItem.ProductCode,
                        Color = cartItem.Color,
                        Size = cartItem.Size,
                        Quantity = cartItem.Quantity,
                        Price = cartItem.FinalPrice,
                        Subtotal = cartItem.Subtotal,
                        Weight = cartItem.Weight,
                        Unit = cartItem.Unit,
                        IsAssorted = cartItem.IsAssorted
                    };

                    await _orderItemRepository.AddAsync(orderItem);

                    // Record checkout history
                    await RecordCartHistoryAsync(customerId, sessionId, cartItem.ProductCode,
                        cartItem.Color, cartItem.Size, cartItem.Quantity, cartItem.FinalPrice, "CHECKOUT");
                }

                // Clear cart after successful checkout
                await ClearCartAsync(customerId, sessionId);

                return ApiResponse<int>.SuccessResponse(orderId, "Order placed successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during checkout");
                return ApiResponse<int>.ErrorResponse($"Error during checkout: {ex.Message}");
            }
        }

        public async Task<bool> CleanupExpiredCartsAsync()
        {
            try
            {
                var expiredCarts = await _cartRepository.FindAsync(
                    "ExpiresAt < @Now AND IsActive = 1",
                    new { Now = DateTime.UtcNow });

                foreach (var cart in expiredCarts)
                {
                    await RecordCartHistoryAsync(cart.CustomerId, cart.SessionId, cart.ProductCode,
                        cart.Color, cart.Size, cart.Quantity, cart.FinalPrice, "EXPIRED");

                    cart.IsActive = false;
                    cart.UpdatedAt = DateTime.UtcNow;
                    await _cartRepository.UpdateAsync(cart);
                }

                _logger.LogInformation($"Cleaned up {expiredCarts.Count()} expired cart items");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cleaning up expired carts");
                return false;
            }
        }

        #region Private Helper Methods

        // Update GetProductsDataAsync in CartService with same approach
        private async Task<List<dynamic>> GetProductsDataAsync()
        {
            try
            {
                // Cache products for 5 minutes
                if (_cachedProducts == null || DateTime.UtcNow.Subtract(_cacheLastUpdated).TotalMinutes > 5)
                {
                    if (File.Exists(_productsJsonPath))
                    {
                        var jsonContent = await File.ReadAllTextAsync(_productsJsonPath);
                        var options = new JsonSerializerOptions
                        {
                            PropertyNameCaseInsensitive = true,
                            AllowTrailingCommas = true
                        };
                        _cachedProducts = JsonSerializer.Deserialize<List<JsonElement>>(jsonContent, options)?.Cast<dynamic>().ToList() ?? new List<dynamic>();
                        _cacheLastUpdated = DateTime.UtcNow;
                    }
                    else
                    {
                        _cachedProducts = new List<dynamic>();
                    }
                }

                return _cachedProducts;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading products data");
                return new List<dynamic>();
            }
        }

        private async Task<ProductInfo?> GetProductInfoAsync(string productCode, string color)
        {
            try
            {
                _logger.LogInformation($"Getting product info for: {productCode}-{color}");

                var products = await GetProductsDataAsync();
                if (products == null || !products.Any())
                {
                    _logger.LogWarning("No products data found");
                    return null;
                }

                // Find matching product
                foreach (var product in products)
                {
                    try
                    {
                        var element = (JsonElement)product;

                        // Safe string comparison
                        string? pCode = null;
                        string? pColor = null;

                        if (element.TryGetProperty("productCode", out var codeProperty))
                        {
                            pCode = codeProperty.ValueKind == JsonValueKind.String ? codeProperty.GetString() : null;
                        }

                        if (element.TryGetProperty("color", out var colorProperty))
                        {
                            pColor = colorProperty.ValueKind == JsonValueKind.String ? colorProperty.GetString() : null;
                        }

                        if (pCode == productCode && pColor == color)
                        {
                            var productInfo = new ProductInfo
                            {
                                ProductCode = productCode,
                                Color = color,
                                Price = GetDecimalFromElement(element, "price"),
                                FinalPrice = GetFinalPriceFromElement(element),
                                IsAssorted = GetBooleanFromElement(element, "isAssorted"),
                                BoxQuantity = GetIntFromElement(element, "boxQuantity", 1),

                                // ✅ YENİ EKLENEN: TotalPieces hesaplama
                                TotalPieces = CalculateTotalPieces(element),

                                Weight = GetDecimalFromElement(element, "weight"),
                                Unit = GetStringFromElement(element, "unit", "PCS"),
                                OuterMaterial = GetStringFromElement(element, "outerMaterial"),
                                InnerMaterial = GetStringFromElement(element, "innerMaterial"),
                                SoleMaterial = GetStringFromElement(element, "sole"),
                                Gender = GetStringFromElement(element, "gender"),
                                ProductGroup = GetStringFromElement(element, "productGroup")
                            };

                            _logger.LogInformation($"Found product: {productInfo.ProductCode}-{productInfo.Color}");
                            return productInfo;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning($"Error processing product element: {ex.Message}");
                        continue;
                    }
                }

                _logger.LogWarning($"Product not found: {productCode}-{color}");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting product info for {productCode}-{color}");
                return null;
            }
        }

        // ✅ YENİ EKLENEN: TotalPieces hesaplama metodu
        private int CalculateTotalPieces(JsonElement element)
        {
            try
            {
                // Önce JSON'dan totalPieces değerini almaya çalış
                int totalPieces = GetIntFromElement(element, "totalPieces", 0);

                if (totalPieces > 0)
                {
                    _logger.LogDebug($"Using totalPieces from JSON: {totalPieces}");
                    return totalPieces;
                }

                // totalPieces yoksa veya 0 ise, sizes objesinden hesapla
                if (element.TryGetProperty("sizes", out var sizesElement) && sizesElement.ValueKind == JsonValueKind.Object)
                {
                    int sizesTotal = 0;
                    foreach (var sizeProperty in sizesElement.EnumerateObject())
                    {
                        if (sizeProperty.Value.ValueKind == JsonValueKind.Number)
                        {
                            sizesTotal += sizeProperty.Value.GetInt32();
                        }
                        else if (sizeProperty.Value.ValueKind == JsonValueKind.String &&
                                int.TryParse(sizeProperty.Value.GetString(), out int sizeValue))
                        {
                            sizesTotal += sizeValue;
                        }
                    }

                    if (sizesTotal > 0)
                    {
                        _logger.LogDebug($"Calculated totalPieces from sizes: {sizesTotal}");
                        return sizesTotal;
                    }
                }

                // Her ikisi de yoksa default 1
                _logger.LogDebug("No totalPieces or sizes found, using default: 1");
                return 1;
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Error calculating totalPieces: {ex.Message}");
                return 1;
            }
        }

        // Helper methods for safe JSON parsing
        private string GetStringFromElement(JsonElement element, string propertyName, string defaultValue = "")
        {
            try
            {
                if (element.TryGetProperty(propertyName, out var property))
                {
                    return property.ValueKind == JsonValueKind.String ? (property.GetString() ?? defaultValue) : defaultValue;
                }
                return defaultValue;
            }
            catch
            {
                return defaultValue;
            }
        }

        private decimal GetDecimalFromElement(JsonElement element, string propertyName, decimal defaultValue = 0)
        {
            try
            {
                if (element.TryGetProperty(propertyName, out var property))
                {
                    if (property.ValueKind == JsonValueKind.Number)
                    {
                        return property.GetDecimal();
                    }
                    if (property.ValueKind == JsonValueKind.String)
                    {
                        return decimal.TryParse(property.GetString(), out var result) ? result : defaultValue;
                    }
                }
                return defaultValue;
            }
            catch
            {
                return defaultValue;
            }
        }

        private int GetIntFromElement(JsonElement element, string propertyName, int defaultValue = 0)
        {
            try
            {
                if (element.TryGetProperty(propertyName, out var property))
                {
                    if (property.ValueKind == JsonValueKind.Number)
                    {
                        return property.GetInt32();
                    }
                    if (property.ValueKind == JsonValueKind.String)
                    {
                        return int.TryParse(property.GetString(), out var result) ? result : defaultValue;
                    }
                }
                return defaultValue;
            }
            catch
            {
                return defaultValue;
            }
        }

        private bool GetBooleanFromElement(JsonElement element, string propertyName, bool defaultValue = false)
        {
            try
            {
                if (element.TryGetProperty(propertyName, out var property))
                {
                    if (property.ValueKind == JsonValueKind.True) return true;
                    if (property.ValueKind == JsonValueKind.False) return false;
                    if (property.ValueKind == JsonValueKind.String)
                    {
                        return bool.TryParse(property.GetString(), out var result) ? result : defaultValue;
                    }
                }
                return defaultValue;
            }
            catch
            {
                return defaultValue;
            }
        }

        private decimal GetFinalPriceFromElement(JsonElement element)
        {
            try
            {
                var price = GetDecimalFromElement(element, "price");

                // Try finalPrice first
                var finalPrice = GetDecimalFromElement(element, "finalPrice");
                if (finalPrice > 0) return finalPrice;

                // Try campaignPrice
                var campaignPrice = GetDecimalFromElement(element, "campaignPrice");
                if (campaignPrice > 0 && campaignPrice < price) return campaignPrice;

                // Fallback to price
                return price;
            }
            catch
            {
                return 0;
            }
        }

        // Helper methods for safe JSON property access
        private string? GetStringSafe(JsonElement element, string propertyName)
        {
            if (element.TryGetProperty(propertyName, out var prop))
            {
                return prop.ValueKind == JsonValueKind.String ? prop.GetString() :
                       prop.ValueKind == JsonValueKind.Null ? null :
                       prop.ToString();
            }
            return null;
        }

        private decimal GetDecimalSafe(JsonElement element, string propertyName, decimal defaultValue = 0)
        {
            if (element.TryGetProperty(propertyName, out var prop))
            {
                switch (prop.ValueKind)
                {
                    case JsonValueKind.Number:
                        return prop.GetDecimal();
                    case JsonValueKind.String:
                        return decimal.TryParse(prop.GetString(), out var result) ? result : defaultValue;
                    case JsonValueKind.Null:
                        return defaultValue;
                    default:
                        return defaultValue;
                }
            }
            return defaultValue;
        }

        private int GetIntSafe(JsonElement element, string propertyName, int defaultValue = 0)
        {
            if (element.TryGetProperty(propertyName, out var prop))
            {
                switch (prop.ValueKind)
                {
                    case JsonValueKind.Number:
                        return prop.GetInt32();
                    case JsonValueKind.String:
                        return int.TryParse(prop.GetString(), out var result) ? result : defaultValue;
                    case JsonValueKind.Null:
                        return defaultValue;
                    default:
                        return defaultValue;
                }
            }
            return defaultValue;
        }

        private bool GetBooleanSafe(JsonElement element, string propertyName, bool defaultValue = false)
        {
            if (element.TryGetProperty(propertyName, out var prop))
            {
                switch (prop.ValueKind)
                {
                    case JsonValueKind.True:
                        return true;
                    case JsonValueKind.False:
                        return false;
                    case JsonValueKind.String:
                        return bool.TryParse(prop.GetString(), out var result) ? result : defaultValue;
                    case JsonValueKind.Null:
                        return defaultValue;
                    default:
                        return defaultValue;
                }
            }
            return defaultValue;
        }

        private decimal CalculateFinalPrice(JsonElement element, decimal originalPrice)
        {
            // Try finalPrice first
            if (element.TryGetProperty("finalPrice", out var finalPriceEl) &&
                finalPriceEl.ValueKind != JsonValueKind.Null)
            {
                var finalPrice = GetDecimalSafe(element, "finalPrice");
                if (finalPrice > 0) return finalPrice;
            }

            // Try campaignPrice
            if (element.TryGetProperty("campaignPrice", out var campaignPriceEl) &&
                campaignPriceEl.ValueKind != JsonValueKind.Null)
            {
                var campaignPrice = GetDecimalSafe(element, "campaignPrice");
                if (campaignPrice > 0 && campaignPrice < originalPrice) return campaignPrice;
            }

            // Fallback to original price
            return originalPrice;
        }

        private async Task<List<Cart>> GetCartItemsAsync(int? customerId, string? sessionId)
        {
            var whereClause = "";
            object parameters;

            if (customerId.HasValue)
            {
                whereClause = "CustomerId = @CustomerId AND IsActive = 1";
                parameters = new { CustomerId = customerId.Value };
            }
            else if (!string.IsNullOrEmpty(sessionId))
            {
                whereClause = "SessionId = @SessionId AND IsActive = 1";
                parameters = new { SessionId = sessionId };
            }
            else
            {
                return new List<Cart>();
            }

            var items = await _cartRepository.FindAsync(whereClause, parameters);
            return items.ToList();
        }

        private async Task<Cart?> GetExistingCartItemAsync(int? customerId, string? sessionId,
            string productCode, string color, int size)
        {
            var whereClause = "";
            object parameters;

            if (customerId.HasValue)
            {
                whereClause = "CustomerId = @CustomerId AND ProductCode = @ProductCode AND Color = @Color AND Size = @Size AND IsActive = 1";
                parameters = new { CustomerId = customerId.Value, ProductCode = productCode, Color = color, Size = size };
            }
            else if (!string.IsNullOrEmpty(sessionId))
            {
                whereClause = "SessionId = @SessionId AND ProductCode = @ProductCode AND Color = @Color AND Size = @Size AND IsActive = 1";
                parameters = new { SessionId = sessionId, ProductCode = productCode, Color = color, Size = size };
            }
            else
            {
                return null;
            }

            var items = await _cartRepository.FindAsync(whereClause, parameters);
            return items.FirstOrDefault();
        }

        private bool VerifyCartItemOwnership(Cart cartItem, int? customerId, string? sessionId)
        {
            if (customerId.HasValue)
            {
                return cartItem.CustomerId == customerId.Value;
            }
            else if (!string.IsNullOrEmpty(sessionId))
            {
                return cartItem.SessionId == sessionId;
            }

            return false;
        }

        private async Task<CartItemDto> MapToCartItemDtoAsync(Cart cartItem)
        {
            var productInfo = await GetProductInfoAsync(cartItem.ProductCode, cartItem.Color);

            return new CartItemDto
            {
                Id = cartItem.Id,
                ProductCode = cartItem.ProductCode,
                Color = cartItem.Color,
                Size = cartItem.Size,
                Quantity = cartItem.Quantity,
                Price = cartItem.Price,
                FinalPrice = cartItem.FinalPrice,
                Subtotal = cartItem.FinalPrice * cartItem.Quantity, // Calculate manually
                DiscountAmount = (cartItem.Price - cartItem.FinalPrice) * cartItem.Quantity, // Calculate manually
                IsAssorted = cartItem.IsAssorted,
                BoxQuantity = cartItem.BoxQuantity,

                // ✅ YENİ EKLENEN: TotalPieces fields
                TotalPieces = cartItem.TotalPieces,
                TotalPiecesOrdered = cartItem.Quantity * cartItem.TotalPieces,
                PricePerPiece = cartItem.IsAssorted && cartItem.TotalPieces > 0 ?
                    cartItem.FinalPrice / cartItem.TotalPieces : cartItem.FinalPrice,
                PricePerBox = cartItem.IsAssorted ?
                    cartItem.FinalPrice * cartItem.TotalPieces : cartItem.FinalPrice,

                Weight = cartItem.Weight,
                TotalWeight = cartItem.Weight * cartItem.Quantity, // Calculate manually
                Unit = cartItem.Unit,
                CreatedAt = cartItem.CreatedAt,
                ExpiresAt = cartItem.ExpiresAt,
                ProductName = $"{cartItem.Color} {productInfo?.OuterMaterial ?? ""} {productInfo?.ProductGroup ?? ""} SHOE",
                BrandName = "Premium Brand",
                OuterMaterial = productInfo?.OuterMaterial ?? "",
                InnerMaterial = productInfo?.InnerMaterial ?? "",
                SoleMaterial = productInfo?.SoleMaterial ?? "",
                Gender = productInfo?.Gender ?? "",
                ProductGroup = productInfo?.ProductGroup ?? "",
                ImageUrl = "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=300"
            };
        }

        private async Task UpdateCartSummaryAsync(int? customerId, string? sessionId)
        {
            // This would typically update the CartSummary table
            // For now, we'll skip the implementation as it's handled in GetCartAsync
            await Task.CompletedTask;
        }

        private async Task ClearCartSummaryAsync(int? customerId, string? sessionId)
        {
            try
            {
                var whereClause = "";
                object parameters;

                if (customerId.HasValue)
                {
                    whereClause = "CustomerId = @CustomerId";
                    parameters = new { CustomerId = customerId.Value };
                }
                else
                {
                    whereClause = "SessionId = @SessionId";
                    parameters = new { SessionId = sessionId };
                }

                await _cartSummaryRepository.ExecuteAsync($"DELETE FROM CartSummary WHERE {whereClause}", parameters);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error clearing cart summary");
            }
        }

        private async Task RecordCartHistoryAsync(int? customerId, string? sessionId, string productCode,
            string color, int size, int quantity, decimal price, string action)
        {
            try
            {
                var history = new CartHistory
                {
                    CustomerId = customerId,
                    SessionId = sessionId,
                    ProductCode = productCode,
                    Color = color,
                    Size = size,
                    Quantity = quantity,
                    Price = price,
                    Action = action,
                    ActionDate = DateTime.UtcNow
                };

                await _cartHistoryRepository.AddAsync(history);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error recording cart history");
            }
        }

        private decimal CalculateShippingCost(CartSummaryDto cart)
        {
            if (cart.TotalWeight <= 10) return 5.00m;
            if (cart.TotalWeight <= 25) return 10.00m;
            return 15.00m;
        }

        private decimal CalculateTaxAmount(CartSummaryDto cart)
        {
            return Math.Round(cart.TotalAmount * 0.08m, 2); // 8% VAT
        }

        #endregion
    }

    #endregion

    #region Product Detail Service Implementation

    public class ProductDetailService : IProductDetailService
    {
        private readonly IGenericRepository<ProductView> _productViewRepository;
        private readonly ILogger<ProductDetailService> _logger;
        private readonly string _productsJsonPath;

        public ProductDetailService(
            IGenericRepository<ProductView> productViewRepository,
            ILogger<ProductDetailService> logger)
        {
            _productViewRepository = productViewRepository;
            _logger = logger;
            _productsJsonPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "data", "shoes.json");
        }

        public async Task<ApiResponse<ProductDetailDto>> GetProductDetailAsync(string productCode, string? color = null)
        {
            try
            {
                var products = await LoadProductsAsync();

                // Get all variants for this product code
                var variants = products.Where(p =>
                {
                    var pCodeProp = ((JsonElement)p).GetProperty("productCode");
                    return pCodeProp.GetString() == productCode;
                }).ToList();

                if (!variants.Any())
                {
                    return ApiResponse<ProductDetailDto>.ErrorResponse("Product not found");
                }

                // Get base product info from first variant
                var firstVariant = (JsonElement)variants.First();

                var productDetail = new ProductDetailDto
                {
                    ProductCode = productCode,
                    Name = $"{firstVariant.GetProperty("productGroup").GetString()} {firstVariant.GetProperty("gender").GetString()} SHOE",
                    BrandName = "Premium Brand",
                    OuterMaterial = firstVariant.GetProperty("outerMaterial").GetString() ?? "",
                    InnerMaterial = firstVariant.GetProperty("innerMaterial").GetString() ?? "",
                    SoleMaterial = firstVariant.TryGetProperty("sole", out var soleEl) ? soleEl.GetString() ?? "" : "",
                    ProductGroup = firstVariant.GetProperty("productGroup").GetString() ?? "",
                    Gender = firstVariant.GetProperty("gender").GetString() ?? "",
                    IsAssorted = firstVariant.TryGetProperty("isAssorted", out var assortedEl) ? assortedEl.GetBoolean() : false,
                    Description = $"High-quality {firstVariant.GetProperty("outerMaterial").GetString()} shoe with {firstVariant.GetProperty("innerMaterial").GetString()} inner lining.",
                    Variants = new List<ProductVariantDto>(),
                    AllSizeStocks = new Dictionary<int, int>(),
                    Images = new List<ProductImageDto>(),
                    RelatedProducts = new List<RelatedProductDto>(),
                    Stats = new ProductStatsDto()
                };

                // Process variants
                foreach (var variant in variants)
                {
                    var variantElement = (JsonElement)variant;

                    // ✅ YENİ EKLENEN: TotalPieces hesaplama
                    var totalPieces = CalculateTotalPiecesForProductDetail(variantElement);

                    var variantDto = new ProductVariantDto
                    {
                        Color = variantElement.GetProperty("color").GetString() ?? "",
                        Price = variantElement.TryGetProperty("price", out var priceEl) ? priceEl.GetDecimal() : 0,
                        FinalPrice = variantElement.TryGetProperty("finalPrice", out var finalPriceEl) ? finalPriceEl.GetDecimal() :
                                    variantElement.TryGetProperty("campaignPrice", out var campPriceEl) ? campPriceEl.GetDecimal() :
                                    variantElement.TryGetProperty("price", out var priceEl2) ? priceEl2.GetDecimal() : 0,
                        ActualStock = variantElement.TryGetProperty("actualStock", out var stockEl) ? stockEl.GetDecimal() : 0,
                        BoxQuantity = variantElement.TryGetProperty("boxQuantity", out var boxQtyEl) ? boxQtyEl.GetInt32() : 1,

                        // ✅ YENİ EKLENEN: TotalPieces field
                        TotalPieces = totalPieces,

                        Weight = variantElement.TryGetProperty("weight", out var weightEl) ? weightEl.GetDecimal() : 0,
                        Unit = variantElement.TryGetProperty("unit", out var unitEl) ? unitEl.GetString() ?? "PCS" : "PCS",
                        SizeStocks = new Dictionary<int, int>()
                    };

                    // Process sizes if available
                    if (variantElement.TryGetProperty("sizes", out var sizesEl))
                    {
                        foreach (var sizeProperty in sizesEl.EnumerateObject())
                        {
                            if (int.TryParse(sizeProperty.Name, out var size))
                            {
                                var quantity = sizeProperty.Value.GetInt32();
                                variantDto.SizeStocks[size] = quantity;

                                // Add to overall size stocks
                                if (productDetail.AllSizeStocks.ContainsKey(size))
                                {
                                    productDetail.AllSizeStocks[size] += quantity;
                                }
                                else
                                {
                                    productDetail.AllSizeStocks[size] = quantity;
                                }
                            }
                        }
                    }

                    productDetail.Variants.Add(variantDto);
                }

                // Add sample images
                foreach (var variantColor in productDetail.AvailableColors.Take(3))
                {
                    productDetail.Images.Add(new ProductImageDto
                    {
                        Url = $"https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=300&q=80",
                        Color = variantColor,
                        IsPrimary = variantColor == productDetail.AvailableColors.First(),
                        AltText = $"{productCode} {variantColor} shoe"
                    });
                }

                // Get related products
                var relatedResponse = await GetRelatedProductsAsync(productCode, 4);
                if (relatedResponse.Success && relatedResponse.Data != null)
                {
                    productDetail.RelatedProducts = relatedResponse.Data;
                }

                return ApiResponse<ProductDetailDto>.SuccessResponse(productDetail);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting product detail for {productCode}");
                return ApiResponse<ProductDetailDto>.ErrorResponse($"Error getting product detail: {ex.Message}");
            }
        }

        public async Task<ApiResponse<List<RelatedProductDto>>> GetRelatedProductsAsync(string productCode, int count = 8)
        {
            try
            {
                var products = await LoadProductsAsync();

                // Get current product info
                var currentProduct = products.FirstOrDefault(p =>
                {
                    var pCodeProp = ((JsonElement)p).GetProperty("productCode");
                    return pCodeProp.GetString() == productCode;
                });

                if (currentProduct == null)
                {
                    return ApiResponse<List<RelatedProductDto>>.SuccessResponse(new List<RelatedProductDto>());
                }

                var currentElement = (JsonElement)currentProduct;
                var currentGroup = currentElement.GetProperty("productGroup").GetString();
                var currentGender = currentElement.GetProperty("gender").GetString();

                // Find related products (same group/gender, different product codes)
                var relatedProducts = products
                    .Where(p =>
                    {
                        var element = (JsonElement)p;
                        var pCode = element.GetProperty("productCode").GetString();
                        var pGroup = element.GetProperty("productGroup").GetString();
                        var pGender = element.GetProperty("gender").GetString();

                        return pCode != productCode &&
                               (pGroup == currentGroup || pGender == currentGender);
                    })
                    .GroupBy(p => ((JsonElement)p).GetProperty("productCode").GetString())
                    .Take(count)
                    .Select(g => g.First())
                    .ToList();

                var relatedDtos = relatedProducts.Select(p =>
                {
                    var element = (JsonElement)p;
                    return new RelatedProductDto
                    {
                        ProductCode = element.GetProperty("productCode").GetString() ?? "",
                        Name = $"{element.GetProperty("productGroup").GetString()} {element.GetProperty("gender").GetString()} SHOE",
                        BrandName = "Premium Brand",
                        PrimaryColor = element.GetProperty("color").GetString() ?? "",
                        Price = element.TryGetProperty("price", out var priceEl) ? priceEl.GetDecimal() : 0,
                        FinalPrice = element.TryGetProperty("finalPrice", out var finalPriceEl) ? finalPriceEl.GetDecimal() :
                                    element.TryGetProperty("campaignPrice", out var campPriceEl) ? campPriceEl.GetDecimal() :
                                    element.TryGetProperty("price", out var priceEl2) ? priceEl2.GetDecimal() : 0,
                        ImageUrl = "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&h=200&q=80"
                    };
                }).ToList();

                return ApiResponse<List<RelatedProductDto>>.SuccessResponse(relatedDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting related products for {productCode}");
                return ApiResponse<List<RelatedProductDto>>.ErrorResponse($"Error getting related products: {ex.Message}");
            }
        }

        public async Task<ApiResponse<bool>> RecordProductViewAsync(int? customerId, string? sessionId, string productCode, string color)
        {
            try
            {
                // Check if view already exists
                var whereClause = "";
                object parameters;

                if (customerId.HasValue)
                {
                    whereClause = "CustomerId = @CustomerId AND ProductCode = @ProductCode AND Color = @Color";
                    parameters = new { CustomerId = customerId.Value, ProductCode = productCode, Color = color };
                }
                else
                {
                    whereClause = "SessionId = @SessionId AND ProductCode = @ProductCode AND Color = @Color";
                    parameters = new { SessionId = sessionId, ProductCode = productCode, Color = color };
                }

                var existingView = (await _productViewRepository.FindAsync(whereClause, parameters)).FirstOrDefault();

                if (existingView != null)
                {
                    // Update existing view
                    existingView.ViewCount++;
                    existingView.LastViewedAt = DateTime.UtcNow;
                    existingView.UpdatedAt = DateTime.UtcNow;
                    await _productViewRepository.UpdateAsync(existingView);
                }
                else
                {
                    // Create new view record
                    var newView = new ProductView
                    {
                        CustomerId = customerId,
                        SessionId = sessionId,
                        ProductCode = productCode,
                        Color = color,
                        ViewCount = 1,
                        LastViewedAt = DateTime.UtcNow
                    };

                    await _productViewRepository.AddAsync(newView);
                }

                return ApiResponse<bool>.SuccessResponse(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error recording product view for {productCode}-{color}");
                return ApiResponse<bool>.ErrorResponse($"Error recording product view: {ex.Message}");
            }
        }

        public async Task<ApiResponse<List<ProductVariantDto>>> GetProductVariantsAsync(string productCode)
        {
            try
            {
                var products = await LoadProductsAsync();

                var variants = products.Where(p =>
                {
                    var pCodeProp = ((JsonElement)p).GetProperty("productCode");
                    return pCodeProp.GetString() == productCode;
                }).ToList();

                var variantDtos = variants.Select(v =>
                {
                    var element = (JsonElement)v;

                    // ✅ YENİ EKLENEN: TotalPieces hesaplama
                    var totalPieces = CalculateTotalPiecesForProductDetail(element);

                    var variantDto = new ProductVariantDto
                    {
                        Color = element.GetProperty("color").GetString() ?? "",
                        Price = element.TryGetProperty("price", out var priceEl) ? priceEl.GetDecimal() : 0,
                        FinalPrice = element.TryGetProperty("finalPrice", out var finalPriceEl) ? finalPriceEl.GetDecimal() :
                                    element.TryGetProperty("campaignPrice", out var campPriceEl) ? campPriceEl.GetDecimal() :
                                    element.TryGetProperty("price", out var priceEl2) ? priceEl2.GetDecimal() : 0,
                        ActualStock = element.TryGetProperty("actualStock", out var stockEl) ? stockEl.GetDecimal() : 0,
                        BoxQuantity = element.TryGetProperty("boxQuantity", out var boxQtyEl) ? boxQtyEl.GetInt32() : 1,

                        // ✅ YENİ EKLENEN: TotalPieces field
                        TotalPieces = totalPieces,

                        Weight = element.TryGetProperty("weight", out var weightEl) ? weightEl.GetDecimal() : 0,
                        Unit = element.TryGetProperty("unit", out var unitEl) ? unitEl.GetString() ?? "PCS" : "PCS",
                        SizeStocks = new Dictionary<int, int>()
                    };

                    // Process sizes if available
                    if (element.TryGetProperty("sizes", out var sizesEl))
                    {
                        foreach (var sizeProperty in sizesEl.EnumerateObject())
                        {
                            if (int.TryParse(sizeProperty.Name, out var size))
                            {
                                variantDto.SizeStocks[size] = sizeProperty.Value.GetInt32();
                            }
                        }
                    }

                    return variantDto;
                }).ToList();

                return ApiResponse<List<ProductVariantDto>>.SuccessResponse(variantDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting product variants for {productCode}");
                return ApiResponse<List<ProductVariantDto>>.ErrorResponse($"Error getting product variants: {ex.Message}");
            }
        }

        #region Private Methods

        private async Task<List<dynamic>> LoadProductsAsync()
        {
            try
            {
                if (File.Exists(_productsJsonPath))
                {
                    var jsonContent = await File.ReadAllTextAsync(_productsJsonPath);
                    var options = new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true,
                        AllowTrailingCommas = true
                    };
                    return JsonSerializer.Deserialize<List<JsonElement>>(jsonContent, options)?.Cast<dynamic>().ToList() ?? new List<dynamic>();
                }

                return new List<dynamic>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading products JSON");
                return new List<dynamic>();
            }
        }

        // ✅ YENİ EKLENEN: ProductDetailService için TotalPieces hesaplama
        private int CalculateTotalPiecesForProductDetail(JsonElement element)
        {
            try
            {
                // Önce JSON'dan totalPieces değerini almaya çalış
                if (element.TryGetProperty("totalPieces", out var totalPiecesEl) && totalPiecesEl.ValueKind == JsonValueKind.Number)
                {
                    var totalPieces = totalPiecesEl.GetInt32();
                    if (totalPieces > 0) return totalPieces;
                }

                // totalPieces yoksa veya 0 ise, sizes objesinden hesapla
                if (element.TryGetProperty("sizes", out var sizesElement) && sizesElement.ValueKind == JsonValueKind.Object)
                {
                    int sizesTotal = 0;
                    foreach (var sizeProperty in sizesElement.EnumerateObject())
                    {
                        if (sizeProperty.Value.ValueKind == JsonValueKind.Number)
                        {
                            sizesTotal += sizeProperty.Value.GetInt32();
                        }
                        else if (sizeProperty.Value.ValueKind == JsonValueKind.String &&
                                int.TryParse(sizeProperty.Value.GetString(), out int sizeValue))
                        {
                            sizesTotal += sizeValue;
                        }
                    }

                    if (sizesTotal > 0) return sizesTotal;
                }

                // Her ikisi de yoksa default 1
                return 1;
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Error calculating totalPieces in ProductDetailService: {ex.Message}");
                return 1;
            }
        }

        #endregion
    }

    #endregion

    #region Helper Classes

    public class ProductInfo
    {
        public string ProductCode { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public decimal FinalPrice { get; set; }
        public bool IsAssorted { get; set; }
        public int BoxQuantity { get; set; }

        // ✅ YENİ EKLENEN: TotalPieces field
        public int TotalPieces { get; set; } = 1;

        public decimal Weight { get; set; }
        public string Unit { get; set; } = string.Empty;
        public string OuterMaterial { get; set; } = string.Empty;
        public string InnerMaterial { get; set; } = string.Empty;
        public string SoleMaterial { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public string ProductGroup { get; set; } = string.Empty;
    }

    #endregion
}