using WholesaleShoeStore.Models;
using WholesaleShoeStore.ViewModels;
using WholesaleShoeStore.Repositories;

namespace WholesaleShoeStore.Services
{
    // Ayakkabı servisi interface
    public interface IShoeService
    {
        Task<PagedResult<ShoeDto>> GetShoesAsync(ShoeFilter filter);
        Task<ShoeDto?> GetShoeByIdAsync(int id);
        Task<List<string>> GetAvailableTypesAsync();
        Task<List<string>> GetAvailableGendersAsync();
        Task<List<string>> GetAvailableColorsAsync();
        Task<List<int>> GetAvailableSizesAsync();
        Task<List<string>> GetAvailableMaterialsAsync();
        Task<int> CreateShoeAsync(CreateShoeRequest request);
        Task<bool> UpdateShoeAsync(int id, CreateShoeRequest request);
        Task<bool> DeleteShoeAsync(int id);
    }

    // Marka servisi interface
    public interface IBrandService
    {
        Task<List<Brand>> GetAllBrandsAsync();
        Task<PagedResult<BrandDto>> GetBrandsAsync(BrandFilter filter);
        Task<BrandDto?> GetBrandByIdAsync(int id);
        Task<int> CreateBrandAsync(CreateBrandRequest request);
        Task<bool> UpdateBrandAsync(int id, CreateBrandRequest request);
        Task<bool> DeleteBrandAsync(int id);
    }

    // Ayakkabı servisi implementation
    public class ShoeService : IShoeService
    {
        private readonly IGenericRepository<Shoe> _shoeRepository;
        private readonly IGenericRepository<ShoeStock> _shoeStockRepository;
        private readonly IGenericRepository<Brand> _brandRepository;

        public ShoeService(
            IGenericRepository<Shoe> shoeRepository,
            IGenericRepository<ShoeStock> shoeStockRepository,
            IGenericRepository<Brand> brandRepository)
        {
            _shoeRepository = shoeRepository;
            _shoeStockRepository = shoeStockRepository;
            _brandRepository = brandRepository;
        }

