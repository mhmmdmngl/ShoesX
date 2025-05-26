using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using WholesaleShoeStore.Models;
using WholesaleShoeStore.ViewModels;
using WholesaleShoeStore.Services;

namespace WholesaleShoeStore.Controllers
{
    [Authorize(Roles = "Customer")]
    public class CustomerShoesController : Controller
    {
        private readonly IShoeService _shoeService;
        private readonly IBrandService _brandService;

        public CustomerShoesController(IShoeService shoeService, IBrandService brandService)
        {
            _shoeService = shoeService;
            _brandService = brandService;
        }

        // GET: CustomerShoes/Index
        public async Task<IActionResult> Index(ShoeFilter filter)
        {
            try
            {
                // Default filter değerleri
                if (filter.PageSize <= 0) filter.PageSize = 12;
                if (filter.PageNumber <= 0) filter.PageNumber = 1;

                // Ayakkabıları getir (filtrelenmiş)
                var shoes = await _shoeService.GetShoesAsync(filter);

                // Markaları getir (filter için)
                var brands = await _brandService.GetAllBrandsAsync();

                // Filter seçenekleri için veriler
                var filterOptions = new ShoeFilterOptions
                {
                    Brands = brands.Select(b => new BrandDto
                    {
                        Id = b.Id,
                        Name = b.Name
                    }).ToList(),
                    Types = await _shoeService.GetAvailableTypesAsync(),
                    Genders = await _shoeService.GetAvailableGendersAsync(),
                    Colors = await _shoeService.GetAvailableColorsAsync(),
                    Sizes = await _shoeService.GetAvailableSizesAsync(),
                    Materials = await _shoeService.GetAvailableMaterialsAsync()
                };

                var viewModel = new CustomerShoesIndexViewModel
                {
                    Shoes = shoes,
                    Filter = filter,
                    FilterOptions = filterOptions
                };

                return View(viewModel);
            }
            catch (Exception ex)
            {
                TempData["ErrorMessage"] = "Ayakkabılar yüklenirken bir hata oluştu: " + ex.Message;
                return View(new CustomerShoesIndexViewModel());
            }
        }

        // GET: CustomerShoes/Details/5
        public async Task<IActionResult> Details(int id)
        {
            try
            {
                var shoe = await _shoeService.GetShoeByIdAsync(id);
                if (shoe == null)
                {
                    return NotFound();
                }

                return View(shoe);
            }
            catch (Exception ex)
            {
                TempData["ErrorMessage"] = "Ayakkabı detayları yüklenirken bir hata oluştu: " + ex.Message;
                return RedirectToAction(nameof(Index));
            }
        }

        // AJAX: Filtrelemeyi güncellemek için
        [HttpPost]
        public async Task<IActionResult> FilterShoes([FromBody] ShoeFilter filter)
        {
            try
            {
                var shoes = await _shoeService.GetShoesAsync(filter);
                return PartialView("_ShoesGrid", shoes);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }
    }

    // ViewModel'ler
    public class CustomerShoesIndexViewModel
    {
        public PagedResult<ShoeDto> Shoes { get; set; } = new();
        public ShoeFilter Filter { get; set; } = new();
        public ShoeFilterOptions FilterOptions { get; set; } = new();
    }

    public class ShoeFilterOptions
    {
        public List<BrandDto> Brands { get; set; } = new();
        public List<string> Types { get; set; } = new();
        public List<string> Genders { get; set; } = new();
        public List<string> Colors { get; set; } = new();
        public List<int> Sizes { get; set; } = new();
        public List<string> Materials { get; set; } = new();
    }
}