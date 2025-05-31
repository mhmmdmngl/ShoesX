using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using ClosedXML.Excel;
using WholesaleShoeStore.Models;
using WholesaleShoeStore.Repositories;

namespace WholesaleShoeStore.Controllers
{
    public class UploadController : Controller
    {
        private readonly IGenericRepository<Shoe> _shoeRepository;
        private readonly IGenericRepository<Brand> _brandRepository;
        private readonly IGenericRepository<ShoeStock> _shoeStockRepository;
        private readonly ILogger<UploadController> _logger;
        private readonly IWebHostEnvironment _environment;

        public UploadController(
            IGenericRepository<Shoe> shoeRepository,
            IGenericRepository<Brand> brandRepository,
            IGenericRepository<ShoeStock> shoeStockRepository,
            ILogger<UploadController> logger,
            IWebHostEnvironment environment)
        {
            _shoeRepository = shoeRepository;
            _brandRepository = brandRepository;
            _shoeStockRepository = shoeStockRepository;
            _logger = logger;
            _environment = environment;
        }

        // GET: Upload/Index
        public IActionResult Index()
        {
            return View();
        }

        // POST: Upload/ProcessExcel
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ProcessExcel(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return Json(new { success = false, message = "Dosya seçilmedi!" });
            }

            if (!IsValidExcelFile(file))
            {
                return Json(new { success = false, message = "Geçersiz dosya formatı! Sadece .xls ve .xlsx dosyaları kabul edilir." });
            }

            try
            {
                var result = await ProcessExcelFileAsync(file);
                return Json(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Excel dosyası işlenirken hata oluştu");
                return Json(new { success = false, message = "Dosya işlenirken hata oluştu: " + ex.Message });
            }
        }