        public async Task<PagedResult<ShoeDto>> GetShoesAsync(ShoeFilter filter)
        {
            var whereConditions = new List<string>();
            var parameters = new Dictionary<string, object>();

            // Aktif ayakkabılar
            whereConditions.Add("s.IsActive = @IsActive");
            parameters.Add("IsActive", true);

            // Marka filtresi
            if (filter.BrandIds?.Any() == true)
            {
                var brandIds = string.Join(",", filter.BrandIds);
                whereConditions.Add($"s.BrandId IN ({brandIds})");
            }

            // Tür filtresi
            if (filter.Types?.Any() == true)
            {
                var typeParams = filter.Types.Select((t, i) => $"@Type{i}").ToArray();
                whereConditions.Add($"s.Type IN ({string.Join(",", typeParams)})");
                for (int i = 0; i < filter.Types.Count; i++)
                {
                    parameters.Add($"Type{i}", filter.Types[i]);
                }
            }

            // Cinsiyet filtresi
            if (filter.Genders?.Any() == true)
            {
                var genderParams = filter.Genders.Select((g, i) => $"@Gender{i}").ToArray();
                whereConditions.Add($"s.Gender IN ({string.Join(",", genderParams)})");
                for (int i = 0; i < filter.Genders.Count; i++)
                {
                    parameters.Add($"Gender{i}", filter.Genders[i]);
                }
            }

            // Renk filtresi
            if (filter.Colors?.Any() == true)
            {
                var colorParams = filter.Colors.Select((c, i) => $"@Color{i}").ToArray();
                whereConditions.Add($"s.Color IN ({string.Join(",", colorParams)})");
                for (int i = 0; i < filter.Colors.Count; i++)
                {
                    parameters.Add($"Color{i}", filter.Colors[i]);
                }
            }

            // Fiyat aralığı
            if (filter.MinPrice.HasValue)
            {
                whereConditions.Add("s.Price >= @MinPrice");
                parameters.Add("MinPrice", filter.MinPrice.Value);
            }
            if (filter.MaxPrice.HasValue)
            {
                whereConditions.Add("s.Price <= @MaxPrice");
                parameters.Add("MaxPrice", filter.MaxPrice.Value);
            }

            // Ürün kodu arama
            if (!string.IsNullOrEmpty(filter.ProductCodeContains))
            {
                whereConditions.Add("s.ProductCode LIKE @ProductCode");
                parameters.Add("ProductCode", $"%{filter.ProductCodeContains}%");
            }

            // İsim arama
            if (!string.IsNullOrEmpty(filter.NameContains))
            {
                whereConditions.Add("s.Name LIKE @Name");
                parameters.Add("Name", $"%{filter.NameContains}%");
            }

            // Asorti filtresi
            if (filter.IsAssorted.HasValue)
            {
                whereConditions.Add("s.IsAssorted = @IsAssorted2");
                parameters.Add("IsAssorted2", filter.IsAssorted.Value);
            }

            // İç malzeme filtresi
            if (!string.IsNullOrEmpty(filter.InnerMaterial))
            {
                whereConditions.Add("s.InnerMaterial = @InnerMaterial");
                parameters.Add("InnerMaterial", filter.InnerMaterial);
            }

            // Stok durumu filtresi
            if (filter.HasStock == true)
            {
                whereConditions.Add("s.TotalStockQuantity > 0");
            }

            // Numara filtresi (ShoeStock tablosu ile)
            if (filter.Sizes?.Any() == true)
            {
                var sizeIds = string.Join(",", filter.Sizes);
                whereConditions.Add($"EXISTS (SELECT 1 FROM ShoeStocks ss WHERE ss.ShoeId = s.Id AND ss.Size IN ({sizeIds}) AND ss.AvailableQuantity > 0)");
            }

            var whereClause = whereConditions.Any() ? string.Join(" AND ", whereConditions) : "";

            var sql = $@"
                SELECT s.*, b.Name as BrandName
                FROM Shoes s
                LEFT JOIN Brands b ON s.BrandId = b.Id
                {(string.IsNullOrEmpty(whereClause) ? "" : $"WHERE {whereClause}")}";

            var countSql = $@"
                SELECT COUNT(*)
                FROM Shoes s
                LEFT JOIN Brands b ON s.BrandId = b.Id
                {(string.IsNullOrEmpty(whereClause) ? "" : $"WHERE {whereClause}")}";

            // Toplam sayı
            var totalCount = await _shoeRepository.ExecuteScalarAsync<int>(countSql, parameters);

            // Sayfalama ve sıralama
            var orderBy = $"s.{filter.SortBy} {(filter.SortAscending ? "ASC" : "DESC")}";
            var offset = (filter.PageNumber - 1) * filter.PageSize;

            sql += $" ORDER BY {orderBy} LIMIT {filter.PageSize} OFFSET {offset}";

            var shoes = await _shoeRepository.QueryAsync(sql, parameters);

            var shoeDtos = new List<ShoeDto>();
            foreach (var shoe in shoes)
            {
                var shoeDto = MapToShoeDto(shoe);

                // Stok bilgilerini getir
                var stockSql = "SELECT * FROM ShoeStocks WHERE ShoeId = @ShoeId AND IsActive = 1";
                var stocks = await _shoeStockRepository.QueryAsync(stockSql, new { ShoeId = shoe.Id });

                shoeDto.SizeStocks = stocks.Select(MapToShoeStockDto).ToList();
                shoeDtos.Add(shoeDto);
            }

            return PagedResult<ShoeDto>.Create(shoeDtos, totalCount, filter.PageNumber, filter.PageSize);
        }

        public async Task<ShoeDto?> GetShoeByIdAsync(int id)
        {
            var sql = @"
                SELECT s.*, b.Name as BrandName
                FROM Shoes s
                LEFT JOIN Brands b ON s.BrandId = b.Id
                WHERE s.Id = @Id AND s.IsActive = 1";

            var shoe = await _shoeRepository.QuerySingleOrDefaultAsync(sql, new { Id = id });
            if (shoe == null) return null;

            var shoeDto = MapToShoeDto(shoe);

            // Stok bilgilerini getir
            var stockSql = "SELECT * FROM ShoeStocks WHERE ShoeId = @ShoeId AND IsActive = 1";
            var stocks = await _shoeStockRepository.QueryAsync(stockSql, new { ShoeId = id });

            shoeDto.SizeStocks = stocks.Select(MapToShoeStockDto).ToList();

            return shoeDto;
        }

