using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using WholesaleShoeStore.Repositories;
using WholesaleShoeStore.Services;
using WholesaleShoeStore.Models;

var builder = WebApplication.CreateBuilder(args);

// MVC servislerini ekle
builder.Services.AddControllersWithViews();
//// Kestrel ayarlarý - dýþ baðlantýlarý kabul etmek için
//builder.WebHost.ConfigureKestrel(options =>
//{
//    options.ListenAnyIP(5000); // HTTP
//    // HTTPS için (opsiyonel):
//    // options.ListenAnyIP(5001, listenOptions => 
//    // {
//    //     listenOptions.UseHttps("/path/to/certificate.pfx", "certificate_password");
//    // });
//});
// Session desteði ekle
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30); // Session süresi
    options.Cookie.HttpOnly = true;                 // JavaScript eriþimini engelle
    options.Cookie.IsEssential = true;              // GDPR uyumluluðu için gerekli
});

// CORS yapýlandýrmasý
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

// JWT yapýlandýrmasý
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

// GenericRepository DI kayýtlarý
builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));

// Servis kayýtlarý
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ICartService, CartService>();
builder.Services.AddScoped<IProductDetailService, ProductDetailService>();
// Uygulama oluþtur
var app = builder.Build();

// Middleware yapýlandýrmasý
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

// Session middleware'ini aktifleþtir
app.UseSession();

app.UseAuthentication();
app.UseAuthorization();

// MVC Route yapýlandýrmasý
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

// Uygulamayý çalýþtýr
app.Run();