        // POST: Upload/SaveToDatabase
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SaveToDatabase([FromBody] SaveDataRequest request)
        {
            if (request?.Data == null || !request.Data.Any())
            {
                return Json(new { success = false, message = "Kaydedilecek veri bulunamadı!" });
            }

            try
            {
                var result = await SaveShoesToDatabaseAsync(request.Data);
                return Json(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Veritabanına kaydetme sırasında hata oluştu");
                return Json(new { success = false, message = "Kaydetme sırasında hata oluştu: " + ex.Message });
            }
        }

        // Private Methods
        private bool IsValidExcelFile(IFormFile file)
        {
            var allowedExtensions = new[] { ".xls", ".xlsx" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            return allowedExtensions.Contains(extension);
        }

        private async Task<object> ProcessExcelFileAsync(IFormFile file)
        {
            var processedData = new List<ShoeDataDto>();
            var images = new List<ImageDataDto>();
            var errors = new List<string>();

            using (var stream = new MemoryStream())
            {
                await file.CopyToAsync(stream);
                stream.Position = 0;

                using (var workbook = new XLWorkbook(stream))
                {
                    var worksheet = workbook.Worksheets.FirstOrDefault();
                    if (worksheet == null)
                    {
                        return new { success = false, message = "Excel dosyasında sayfa bulunamadı!" };
                    }

                    // Extract images from column A (ClosedXML doesn't support image extraction well)
                    // We'll handle this differently - images will be handled via file upload or URL

                    var usedRange = worksheet.RangeUsed();
                    if (usedRange == null || usedRange.RowCount() < 2)
                    {
                        return new { success = false, message = "Excel dosyasında veri bulunamadı!" };
                    }

                    var rowCount = usedRange.RowCount();
                    var colCount = usedRange.ColumnCount();

                    // Get headers from row 1 (starting from column B)
                    var headers = new Dictionary<int, string>();
                    for (int col = 2; col <= colCount; col++)
                    {
                        var headerCell = worksheet.Cell(1, col);
                        var headerValue = GetCellValueAsString(headerCell);
                        if (!string.IsNullOrEmpty(headerValue))
                        {
                            headers[col] = headerValue;
                        }
                    }

                    // Process data rows
                    for (int row = 2; row <= rowCount; row++)
                    {
                        try
                        {
                            var shoeData = ProcessDataRow(worksheet, row, headers, row - 1);
                            if (shoeData != null)
                            {
                                processedData.Add(shoeData);
                            }
                        }
                        catch (Exception ex)
                        {
                            errors.Add($"Satır {row}: {ex.Message}");
                            _logger.LogWarning($"Satır {row} işlenirken hata: {ex.Message}");
                        }
                    }
                }
            }

            return new
            {
                success = true,
                data = processedData,
                images = images.Count,
                totalRows = processedData.Count,
                errors = errors,
                message = $"{processedData.Count} kayıt başarıyla işlendi!"
            };
        }

        // Helper method to safely get cell value as string
        private string GetCellValueAsString(IXLCell cell)
        {
            if (cell == null || cell.IsEmpty() || cell.Value.IsBlank)
                return string.Empty;

            try
            {
                return cell.Value.ToString().Trim();
            }
            catch
            {
                return string.Empty;
            }
        }

        // Helper method to safely get cell value as decimal
        private decimal GetCellValueAsDecimal(IXLCell cell)
        {
            if (cell == null || cell.IsEmpty() || cell.Value.IsBlank)
                return 0;

            try
            {
                var cellValue = cell.Value.ToString().Trim().Replace(",", ".");
                if (decimal.TryParse(cellValue, out decimal result))
                    return result;
                return 0;
            }
            catch
            {
                return 0;
            }
        }

        // Helper method to safely get cell value as integer
        private int GetCellValueAsInt(IXLCell cell)
        {
            if (cell == null || cell.IsEmpty() || cell.Value.IsBlank)
                return 0;

            try
            {
                var cellValue = cell.Value.ToString().Trim();
                if (int.TryParse(cellValue, out int result))
                    return result;
                return 0;
            }
            catch
            {
                return 0;
            }
        }

        // Helper method to safely get cell value as boolean
        private bool GetCellValueAsBoolean(IXLCell cell)
        {
            if (cell == null || cell.IsEmpty() || cell.Value.IsBlank)
                return false;

            try
            {
                var cellValue = cell.Value.ToString().Trim().ToUpper();
                return cellValue == "1" || cellValue == "TRUE" || cellValue == "EVET" || cellValue == "YES";
            }
            catch
            {
                return false;
            }
        }

        // Note: ClosedXML doesn't support image extraction from Excel files
        // This is a limitation we'll need to handle differently
        // Images could be uploaded separately or referenced by URL
        private List<ImageDataDto> ExtractImagesFromWorksheet()
        {
            var images = new List<ImageDataDto>();

            _logger.LogWarning("ClosedXML does not support image extraction. Images will need to be handled separately.");

            return images;
        }

        private ShoeDataDto? ProcessDataRow(IXLWorksheet worksheet, int row, Dictionary<int, string> headers, int imageIndex)
        {
            var shoeData = new ShoeDataDto();

            // Check if row has any data
            bool hasData = false;
            for (int col = 2; col <= headers.Keys.Max(); col++)
            {
                var cell = worksheet.Cell(row, col);
                if (!cell.IsEmpty())
                {
                    hasData = true;
                    break;
                }
            }

            if (!hasData) return null;

            // Extract data from each column
            foreach (var header in headers)
            {
                var cell = worksheet.Cell(row, header.Key);
                var cellValue = GetCellValueAsString(cell);
                MapCellValueToShoeData(shoeData, header.Value, cellValue, cell);
            }

            // Check if there's an image in column A (we can't extract it with ClosedXML but we can detect it)
            var imageCell = worksheet.Cell(row, 1);
            if (!imageCell.IsEmpty())
            {
                shoeData.HasImage = true;
                shoeData.ImageFileName = $"image_row_{row}.png";
                // Note: ClosedXML doesn't support image extraction
                // Images would need to be handled separately
            }

            // Validate required fields
            if (string.IsNullOrEmpty(shoeData.ProductCode))
            {
                return null;
            }

            return shoeData;
        }

        private void MapCellValueToShoeData(ShoeDataDto shoeData, string headerName, string cellValue, IXLCell cell)
        {
            switch (headerName.ToUpper().Trim())
            {
                case "KART KODU":
                    shoeData.ProductCode = cellValue;
                    break;
                case "RENK":
                    shoeData.Color = cellValue;
                    break;
                case "DIŞ MALZEME":
                    shoeData.OuterMaterial = cellValue;
                    break;
                case "İÇ MALZEME":
                    shoeData.InnerMaterial = cellValue;
                    break;
                case "TABAN":
                    shoeData.SoleMaterial = cellValue;
                    break;
                case "ÜRÜN GRUBU":
                    shoeData.ProductGroup = cellValue;
                    break;
                case "CİNSİYET":
                    shoeData.Gender = cellValue;
                    break;
                case "ASORTİ":
                    shoeData.IsAssorted = GetCellValueAsBoolean(cell);
                    break;
                case "KOLİ":
                    shoeData.PiecesPerBox = GetCellValueAsInt(cell);
                    break;
                case "FİİLİ STOK":
                    shoeData.TotalStockQuantity = GetCellValueAsInt(cell);
                    break;
                case "FİYAT":
                    shoeData.Price = GetCellValueAsDecimal(cell);
                    break;
                case "KAMPANYALI":
                    shoeData.CampaignPrice = GetCellValueAsDecimal(cell);
                    break;
                case "40":
                    shoeData.Size40 = GetCellValueAsInt(cell);
                    break;
                case "41":
                    shoeData.Size41 = GetCellValueAsInt(cell);
                    break;
                case "42":
                    shoeData.Size42 = GetCellValueAsInt(cell);
                    break;
                case "43":
                    shoeData.Size43 = GetCellValueAsInt(cell);
                    break;
                case "44":
                    shoeData.Size44 = GetCellValueAsInt(cell);
                    break;
            }
        }

        private async Task<object> SaveShoesToDatabaseAsync(List<ShoeDataDto> shoeDataList)
        {
            var savedCount = 0;
            var updatedCount = 0;
            var errorCount = 0;
            var errors = new List<string>();

            // Get or create default brand
            var defaultBrand = await GetOrCreateDefaultBrandAsync();

            foreach (var shoeData in shoeDataList)
            {
                try
                {
                    // Check if shoe already exists
                    var existingShoe = await _shoeRepository.QueryFirstOrDefaultAsync(
                        "SELECT * FROM Shoe WHERE ProductCode = @ProductCode AND Color = @Color",
                        new { ProductCode = shoeData.ProductCode, Color = shoeData.Color });

                    if (existingShoe != null)
                    {
                        // Update existing shoe
                        UpdateShoeFromDto(existingShoe, shoeData, defaultBrand.Id);

                        if (shoeData.HasImage && shoeData.ImageBytes != null)
                        {
                            existingShoe.ImageUrl = await SaveImageAsync(shoeData);
                        }

                        await _shoeRepository.UpdateAsync(existingShoe);
                        await UpdateShoeStocksAsync(existingShoe.Id, shoeData);
                        updatedCount++;
                    }
                    else
                    {
                        // Create new shoe
                        var newShoe = CreateShoeFromDto(shoeData, defaultBrand.Id);

                        if (shoeData.HasImage && shoeData.ImageBytes != null)
                        {
                            newShoe.ImageUrl = await SaveImageAsync(shoeData);
                        }

                        var shoeId = await _shoeRepository.AddAsync(newShoe);
                        await CreateShoeStocksAsync(shoeId, shoeData);
                        savedCount++;
                    }
                }
                catch (Exception ex)
                {
                    errorCount++;
                    errors.Add($"Ürün {shoeData.ProductCode}-{shoeData.Color}: {ex.Message}");
                    _logger.LogError(ex, $"Ürün kaydedilirken hata: {shoeData.ProductCode}-{shoeData.Color}");
                }
            }

            return new
            {
                success = true,
                savedCount = savedCount,
                updatedCount = updatedCount,
                errorCount = errorCount,
                errors = errors,
                message = $"{savedCount} yeni kayıt eklendi, {updatedCount} kayıt güncellendi!"
            };
        }

        private async Task<Brand> GetOrCreateDefaultBrandAsync()
        {
            var defaultBrand = await _brandRepository.QueryFirstOrDefaultAsync(
                "SELECT * FROM Brand WHERE Name = @Name",
                new { Name = "Default Brand" });

            if (defaultBrand == null)
            {
                defaultBrand = new Brand
                {
                    Name = "Default Brand",
                    Description = "Varsayılan marka",
                    Country = "Turkey"
                };

                defaultBrand.Id = await _brandRepository.AddAsync(defaultBrand);
            }

            return defaultBrand;
        }

        private Shoe CreateShoeFromDto(ShoeDataDto dto, int brandId)
        {
            return new Shoe
            {
                BrandId = brandId,
                ProductCode = dto.ProductCode,
                Name = $"{dto.Color} {dto.OuterMaterial} {dto.ProductGroup}",
                Type = dto.ProductGroup ?? "SHOE",
                Gender = dto.Gender ?? "UNISEX",
                Color = dto.Color ?? "",
                Price = dto.Price,
                OuterMaterial = dto.OuterMaterial,
                InnerMaterial = dto.InnerMaterial,
                SoleMaterial = dto.SoleMaterial,
                PiecesPerBox = dto.PiecesPerBox,
                IsAssorted = dto.IsAssorted,
                TotalStockQuantity = dto.TotalStockQuantity,
                Description = $"{dto.OuterMaterial} malzemeli {dto.Gender?.ToLower()} ayakkabısı"
            };
        }

        private void UpdateShoeFromDto(Shoe shoe, ShoeDataDto dto, int brandId)
        {
            shoe.BrandId = brandId;
            shoe.Name = $"{dto.Color} {dto.OuterMaterial} {dto.ProductGroup}";
            shoe.Type = dto.ProductGroup ?? shoe.Type;
            shoe.Gender = dto.Gender ?? shoe.Gender;
            shoe.Color = dto.Color ?? shoe.Color;
            shoe.Price = dto.Price;
            shoe.OuterMaterial = dto.OuterMaterial;
            shoe.InnerMaterial = dto.InnerMaterial;
            shoe.SoleMaterial = dto.SoleMaterial;
            shoe.PiecesPerBox = dto.PiecesPerBox;
            shoe.IsAssorted = dto.IsAssorted;
            shoe.TotalStockQuantity = dto.TotalStockQuantity;
            shoe.UpdatedAt = DateTime.UtcNow;
        }

        private async Task CreateShoeStocksAsync(int shoeId, ShoeDataDto dto)
        {
            var sizeStocks = new Dictionary<int, int>
            {
                { 40, dto.Size40 },
                { 41, dto.Size41 },
                { 42, dto.Size42 },
                { 43, dto.Size43 },
                { 44, dto.Size44 }
            };

            foreach (var sizeStock in sizeStocks)
            {
                if (sizeStock.Value > 0)
                {
                    var shoeStock = new ShoeStock
                    {
                        ShoeId = shoeId,
                        Size = sizeStock.Key,
                        StockQuantity = sizeStock.Value
                    };

                    await _shoeStockRepository.AddAsync(shoeStock);
                }
            }
        }

        private async Task UpdateShoeStocksAsync(int shoeId, ShoeDataDto dto)
        {
            var sizeStocks = new Dictionary<int, int>
            {
                { 40, dto.Size40 },
                { 41, dto.Size41 },
                { 42, dto.Size42 },
                { 43, dto.Size43 },
                { 44, dto.Size44 }
            };

            foreach (var sizeStock in sizeStocks)
            {
                var existingStock = await _shoeStockRepository.QueryFirstOrDefaultAsync(
                    "SELECT * FROM ShoeStock WHERE ShoeId = @ShoeId AND Size = @Size",
                    new { ShoeId = shoeId, Size = sizeStock.Key });

                if (existingStock != null)
                {
                    existingStock.StockQuantity = sizeStock.Value;
                    existingStock.UpdatedAt = DateTime.UtcNow;
                    await _shoeStockRepository.UpdateAsync(existingStock);
                }
                else if (sizeStock.Value > 0)
                {
                    var newStock = new ShoeStock
                    {
                        ShoeId = shoeId,
                        Size = sizeStock.Key,
                        StockQuantity = sizeStock.Value
                    };

                    await _shoeStockRepository.AddAsync(newStock);
                }
            }
        }

        private async Task<string> SaveImageAsync(ShoeDataDto dto)
        {
            if (dto.ImageBytes == null || dto.ImageBytes.Length == 0)
                return "";

            try
            {
                var uploadsFolder = Path.Combine(_environment.WebRootPath, "images", "products");
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                var fileName = $"{dto.ProductCode}_{dto.Color}_{Guid.NewGuid()}.png";
                var filePath = Path.Combine(uploadsFolder, fileName);

                await System.IO.File.WriteAllBytesAsync(filePath, dto.ImageBytes);

                return $"/images/products/{fileName}";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Resim kaydedilirken hata oluştu");
                return "";
            }
        }
    }

    #region DTOs

    public class ShoeDataDto
    {
        public string ProductCode { get; set; } = "";
        public string Color { get; set; } = "";
        public string OuterMaterial { get; set; } = "";
        public string InnerMaterial { get; set; } = "";
        public string SoleMaterial { get; set; } = "";
        public string ProductGroup { get; set; } = "";
        public string Gender { get; set; } = "";
        public bool IsAssorted { get; set; } = false;
        public int PiecesPerBox { get; set; } = 1;
        public int TotalStockQuantity { get; set; } = 0;
        public decimal Price { get; set; } = 0;
        public decimal CampaignPrice { get; set; } = 0;
        public int Size40 { get; set; } = 0;
        public int Size41 { get; set; } = 0;
        public int Size42 { get; set; } = 0;
        public int Size43 { get; set; } = 0;
        public int Size44 { get; set; } = 0;
        public bool HasImage { get; set; } = false;
        public string ImageFileName { get; set; } = "";
        public byte[]? ImageBytes { get; set; }
    }

    public class ImageDataDto
    {
        public int RowIndex { get; set; }
        public int ColumnIndex { get; set; }
        public byte[] ImageBytes { get; set; } = Array.Empty<byte>();
        public string ContentType { get; set; } = "";
        public string FileName { get; set; } = "";
    }

    public class SaveDataRequest
    {
        public List<ShoeDataDto> Data { get; set; } = new();
    }

    #endregion
}