        public async Task<List<string>> GetAvailableTypesAsync()
        {
            var sql = "SELECT DISTINCT Type FROM Shoes WHERE IsActive = 1 ORDER BY Type";
            var types = await _shoeRepository.ExecuteScalarAsync<string>(sql);
            return new List<string> { types }; // Bu kısım düzeltilmeli - QueryAsync kullan
        }

        public async Task<List<string>> GetAvailableGendersAsync()
        {
            var sql = "SELECT DISTINCT Gender FROM Shoes WHERE IsActive = 1 ORDER BY Gender";
            var result = await _shoeRepository.QueryAsync(sql);
            return result.Select(r => r.Gender).Distinct().ToList();
        }

        public async Task<List<string>> GetAvailableColorsAsync()
        {
            var sql = "SELECT DISTINCT Color FROM Shoes WHERE IsActive = 1 ORDER BY Color";
            var result = await _shoeRepository.QueryAsync(sql);
            return result.Select(r => r.Color).Distinct().ToList();
        }

        public async Task<List<int>> GetAvailableSizesAsync()
        {
            var sql = "SELECT DISTINCT Size FROM ShoeStocks WHERE IsActive = 1 AND AvailableQuantity > 0 ORDER BY Size";
            var result = await _shoeStockRepository.QueryAsync(sql);
            return result.Select(r => r.Size).Distinct().ToList();
        }

        public async Task<List<string>> GetAvailableMaterialsAsync()
        {
            var sql = "SELECT DISTINCT InnerMaterial FROM Shoes WHERE IsActive = 1 AND InnerMaterial IS NOT NULL ORDER BY InnerMaterial";
            var result = await _shoeRepository.QueryAsync(sql);
            return result.Select(r => r.InnerMaterial).Where(m => !string.IsNullOrEmpty(m)).Distinct().ToList();
        }

        public async Task<int> CreateShoeAsync(CreateShoeRequest request)
        {
            var shoe = new Shoe
            {
                BrandId = request.BrandId,
                ProductCode = request.ProductCode,
                Name = request.Name,
                Type = request.Type,
                Gender = request.Gender,
                Color = request.Color,
                Price = request.Price,
                ImageUrl = request.ImageUrl,
                Description = request.Description,
                InnerMaterial = request.InnerMaterial,
                OuterMaterial = request.OuterMaterial,
                SoleMaterial = request.SoleMaterial,
                Weight = request.Weight,
                PiecesPerBox = request.PiecesPerBox,
                IsAssorted = request.IsAssorted,
                MainUnit = request.MainUnit
            };

            var shoeId = await _shoeRepository.AddAsync(shoe);

            // İlk stokları ekle
            if (request.InitialStocks?.Any() == true)
            {
                foreach (var stock in request.InitialStocks)
                {
                    var shoeStock = new ShoeStock
                    {
                        ShoeId = shoeId,
                        Size = stock.Size,
                        StockQuantity = stock.Quantity
                    };
                    await _shoeStockRepository.AddAsync(shoeStock);
                }
            }

            return shoeId;
        }

        public async Task<bool> UpdateShoeAsync(int id, CreateShoeRequest request)
        {
            var shoe = await _shoeRepository.GetByIdAsync(id);
            if (shoe == null) return false;

            shoe.BrandId = request.BrandId;
            shoe.ProductCode = request.ProductCode;
            shoe.Name = request.Name;
            shoe.Type = request.Type;
            shoe.Gender = request.Gender;
            shoe.Color = request.Color;
            shoe.Price = request.Price;
            shoe.ImageUrl = request.ImageUrl;
            shoe.Description = request.Description;
            shoe.InnerMaterial = request.InnerMaterial;
            shoe.OuterMaterial = request.OuterMaterial;
            shoe.SoleMaterial = request.SoleMaterial;
            shoe.Weight = request.Weight;
            shoe.PiecesPerBox = request.PiecesPerBox;
            shoe.IsAssorted = request.IsAssorted;
            shoe.MainUnit = request.MainUnit;

            return await _shoeRepository.UpdateAsync(shoe);
        }

        public async Task<bool> DeleteShoeAsync(int id)
        {
            return await _shoeRepository.SoftDeleteAsync(id);
        }

