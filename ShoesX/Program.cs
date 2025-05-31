using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using WholesaleShoeStore.Repositories;
using WholesaleShoeStore.Services;
using WholesaleShoeStore.Models;

var builder = WebApplication.CreateBuilder(args);

// MVC servislerini ekle
builder.Services.AddControllersWithViews();
//// Kestrel ayarlar� - d�� ba�lant�lar� kabul etmek i�in
//builder.WebHost.ConfigureKestrel(options =>
//{
//    options.ListenAnyIP(5000); // HTTP
//    // HTTPS i�in (opsiyonel):
//    // options.ListenAnyIP(5001, listenOptions => 
//    // {
//    //     listenOptions.UseHttps("/path/to/certificate.pfx", "certificate_password");
//    // });
//});
// Session deste�i ekle
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30); // Session s�resi
    options.Cookie.HttpOnly = true;                 // JavaScript eri�imini engelle
    options.Cookie.IsEssential = true;              // GDPR uyumlulu�u i�in gerekli
});

// CORS yap�land�rmas�
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        builder =>
        {
            builder.AllowAnyOrigin()
                   .AllowAnyMethod()
                   .AllowAnyHeader();
        });
});

// JWT yap�land�rmas�
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"])),
            ClockSkew = TimeSpan.Zero
        };
    });

// GenericRepository DI kay�tlar�
builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));

// Servis kay�tlar�
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ICartService, CartService>();
builder.Services.AddScoped<IProductDetailService, ProductDetailService>();
// Uygulama olu�tur
var app = builder.Build();

// Middleware yap�land�rmas�
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseCors("AllowAll");

// Session middleware'ini aktifle�tir
app.UseSession();

app.UseAuthentication();
app.UseAuthorization();

// MVC Route yap�land�rmas�
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

// Uygulamay� �al��t�r
app.Run();