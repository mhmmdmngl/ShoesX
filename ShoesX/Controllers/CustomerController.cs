using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System.Text.Json;
using WholesaleShoeStore.Models;
using WholesaleShoeStore.Services;
using WholesaleShoeStore.ViewModels;

namespace WholesaleShoeStore.Controllers
{
    public class CustomerController : Controller
    {
        private readonly IAuthService _authService;
        private readonly ICartService? _cartService;
        private readonly IProductDetailService? _productDetailService;
        private readonly string _productsJsonPath;

        public CustomerController(IAuthService authService, ICartService? cartService = null, IProductDetailService? productDetailService = null)
        {
            _authService = authService;
            _cartService = cartService;
            _productDetailService = productDetailService;
            _productsJsonPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "data", "shoes.json");
        }

        // GET: Customer/Login
        public IActionResult Login()
        {
            if (HttpContext.Session.GetInt32("UserId").HasValue)
            {
                return RedirectToAction("Index");
            }
            return View();
        }

        // POST: Customer/Login
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Login(LoginRequest model)
        {
            if (!ModelState.IsValid)
            {
                return View(model);
            }

            try
            {
                var result = await _authService.LoginAsync(model);

                if (result != null && result.UserType == "Customer")
                {
                    HttpContext.Session.SetString("JwtToken", result.Token);
                    HttpContext.Session.SetString("UserEmail", result.Email);
                    HttpContext.Session.SetInt32("UserId", result.UserId);

                    return RedirectToAction("Index");
                }
                else if (result != null && result.UserType != "Customer")
                {
                    ModelState.AddModelError("", "This login is for customers only.");
                }
                else
                {
                    ModelState.AddModelError("", "Invalid email or password.");
                }
            }
            catch (Exception ex)
            {
                ModelState.AddModelError("", "Login failed: " + ex.Message);
            }

            return View(model);
        }

        // GET: Customer/Index
        public IActionResult Index()
        {
            try
            {
                if (!HttpContext.Session.GetInt32("UserId").HasValue)
                {
                    return RedirectToAction("Login");
                }

                return View();
            }
            catch (Exception ex)
            {
                TempData["ErrorMessage"] = "An error occurred: " + ex.Message;
                return View();
            }
        }

        // GET: Customer/Checkout
        // GET: Customer/Checkout
        public async Task<IActionResult> Checkout()
        {
            try
            {
                var customerId = HttpContext.Session.GetInt32("UserId");
                if (!customerId.HasValue)
                {
                    return RedirectToAction("Login");
                }

                var viewModel = new CheckoutViewModel
                {
                    BillingInfo = new CheckoutBillingInfo
                    {
                        Email = HttpContext.Session.GetString("UserEmail") ?? ""
                    },
                    ShippingInfo = new CheckoutShippingInfo(),
                    CartItems = new List<CheckoutCartItem>(),
                    UseClientCart = true
                };

                // Cart service'den veri çekmeye çalış - customerId kullan
                if (_cartService != null)
                {
                    try
                    {
                        var cartResponse = await _cartService.GetCartAsync(customerId.Value, HttpContext.Session.Id);

                        

                        if (cartResponse.Success && cartResponse.Data != null && cartResponse.Data.Items.Any())
                        {
                            viewModel.CartItems = cartResponse.Data.Items.Select(item => new CheckoutCartItem
                            {
                                Id = item.Id,
                                ProductCode = item.ProductCode,
                                Color = item.Color,
                                Size = item.Size,
                                Quantity = item.Quantity,
                                UnitPrice = item.FinalPrice,
                                TotalPrice = item.Subtotal,
                                IsAssorted = item.IsAssorted,
                                BoxQuantity = item.BoxQuantity,
                                OuterMaterial = item.OuterMaterial,
                                InnerMaterial = item.InnerMaterial,
                                Sole = item.SoleMaterial
                            }).ToList();

                            viewModel.UseClientCart = false;

                        }
                        else
                        {
                        }
                    }
                    catch (Exception ex)
                    {
                    }
                }

                return View(viewModel);
            }
            catch (Exception ex)
            {
                TempData["ErrorMessage"] = "Error loading checkout: " + ex.Message;
                return RedirectToAction("Index");
            }
        }        // POST: Customer/ProcessCheckout
        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult ProcessCheckout(CheckoutViewModel model)
        {
            try
            {
                var customerId = HttpContext.Session.GetInt32("UserId");
                if (!customerId.HasValue)
                {
                    return RedirectToAction("Login");
                }

                if (!ModelState.IsValid)
                {
                    return View("Checkout", model);
                }

                var orderId = new Random().Next(100000, 999999);
                TempData["SuccessMessage"] = "Order placed successfully!";

                return RedirectToAction("OrderConfirmation", new { orderId = orderId });
            }
            catch (Exception ex)
            {
                TempData["ErrorMessage"] = "Error processing order: " + ex.Message;
                return View("Checkout", model);
            }
        }