        private ShoeDto MapToShoeDto(Shoe shoe)
        {
            return new ShoeDto
            {
                Id = shoe.Id,
                BrandId = shoe.BrandId,
                BrandName = shoe.Brand?.Name ?? "",
                ProductCode = shoe.ProductCode,
                Name = shoe.Name,
                Type = shoe.Type,
                Gender = shoe.Gender,
                Color = shoe.Color,
                Price = shoe.Price,
                ImageUrl = shoe.ImageUrl,
                Description = shoe.Description,
                InnerMaterial = shoe.InnerMaterial,
                OuterMaterial = shoe.OuterMaterial,
                SoleMaterial = shoe.SoleMaterial,
                Weight = shoe.Weight,
                PiecesPerBox = shoe.PiecesPerBox,
                IsAssorted = shoe.IsAssorted,
                MainUnit = shoe.MainUnit,
                TotalStockQuantity = shoe.TotalStockQuantity,
                CreatedAt = shoe.CreatedAt
            };
        }

        private ShoeStockDto MapToShoeStockDto(ShoeStock stock)
        {
            return new ShoeStockDto
            {
                Id = stock.Id,
                ShoeId = stock.ShoeId,
                Size = stock.Size,
                StockQuantity = stock.StockQuantity,
                ReservedQuantity = stock.ReservedQuantity,
                AvailableQuantity = stock.AvailableQuantity,
                UpdatedAt = stock.UpdatedAt
            };
        }
    }

    // Marka servisi implementation
    public class BrandService : IBrandService
    {
        private readonly IGenericRepository<Brand> _brandRepository;

        public BrandService(IGenericRepository<Brand> brandRepository)
        {
            _brandRepository = brandRepository;
        }

        public async Task<List<Brand>> GetAllBrandsAsync()
        {
            var brands = await _brandRepository.FindAsync("IsActive = @IsActive", new { IsActive = true });
            return brands.OrderBy(b => b.Name).ToList();
        }

        public async Task<PagedResult<BrandDto>> GetBrandsAsync(BrandFilter filter)
        {
            var whereConditions = new List<string> { "IsActive = @IsActive" };
            var parameters = new Dictionary<string, object> { { "IsActive", true } };

            // İsim filtresi
            if (!string.IsNullOrEmpty(filter.NameContains))
            {
                whereConditions.Add("Name LIKE @NameContains");
                parameters.Add("NameContains", $"%{filter.NameContains}%");
            }

            // Ülke filtresi
            if (!string.IsNullOrEmpty(filter.Country))
            {
                whereConditions.Add("Country = @Country");
                parameters.Add("Country", filter.Country);
            }

            var whereClause = string.Join(" AND ", whereConditions);

            // Sayfalama ile sonuçları getir
            var result = await _brandRepository.FindPagedAsync(whereClause, parameters, filter.PageNumber, filter.PageSize, filter.SortBy);

            var brandDtos = result.Items.Select(MapToBrandDto).ToList();

            return PagedResult<BrandDto>.Create(brandDtos, result.TotalCount, filter.PageNumber, filter.PageSize);
        }

        public async Task<BrandDto?> GetBrandByIdAsync(int id)
        {
            var brand = await _brandRepository.GetByIdAsync(id);
            if (brand == null || !brand.IsActive) return null;

            return MapToBrandDto(brand);
        }

        public async Task<int> CreateBrandAsync(CreateBrandRequest request)
        {
            var brand = new Brand
            {
                Name = request.Name,
                Description = request.Description,
                LogoUrl = request.LogoUrl,
                Country = request.Country
            };

            return await _brandRepository.AddAsync(brand);
        }

        public async Task<bool> UpdateBrandAsync(int id, CreateBrandRequest request)
        {
            var brand = await _brandRepository.GetByIdAsync(id);
            if (brand == null) return false;

            brand.Name = request.Name;
            brand.Description = request.Description;
            brand.LogoUrl = request.LogoUrl;
            brand.Country = request.Country;

            return await _brandRepository.UpdateAsync(brand);
        }

        public async Task<bool> DeleteBrandAsync(int id)
        {
            return await _brandRepository.SoftDeleteAsync(id);
        }

        private BrandDto MapToBrandDto(Brand brand)
        {
            return new BrandDto
            {
                Id = brand.Id,
                Name = brand.Name,
                Description = brand.Description,
                LogoUrl = brand.LogoUrl,
                Country = brand.Country,
                ShoeCount = brand.Shoes?.Count ?? 0,
                CreatedAt = brand.CreatedAt
            };
        }
    }
}