        // GET: Customer/OrderConfirmation
        public IActionResult OrderConfirmation(int orderId)
        {
            try
            {
                var customerId = HttpContext.Session.GetInt32("UserId");
                if (!customerId.HasValue)
                {
                    return RedirectToAction("Login");
                }

                var model = new OrderConfirmationViewModel
                {
                    OrderId = orderId,
                    OrderDate = DateTime.UtcNow,
                    Status = "Pending",
                    EstimatedDelivery = DateTime.UtcNow.AddDays(7).ToString("MMM dd, yyyy"),
                    TrackingNumber = $"WS{orderId:D6}",
                    CustomerEmail = HttpContext.Session.GetString("UserEmail") ?? ""
                };

                return View(model);
            }
            catch (Exception ex)
            {
                TempData["ErrorMessage"] = "Error: " + ex.Message;
                return RedirectToAction("Index");
            }
        }

        // GET: Customer/Logout
        public IActionResult Logout()
        {
            HttpContext.Session.Clear();
            return RedirectToAction("Login");
        }

        [HttpPost]
        public async Task<IActionResult> AddToCart([FromBody] AddToCartRequest request)
        {
            try
            {
                var customerId = HttpContext.Session.GetInt32("UserId");
                if (!customerId.HasValue)
                {
                    return Json(new { success = false, message = "User not logged in" });
                }

                if (_cartService == null)
                {
                    return Json(new { success = false, message = "Cart service not available" });
                }

                // Session ID'yi request'e ekle
                request.SessionId = HttpContext.Session.Id;

                // CustomerId'yi direkt olarak service'e gönder
                var response = await _cartService.AddToCartAsync(customerId.Value, HttpContext.Session.Id, request);

                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
        }

        // API: Get Cart
        [HttpGet]
        public async Task<IActionResult> GetCart()
        {
            try
            {
                var customerId = HttpContext.Session.GetInt32("UserId");
                if (!customerId.HasValue)
                {
                    return Json(new { success = false, message = "User not logged in" });
                }

                if (_cartService == null)
                {
                    return Json(new { success = false, message = "Cart service not available" });
                }

                var response = await _cartService.GetCartAsync(customerId, HttpContext.Session.Id);
                return Json(new { success = response.Success, data = response.Data });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
        }

        // API: Get Cart for Checkout - CustomerId fix
        [HttpGet]
        public async Task<IActionResult> GetCartForCheckout()
        {
            try
            {
                var customerId = HttpContext.Session.GetInt32("UserId");
                if (!customerId.HasValue)
                {
                    return Json(new { success = false, message = "User not logged in" });
                }

                if (_cartService == null)
                {
                    return Json(new { success = false, message = "Cart service not available", useClientCart = true });
                }

                // CustomerId ile cart'ı getir
                var response = await _cartService.GetCartAsync(customerId.Value, HttpContext.Session.Id);

                if (response.Success && response.Data != null && response.Data.Items.Any())
                {
                    var cartSummary = new
                    {
                        items = response.Data.Items.Select(item => new
                        {
                            id = item.Id,
                            productCode = item.ProductCode,
                            color = item.Color,
                            size = item.Size,
                            quantity = item.Quantity,
                            unitPrice = item.FinalPrice,
                            totalPrice = item.Subtotal,
                            isAssorted = item.IsAssorted,
                            boxQuantity = item.BoxQuantity,
                            outerMaterial = item.OuterMaterial,
                            innerMaterial = item.InnerMaterial,
                            sole = item.SoleMaterial
                        }),
                        totalItems = response.Data.TotalItems,
                        totalPrice = response.Data.TotalAmount,
                        useClientCart = false
                    };

                    return Json(new { success = true, data = cartSummary });
                }
                else
                {
                    return Json(new { success = false, message = "Cart is empty", useClientCart = true });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error: " + ex.Message, useClientCart = true });
            }
        }
        // API: Update Cart Item
        [HttpPost]
        public async Task<IActionResult> UpdateCartItem([FromBody] UpdateCartRequest request)
        {
            try
            {
                var customerId = HttpContext.Session.GetInt32("UserId");
                if (!customerId.HasValue)
                {
                    return Json(new { success = false, message = "User not logged in" });
                }

                if (_cartService == null)
                {
                    return Json(new { success = false, message = "Cart service not available" });
                }

                var response = await _cartService.UpdateCartItemAsync(customerId, HttpContext.Session.Id, request);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
        }

        // API: Remove from Cart
        [HttpPost]
        public async Task<IActionResult> RemoveFromCart([FromBody] RemoveFromCartRequest request)
        {
            try
            {
                var customerId = HttpContext.Session.GetInt32("UserId");
                if (!customerId.HasValue)
                {
                    return Json(new { success = false, message = "User not logged in" });
                }

                if (_cartService == null)
                {
                    return Json(new { success = false, message = "Cart service not available" });
                }

                var response = await _cartService.RemoveFromCartAsync(customerId, HttpContext.Session.Id, request.CartId);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
        }

        // API: Clear Cart
        [HttpPost]
        public async Task<IActionResult> ClearCart()
        {
            try
            {
                var customerId = HttpContext.Session.GetInt32("UserId");
                if (!customerId.HasValue)
                {
                    return Json(new { success = false, message = "User not logged in" });
                }

                if (_cartService == null)
                {
                    return Json(new { success = false, message = "Cart service not available" });
                }

                var response = await _cartService.ClearCartAsync(customerId, HttpContext.Session.Id);
                return Json(new { success = response.Success, message = response.Message });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
        }
    }

    #region View Models

    public class CheckoutViewModel
    {
        public CheckoutBillingInfo BillingInfo { get; set; } = new();
        public CheckoutShippingInfo ShippingInfo { get; set; } = new();
        public string PaymentMethod { get; set; } = "Cash";
        public string Notes { get; set; } = "";
        public List<CheckoutCartItem> CartItems { get; set; } = new();
        public bool UseClientCart { get; set; } = false;
    }

    public class CheckoutCartItem
    {
        public int Id { get; set; }
        public string ProductCode { get; set; } = "";
        public string Color { get; set; } = "";
        public int Size { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TotalPrice { get; set; }
        public bool IsAssorted { get; set; }
        public int BoxQuantity { get; set; }
        public string OuterMaterial { get; set; } = "";
        public string InnerMaterial { get; set; } = "";
        public string Sole { get; set; } = "";
    }

    public class CheckoutBillingInfo
    {
        public string CompanyName { get; set; } = "";
        public string ContactName { get; set; } = "";
        public string Email { get; set; } = "";
        public string Phone { get; set; } = "";
        public string TaxId { get; set; } = "";
    }

    public class CheckoutShippingInfo
    {
        public string Address { get; set; } = "";
        public string City { get; set; } = "";
        public string Country { get; set; } = "";
        public string PostalCode { get; set; } = "";
        public string Phone { get; set; } = "";
    }

    public class OrderConfirmationViewModel
    {
        public int OrderId { get; set; }
        public DateTime OrderDate { get; set; }
        public string Status { get; set; } = "";
        public string EstimatedDelivery { get; set; } = "";
        public string TrackingNumber { get; set; } = "";
        public string CustomerEmail { get; set; } = "";
    }

    #endregion
}