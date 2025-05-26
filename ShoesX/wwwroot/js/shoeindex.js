// ===== GLOBAL STATE =====
class ShoeStore {
    constructor() {
        this.allProducts = [];
        this.productGroups = {};
        this.filteredGroups = {};
        this.cart = [];
        this.uniqueValues = {
            colors: new Set(),
            materials: new Set(),
            soles: new Set(),
            productGroups: new Set(),
            genders: new Set()
        };
        this.currentPage = 1;
        this.productsPerPage = 12;
        this.currentView = 'grid';
        this.isLoading = false;
        this.backendUrl = ''; // Base URL backend için
    }

    // ===== BACKEND INTEGRATION METHODS =====

    // AddToCart method'unu düzelt - SIZE parametresi eklendi
    async addToCartBackend(productCode, color, size, quantity) {
        try {
            const requestData = {
                ProductCode: productCode,
                Color: color,
                Size: size || 42, // Default size if not provided
                Quantity: quantity
            };

            const response = await fetch('/Customer/AddToCart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'RequestVerificationToken': this.getAntiForgeryToken()
                },
                body: JSON.stringify(requestData)
            });

            const result = await response.json();

            if (result.success) {
                this.showToast(result.message || 'Product added to cart successfully!', 'success');
                // Frontend cart'ı da güncelle
                await this.syncCartFromBackend();
                return true;
            } else {
                this.showToast(result.message || 'Failed to add product to cart', 'error');
                return false;
            }
        } catch (error) {
            console.error('Backend cart error:', error);
            this.showToast('Network error. Product added to local cart only.', 'warning');
            return false;
        }
    }
    // syncCartFromBackend method'unu düzelt
    async syncCartFromBackend() {
        try {
            const response = await fetch('/Customer/GetCart', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success && result.data && result.data.items) {
                // Backend'den gelen cart data'sını frontend formatına çevir
                this.cart = this.convertBackendCartToFrontend(result.data.items);
                this.updateCartDisplay();
                this.saveCartToStorage(); // Local storage'ı da güncelle
                console.log('Cart synced from backend:', this.cart.length, 'items');
            } else {
                console.log('No backend cart data available');
            }
        } catch (error) {
            console.error('Error syncing cart from backend:', error);
        }
    }
    // convertBackendCartToFrontend method'unu düzelt
    convertBackendCartToFrontend(backendItems) {
        return backendItems.map(item => ({
            id: item.id || Date.now() + Math.random(),
            cartId: item.id, // Backend cart ID'sini sakla
            productCode: item.productCode,
            color: item.color,
            size: item.size || 42,
            outerMaterial: item.outerMaterial || 'N/A',
            innerMaterial: item.innerMaterial || 'N/A',
            sole: item.soleMaterial || 'N/A',
            productGroup: item.productGroup || 'N/A',
            gender: item.gender || 'UNISEX',
            isAssorted: item.isAssorted || false,
            boxQuantity: item.boxQuantity || 0,
            totalPieces: item.totalPieces || 1,
            unitPrice: item.finalPrice || item.price || 0,
            quantity: item.quantity || 1,
            pricePerBox: item.finalPrice || item.price || 0,
            totalPrice: item.subtotal || (item.quantity * (item.finalPrice || item.price || 0)),
            totalPiecesOrdered: (item.quantity || 1) * (item.totalPieces || 1),
            unit: 'BOX',
            sizes: {},
            addedAt: item.createdAt || new Date().toISOString()
        }));
    }
    async removeFromCartBackend(cartId) {
        try {
            const response = await fetch('/Customer/RemoveFromCart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'RequestVerificationToken': this.getAntiForgeryToken()
                },
                body: JSON.stringify({ CartId: cartId })
            });

            const result = await response.json();

            if (result.success) {
                this.showToast(result.message || 'Item removed from cart!', 'success');
                await this.syncCartFromBackend();
                return true;
            } else {
                this.showToast(result.message || 'Failed to remove item from cart', 'error');
                return false;
            }
        } catch (error) {
            console.error('Backend remove cart error:', error);
            this.showToast('Network error. Item removed from local cart only.', 'warning');
            return false;
        }
    }

    async updateCartQuantityBackend(cartId, newQuantity) {
        try {
            const response = await fetch('/Customer/UpdateCartItem', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'RequestVerificationToken': this.getAntiForgeryToken()
                },
                body: JSON.stringify({
                    CartId: cartId,
                    Quantity: newQuantity
                })
            });

            const result = await response.json();

            if (result.success) {
                await this.syncCartFromBackend();
                return true;
            } else {
                this.showToast(result.message || 'Failed to update cart item', 'error');
                return false;
            }
        } catch (error) {
            console.error('Backend update cart error:', error);
            this.showToast('Network error. Item updated in local cart only.', 'warning');
            return false;
        }
    }

    async clearCartBackend() {
        try {
            const response = await fetch('/Customer/ClearCart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'RequestVerificationToken': this.getAntiForgeryToken()
                }
            });

            const result = await response.json();

            if (result.success) {
                this.showToast(result.message || 'Cart cleared successfully!', 'success');
                this.cart = [];
                this.updateCartDisplay();
                this.saveCartToStorage();
                return true;
            } else {
                this.showToast(result.message || 'Failed to clear cart', 'error');
                return false;
            }
        } catch (error) {
            console.error('Backend clear cart error:', error);
            this.showToast('Network error. Cart cleared locally only.', 'warning');
            return false;
        }
    }

    getAntiForgeryToken() {
        // Anti-forgery token'ı sayfa içinden al
        const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
        return token || '';
    }

    // ===== INITIALIZATION =====
    async init() {
        try {
            console.log('Initializing ShoeStore...');
            await this.loadProducts();
            this.initializeEventListeners();

            // İlk önce backend'den cart'ı sync et, sonra local'den yükle
            try {
                await this.syncCartFromBackend();
            } catch (error) {
                console.warn('Backend cart sync failed, using local cart:', error);
            }

            if (this.cart.length === 0) {
                this.loadCartFromStorage();
            }

            this.updateStats();
            console.log('ShoeStore initialized successfully');
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize application');
        }
    }

    // ===== PRODUCT LOADING =====
    async loadProducts() {
        try {
            this.showLoading();

            const response = await fetch('/data/shoes.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.allProducts = await response.json();
            console.log(`Loaded ${this.allProducts.length} products from JSON`);

            this.processProductVariants();
            this.generateDynamicStyles();
            this.renderProducts();

        } catch (error) {
            console.error('Error loading products:', error);
            this.showError('Failed to load products. Using sample data.');
            this.loadSampleData();
        } finally {
            this.hideLoading();
        }
    }

    loadSampleData() {
        this.allProducts = [
            {
                productCode: "3000-1",
                outerMaterial: "LEATHER",
                innerMaterial: "TEXTILE",
                sole: "POLY",
                productGroup: "COMFORT",
                gender: "UNISEX",
                color: "BLACK",
                price: "40.00",
                campaignPrice: "",
                finalPrice: "40.00",
                boxQuantity: "42",
                actualStock: "15",
                totalPieces: "8",
                isAssorted: true,
                sizes: { "40": 2, "41": 2, "42": 2, "43": 2 }
            },
            {
                productCode: "3000-1",
                outerMaterial: "LEATHER",
                innerMaterial: "TEXTILE",
                sole: "POLY",
                productGroup: "COMFORT",
                gender: "UNISEX",
                color: "BROWN",
                price: "40.00",
                campaignPrice: "35.00",
                finalPrice: "35.00",
                boxQuantity: "42",
                actualStock: "8",
                totalPieces: "8",
                isAssorted: true,
                sizes: { "40": 2, "41": 2, "42": 2, "43": 2 }
            },
            {
                productCode: "3000-2",
                outerMaterial: "NUBUCK",
                innerMaterial: "TEXTILE",
                sole: "RUBBER",
                productGroup: "CASUAL",
                gender: "MEN",
                color: "NAVY",
                price: "60.00",
                campaignPrice: "",
                finalPrice: "60.00",
                boxQuantity: "24",
                actualStock: "20",
                totalPieces: "1",
                isAssorted: false,
                sizes: { "42": 1 }
            }
        ];

        console.log('Loaded sample data');
        this.processProductVariants();
        this.generateDynamicStyles();
        this.renderProducts();
    }

    processProductVariants() {
        this.productGroups = {};

        Object.keys(this.uniqueValues).forEach(key => {
            this.uniqueValues[key].clear();
        });

        this.allProducts.forEach(product => {
            const code = product.productCode;

            if (!this.productGroups[code]) {
                this.productGroups[code] = {
                    productCode: code,
                    baseInfo: {
                        outerMaterial: product.outerMaterial || 'N/A',
                        innerMaterial: product.innerMaterial || 'N/A',
                        sole: product.sole || 'N/A',
                        productGroup: product.productGroup || 'N/A',
                        gender: product.gender || 'UNISEX',
                        isAssorted: Boolean(product.isAssorted),
                        totalPieces: parseInt(product.totalPieces) || 1,
                        sizes: product.sizes || {}
                    },
                    variants: [],
                    totalStock: 0,
                    priceRange: { min: Infinity, max: 0 },
                    availableColors: [],
                    hasDiscount: false,
                    primaryVariant: null,
                    availableSizes: new Set()
                };
            }

            const group = this.productGroups[code];
            const price = parseFloat(product.price) || 0;
            const campaignPrice = parseFloat(product.campaignPrice) || 0;
            const finalPrice = parseFloat(product.finalPrice) || price;
            const actualPrice = (campaignPrice > 0 && campaignPrice < price) ? campaignPrice : finalPrice;
            const discount = (campaignPrice > 0 && campaignPrice < price) ?
                Math.round(((price - campaignPrice) / price) * 100) : 0;

            const variant = {
                color: product.color || 'N/A',
                boxQuantity: parseInt(product.boxQuantity) || 0,
                actualStock: parseInt(product.actualStock) || 0,
                price: price,
                campaignPrice: campaignPrice,
                finalPrice: actualPrice,
                discount: discount,
                isOnSale: discount > 0,
                sizes: product.sizes || {},
                totalPieces: parseInt(product.totalPieces) || 1,
                unit: 'BOX'
            };

            group.variants.push(variant);

            if (!group.primaryVariant || variant.actualStock > group.primaryVariant.actualStock) {
                group.primaryVariant = variant;
            }

            group.totalStock += variant.actualStock;
            if (variant.color && !group.availableColors.includes(variant.color)) {
                group.availableColors.push(variant.color);
            }

            if (product.sizes && typeof product.sizes === 'object') {
                Object.keys(product.sizes).forEach(size => {
                    if (product.sizes[size] && product.sizes[size] > 0) {
                        group.availableSizes.add(size);
                    }
                });
            }

            if (actualPrice > 0) {
                if (actualPrice < group.priceRange.min) group.priceRange.min = actualPrice;
                if (actualPrice > group.priceRange.max) group.priceRange.max = actualPrice;
            }
            if (discount > 0) group.hasDiscount = true;

            if (product.color) this.uniqueValues.colors.add(product.color);
            if (product.outerMaterial) this.uniqueValues.materials.add(product.outerMaterial);
            if (product.sole) this.uniqueValues.soles.add(product.sole);
            if (product.productGroup) this.uniqueValues.productGroups.add(product.productGroup);
            if (product.gender) this.uniqueValues.genders.add(product.gender);
        });

        Object.keys(this.productGroups).forEach(key => {
            const group = this.productGroups[key];
            if (group.variants.length === 0) {
                delete this.productGroups[key];
            } else {
                group.availableSizes = Array.from(group.availableSizes).sort((a, b) => parseInt(a) - parseInt(b));
                if (group.priceRange.min === Infinity) {
                    group.priceRange.min = 0;
                    group.priceRange.max = 0;
                }
            }
        });

        this.filteredGroups = { ...this.productGroups };
        console.log(`Processed ${Object.keys(this.productGroups).length} unique products`);
    }

    generateDynamicStyles() {
        const existingStyles = document.getElementById('dynamic-product-styles');
        if (existingStyles) {
            existingStyles.remove();
        }

        const styleElement = document.createElement('style');
        styleElement.id = 'dynamic-product-styles';

        const colorMap = {
            'BLACK': { bg: '#000000', text: '#ffffff' },
            'WHITE': { bg: '#ffffff', text: '#000000', border: 'border: 1px solid #e0e0e0;' },
            'BROWN': { bg: '#8B4513', text: '#ffffff' },
            'TAN': { bg: '#D2B48C', text: '#654321' },
            'NAVY': { bg: '#1e3a8a', text: '#ffffff' },
            'KHAKI': { bg: '#9CAF88', text: '#ffffff' },
            'SAND': { bg: '#F4E4BC', text: '#8B4513' },
            'BEIGE': { bg: '#F5F5DC', text: '#8B4513' },
            'GRAY': { bg: '#808080', text: '#ffffff' },
            'GREY': { bg: '#808080', text: '#ffffff' },
            'ASPHALT': { bg: '#36454F', text: '#ffffff' },
            'FUCHSIA': { bg: '#FF1493', text: '#ffffff' },
            'ANTHRACITE': { bg: '#2F4F4F', text: '#ffffff' },
            'BLUE': { bg: '#0000FF', text: '#ffffff' }
        };

        let cssContent = '';
        this.uniqueValues.colors.forEach(color => {
            const colorKey = color.toUpperCase();
            const style = colorMap[colorKey] || { bg: '#6c757d', text: '#ffffff' };
            const className = color.toLowerCase().replace(/\s+/g, '');

            cssContent += `
                .color-${className} {
                    background: ${style.bg} !important;
                    color: ${style.text} !important;
                    ${style.border || ''}
                }
            `;
        });

        styleElement.textContent = cssContent;
        document.head.appendChild(styleElement);
    }

    // ===== CART MANAGEMENT =====
    addToCart(productCode, color = null, quantity = 1) {
        const group = this.productGroups[productCode];
        if (!group) {
            this.showToast('Product not found!', 'error');
            return;
        }

        if (color) {
            const variant = group.variants.find(v => v.color === color);
            if (variant && variant.actualStock > 0) {
                this.addVariantToCart(group, variant, quantity);
            } else {
                this.showToast('Selected variant out of stock!', 'error');
            }
        } else {
            this.showNewProductModal(group);
        }
    }

    // addVariantToCart method'unu düzelt - size parametresi ekle
    async addVariantToCart(group, variant, quantity = 1, selectedSize = null) {
        if (variant.actualStock < quantity) {
            this.showToast(`Only ${variant.actualStock} boxes available!`, 'error');
            return;
        }

        // Size seçimi - assorted products için gerekli değil
        let size = selectedSize;
        if (!group.baseInfo.isAssorted && !size) {
            // Non-assorted products için size seç
            const availableSizes = Object.keys(variant.sizes || {}).filter(s => variant.sizes[s] > 0);
            size = availableSizes.length > 0 ? parseInt(availableSizes[0]) : 42;
        } else if (group.baseInfo.isAssorted) {
            size = 42; // Assorted products için default size
        }

        // Önce backend'e gönder
        const backendSuccess = await this.addToCartBackend(group.productCode, variant.color, size, quantity);

        if (!backendSuccess) {
            // Backend başarısız olursa local cart'a ekle (fallback)
            this.addVariantToCartLocal(group, variant, quantity, size);
        }

        this.closeNewProductModal();
    }
    // addVariantToCartLocal method'unu düzelt
    addVariantToCartLocal(group, variant, quantity = 1, selectedSize = null) {
        const unitPrice = variant.finalPrice || variant.price || 0;
        const piecesPerBox = variant.totalPieces || 1;
        const size = selectedSize || 42;

        let pricePerBox, totalPrice, totalPiecesOrdered;

        if (group.baseInfo.isAssorted) {
            pricePerBox = unitPrice * piecesPerBox;
            totalPiecesOrdered = quantity * piecesPerBox;
            totalPrice = quantity * pricePerBox;
        } else {
            pricePerBox = unitPrice;
            totalPiecesOrdered = quantity * piecesPerBox;
            totalPrice = quantity * pricePerBox;
        }

        const cartItem = {
            id: Date.now() + Math.random(),
            productCode: group.productCode,
            color: variant.color,
            size: size,
            outerMaterial: group.baseInfo.outerMaterial,
            innerMaterial: group.baseInfo.innerMaterial,
            sole: group.baseInfo.sole,
            productGroup: group.baseInfo.productGroup,
            gender: group.baseInfo.gender,
            isAssorted: group.baseInfo.isAssorted,
            boxQuantity: variant.boxQuantity,
            totalPieces: piecesPerBox,
            unitPrice: unitPrice,
            quantity: quantity,
            pricePerBox: pricePerBox,
            totalPrice: totalPrice,
            totalPiecesOrdered: totalPiecesOrdered,
            unit: 'BOX',
            sizes: variant.sizes || {},
            addedAt: new Date().toISOString()
        };

        const existingItemIndex = this.cart.findIndex(item =>
            item.productCode === cartItem.productCode &&
            item.color === cartItem.color &&
            item.size === cartItem.size
        );

        if (existingItemIndex > -1) {
            const existingItem = this.cart[existingItemIndex];
            const newQuantity = existingItem.quantity + quantity;

            existingItem.quantity = newQuantity;
            existingItem.totalPrice = newQuantity * existingItem.pricePerBox;
            existingItem.totalPiecesOrdered = newQuantity * existingItem.totalPieces;
        } else {
            this.cart.push(cartItem);
        }

        this.saveCartToStorage();
        this.updateCartDisplay();

        const assortedText = group.baseInfo.isAssorted ?
            ` (${totalPiecesOrdered} pieces total)` : '';
        this.showToast(
            `${quantity} box(es) of ${group.productCode} (${variant.color}) added to cart${assortedText}! €${totalPrice.toFixed(2)}`,
            'success'
        );
    }
    async removeFromCart(itemId) {
        // Backend cart item ID'sini bul
        const item = this.cart.find(item => item.id === itemId);
        if (!item) {
            this.showToast('Item not found!', 'error');
            return;
        }

        // Backend'den kaldırmaya çalış
        const backendSuccess = await this.removeFromCartBackend(item.cartId || itemId);

        if (!backendSuccess) {
            // Backend başarısız olursa local'den kaldır
            this.cart = this.cart.filter(item => item.id !== itemId);
            this.saveCartToStorage();
            this.updateCartDisplay();
            this.showToast('Item removed from local cart!', 'warning');
        }
    }

    async updateCartQuantity(itemId, newQuantity) {
        const item = this.cart.find(item => item.id === itemId);
        if (!item) return;

        if (newQuantity <= 0) {
            await this.removeFromCart(itemId);
            return;
        }

        // Backend'de güncellemeye çalış
        const backendSuccess = await this.updateCartQuantityBackend(item.cartId || itemId, newQuantity);

        if (!backendSuccess) {
            // Backend başarısız olursa local'de güncelle
            const itemIndex = this.cart.findIndex(item => item.id === itemId);
            if (itemIndex > -1) {
                const item = this.cart[itemIndex];
                item.quantity = newQuantity;
                item.totalPrice = newQuantity * item.pricePerBox;
                item.totalPiecesOrdered = newQuantity * item.totalPieces;

                this.saveCartToStorage();
                this.updateCartDisplay();
            }
        }
    }

    async clearCart() {
        const backendSuccess = await this.clearCartBackend();

        if (!backendSuccess) {
            // Backend başarısız olursa local'i temizle
            this.cart = [];
            this.saveCartToStorage();
            this.updateCartDisplay();
            this.showToast('Local cart cleared!', 'warning');
        }
    }

    saveCartToStorage() {
        try {
            window.wholesaleCart = JSON.stringify(this.cart);
        } catch (error) {
            console.warn('Could not save cart:', error);
        }
    }

    loadCartFromStorage() {
        try {
            const savedCart = window.wholesaleCart;
            if (savedCart) {
                this.cart = JSON.parse(savedCart);
                this.updateCartDisplay();
            }
        } catch (error) {
            console.warn('Could not load cart:', error);
            this.cart = [];
        }
    }

    updateCartDisplay() {
        const cartSummary = document.getElementById('cartSummary');
        const cartCount = document.querySelector('.cart-count');
        const cartPieces = document.querySelector('.cart-pieces-count');
        const cartTotal = document.querySelector('.cart-total');
        const cartItemsList = document.getElementById('cartItemsList');

        if (!cartSummary) return;

        if (this.cart.length === 0) {
            cartSummary.style.display = 'none';
            return;
        }

        cartSummary.style.display = 'block';

        const totalBoxes = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = this.cart.reduce((sum, item) => sum + item.totalPrice, 0);
        const totalPieces = this.cart.reduce((sum, item) => sum + item.totalPiecesOrdered, 0);

        if (cartCount) cartCount.textContent = `${totalBoxes} boxes`;
        if (cartPieces) cartPieces.textContent = `${totalPieces} pieces`;
        if (cartTotal) cartTotal.textContent = `€${totalPrice.toFixed(2)}`;

        if (cartItemsList) {
            cartItemsList.innerHTML = this.cart.map(item => `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <div class="cart-item-title">
                            ${item.productCode} - ${item.color}
                            ${item.isAssorted ? '<span class="assorted-badge">Assorted</span>' : ''}
                        </div>
                        <div class="cart-item-details">
                            <div class="cart-item-pricing">
                                ${item.isAssorted ? `
                                    <div class="cart-item-unit-price">
                                        ${item.quantity} boxes × ${item.totalPieces} pieces × €${item.unitPrice.toFixed(2)} each
                                    </div>
                                ` : `
                                    <div class="cart-item-unit-price">
                                        ${item.quantity} boxes × €${item.pricePerBox.toFixed(2)} per box
                                    </div>
                                `}
                                <div class="cart-item-total-price">
                                    Total: €${item.totalPrice.toFixed(2)}
                                </div>
                                <div class="cart-item-pieces">
                                    ${item.totalPiecesOrdered} pieces total
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="cart-item-actions">
                        <div class="quantity-controls">
                            <button onclick="shoeStore.updateCartQuantity(${item.id}, ${item.quantity - 1})" class="qty-btn">-</button>
                            <span class="qty-display">${item.quantity}</span>
                            <button onclick="shoeStore.updateCartQuantity(${item.id}, ${item.quantity + 1})" class="qty-btn">+</button>
                        </div>
                        <button onclick="shoeStore.removeFromCart(${item.id})" class="remove-btn">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }

    toggleCartDetails() {
        const cartDetails = document.getElementById('cartDetails');
        const toggleBtn = document.querySelector('.cart-toggle i');

        if (!cartDetails || !toggleBtn) return;

        if (cartDetails.style.display === 'none') {
            cartDetails.style.display = 'block';
            toggleBtn.className = 'fas fa-chevron-down';
        } else {
            cartDetails.style.display = 'none';
            toggleBtn.className = 'fas fa-chevron-up';
        }
    }

    proceedToCheckout() {
        if (this.cart.length === 0) {
            this.showToast('Cart is empty!', 'error');
            return;
        }

        // Save cart to ensure it persists
        this.saveCartToStorage();

        // Show loading message
        this.showToast('Redirecting to checkout...', 'success');

        // Redirect to checkout page
        setTimeout(() => {
            window.location.href = '/Customer/Checkout';
        }, 500);
    }

    // ===== FILTERING & SORTING =====
    filterProducts() {
        this.filteredGroups = { ...this.productGroups };
        this.currentPage = 1;
        this.renderProducts();
        this.updateStats();
    }

    sortProducts() {
        const sortBy = document.getElementById('sortSelect')?.value || 'productCode';
        const groupsArray = Object.values(this.filteredGroups);

        groupsArray.sort((a, b) => {
            switch (sortBy) {
                case 'price':
                    return a.priceRange.min - b.priceRange.min;
                case 'price-desc':
                    return b.priceRange.max - a.priceRange.max;
                case 'color':
                    return (a.availableColors[0] || '').localeCompare(b.availableColors[0] || '');
                case 'actualStock':
                    return b.totalStock - a.totalStock;
                case 'productCode':
                default:
                    return a.productCode.localeCompare(b.productCode);
            }
        });

        this.filteredGroups = {};
        groupsArray.forEach(group => {
            this.filteredGroups[group.productCode] = group;
        });

        this.renderProducts();
    }

    // ===== RENDERING =====
    renderProducts() {
        const container = document.getElementById('productsGrid');
        const noResults = document.getElementById('noResults');
        const pagination = document.getElementById('pagination');

        if (!container) return;

        const groupsArray = Object.values(this.filteredGroups);

        if (groupsArray.length === 0) {
            container.style.display = 'none';
            if (noResults) noResults.style.display = 'block';
            if (pagination) pagination.style.display = 'none';
            return;
        }

        if (noResults) noResults.style.display = 'none';
        container.style.display = 'grid';
        container.className = `products-grid ${this.currentView}-view`;

        const startIndex = (this.currentPage - 1) * this.productsPerPage;
        const endIndex = startIndex + this.productsPerPage;
        const groupsToShow = groupsArray.slice(startIndex, endIndex);

        container.innerHTML = groupsToShow.map(group => this.createProductCard(group)).join('');
        this.generatePagination(groupsArray.length);
    }

    createProductCard(group) {
        if (!group.primaryVariant) {
            console.warn(`No primary variant for ${group.productCode}`);
            return '';
        }

        const primary = group.primaryVariant;
        const unitPrice = primary.finalPrice || primary.price || 0;
        const piecesPerBox = primary.totalPieces || 1;

        let displayPrice;
        if (group.baseInfo.isAssorted && unitPrice > 0) {
            displayPrice = unitPrice * piecesPerBox;
        } else {
            displayPrice = unitPrice;
        }

        const stockLevel = Math.min(100, Math.max(0, (group.totalStock / 50) * 100));
        const stockStatus = stockLevel > 50 ? 'high' : stockLevel > 20 ? 'medium' : 'low';

        return `
            <article class="product-card" data-product="${group.productCode}">
                <div class="product-image">
                    <img src="https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=300&fit=crop&crop=center"
                         alt="${group.productCode}"
                         loading="lazy"
                         onload="this.style.opacity=1">

                    <div class="product-badges">
                        ${group.baseInfo.isAssorted ? '<span class="badge badge-assorted">Assorted</span>' : ''}
                        ${group.hasDiscount ? '<span class="badge badge-sale">Sale</span>' : ''}
                        <span class="badge badge-stock badge-${stockStatus}">
                            ${stockLevel > 50 ? 'In Stock' : stockLevel > 0 ? 'Low Stock' : 'Out of Stock'}
                        </span>
                    </div>

                    <div class="product-overlay">
                        <button class="quick-view-btn" onclick="shoeStore.showProductModal(shoeStore.productGroups['${group.productCode}'])">
                            <i class="fas fa-eye"></i>
                            Quick View
                        </button>
                    </div>
                </div>

                <div class="product-info">
                    <div class="product-header">
                        <span class="product-code">${group.productCode}</span>
                        <div class="product-prices">
                            ${displayPrice > 0 ? `
                                <span class="price-range">€${displayPrice.toFixed(2)}</span>
                                <div class="price-per-box">per box</div>
                                ${group.baseInfo.isAssorted ? `
                                    <div class="price-per-piece">€${unitPrice.toFixed(2)} per piece</div>
                                ` : ''}
                            ` : `
                                <span class="price-range">Contact for pricing</span>
                            `}
                        </div>
                    </div>

                    <h3 class="product-title">
                        ${group.baseInfo.outerMaterial} ${group.baseInfo.productGroup} ${group.baseInfo.gender} Shoe
                    </h3>

                    ${group.baseInfo.isAssorted ? `
                        <div class="assorted-info">
                            <div class="assorted-highlight">
                                <i class="fas fa-boxes"></i>
                                Assorted Product - Mixed sizes in one box
                            </div>
                            <div class="assorted-sizes">
                                <strong>Available Sizes:</strong> 
                                ${group.availableSizes.length > 0 ? group.availableSizes.join(', ') : 'Mixed sizes'}
                            </div>
                        </div>
                    ` : ''}

                    <div class="product-features">
                        <span class="feature-tag">${group.baseInfo.outerMaterial}</span>
                        <span class="feature-tag">${group.baseInfo.sole}</span>
                        <span class="feature-tag">${group.baseInfo.gender}</span>
                        ${group.baseInfo.isAssorted ? '<span class="feature-tag assorted">Assorted</span>' : ''}
                    </div>

                    <div class="color-variants">
                        <label class="variants-label">Available Colors (${group.variants.length}):</label>
                        <div class="color-options">
                            ${group.availableColors.slice(0, 6).map(color => {
            const colorClass = color.toLowerCase().replace(/\s+/g, '');
            const variant = group.variants.find(v => v.color === color);
            const variantPrice = variant ? (variant.finalPrice || variant.price || 0) : 0;
            const variantBoxPrice = group.baseInfo.isAssorted && variantPrice > 0 ?
                variantPrice * piecesPerBox : variantPrice;

            return `<span class="color-dot color-${colorClass}"
                                              title="${color} - €${variantBoxPrice.toFixed(2)} per box"
                                              onclick="shoeStore.addToCart('${group.productCode}', '${color}')"
                                              data-color="${color}"></span>`;
        }).join('')}
                            ${group.availableColors.length > 6 ?
                `<span class="color-more">+${group.availableColors.length - 6}</span>` : ''
            }
                        </div>
                    </div>

                    <div class="product-specs">
                        <div class="spec-row">
                            <span class="spec-label">Available Boxes:</span>
                            <span class="spec-value">${group.totalStock} boxes</span>
                        </div>
                        <div class="spec-row">
                            <span class="spec-label">Pieces per Box:</span>
                            <span class="spec-value">${piecesPerBox} pieces</span>
                        </div>
                        ${displayPrice > 0 ? `
                            <div class="spec-row">
                                <span class="spec-label">Box Price:</span>
                                <span class="spec-value">€${displayPrice.toFixed(2)}</span>
                            </div>
                            ${group.baseInfo.isAssorted ? `
                                <div class="spec-row">
                                    <span class="spec-label">Price per Piece:</span>
                                    <span class="spec-value">€${unitPrice.toFixed(2)}</span>
                                </div>
                            ` : ''}
                        ` : ''}
                    </div>

                    <div class="stock-indicator">
                        <div class="stock-bar">
                            <div class="stock-fill stock-${stockStatus}" style="width: ${stockLevel}%"></div>
                        </div>
                        <div class="stock-info">
                            <span class="stock-text">${Math.round(stockLevel)}% Stock Level</span>
                            <div class="stock-details">
                                <span class="stock-units">${group.totalStock} boxes</span>
                                <span class="stock-pieces">${group.totalStock * piecesPerBox} pieces</span>
                            </div>
                        </div>
                    </div>

                    <div class="product-actions">
                        <button class="btn-secondary" onclick="shoeStore.showProductModal(shoeStore.productGroups['${group.productCode}'])">
                            <i class="fas fa-info-circle"></i>
                            View Details
                        </button>
                        <button class="btn-primary" onclick="shoeStore.addToCart('${group.productCode}')"
                                ${group.totalStock <= 0 ? 'disabled' : ''}>
                            <i class="fas fa-shopping-cart"></i>
                            Add to Cart
                        </button>
                    </div>
                </div>
            </article>
        `;
    }

    generatePagination(totalItems) {
        const totalPages = Math.ceil(totalItems / this.productsPerPage);
        const container = document.getElementById('pagination');

        if (!container || totalPages <= 1) {
            if (container) container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';

        let paginationHTML = '<ul class="pagination-list">';

        if (this.currentPage > 1) {
            paginationHTML += `
                <li class="page-item">
                    <button class="page-link" onclick="shoeStore.changePage(${this.currentPage - 1})">
                        <i class="fas fa-chevron-left"></i>
                        Previous
                    </button>
                </li>
            `;
        }

        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        if (startPage > 1) {
            paginationHTML += `
                <li class="page-item">
                    <button class="page-link" onclick="shoeStore.changePage(1)">1</button>
                </li>
            `;
            if (startPage > 2) {
                paginationHTML += '<li class="page-item"><span class="page-dots">...</span></li>';
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <button class="page-link" onclick="shoeStore.changePage(${i})">${i}</button>
                </li>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += '<li class="page-item"><span class="page-dots">...</span></li>';
            }
            paginationHTML += `
                <li class="page-item">
                    <button class="page-link" onclick="shoeStore.changePage(${totalPages})">${totalPages}</button>
                </li>
            `;
        }

        if (this.currentPage < totalPages) {
            paginationHTML += `
                <li class="page-item">
                    <button class="page-link" onclick="shoeStore.changePage(${this.currentPage + 1})">
                        Next
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </li>
            `;
        }

        paginationHTML += '</ul>';
        container.innerHTML = paginationHTML;
    }

    changePage(page) {
        this.currentPage = page;
        this.renderProducts();

        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.scrollTop = 0;
        } else {
            window.scrollTo(0, 0);
        }
    }

    updateStats() {
        const countElement = document.querySelector('.product-count');
        if (countElement) {
            const totalVariants = Object.values(this.filteredGroups).reduce((sum, group) => sum + group.variants.length, 0);
            countElement.textContent = `${Object.keys(this.filteredGroups).length} Products (${totalVariants} Variants)`;
        }
    }

    clearAllFilters() {
        this.filteredGroups = { ...this.productGroups };
        this.currentPage = 1;
        this.renderProducts();
        this.updateStats();
    }

    // ===== NEW MODAL SYSTEM =====
    // Modal içindeki add to cart button'ları için size selection eklenmesi
    showNewProductModal(group) {
        console.log('Opening NEW modal for:', group.productCode);
        this.closeNewProductModal();

        const modalBackdrop = document.createElement('div');
        modalBackdrop.className = 'newProductModalBackdrop';
        modalBackdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 999999;
        animation: fadeIn 0.3s ease;
    `;

        const modalContainer = document.createElement('div');
        modalContainer.className = 'newProductModalContainer';
        modalContainer.style.cssText = `
        background: white;
        border-radius: 16px;
        width: 95%;
        max-width: 1000px;
        max-height: 90vh;
        overflow: hidden;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
        animation: slideUp 0.3s ease;
        display: flex;
        flex-direction: column;
    `;

        const availableVariants = group.variants.filter(v => v.actualStock > 0);

        modalContainer.innerHTML = `
        <div class="newModalHeader" style="padding: 2rem 2rem 1rem 2rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: #f8fafc;">
            <div>
                <h2 style="margin: 0 0 0.5rem 0; font-size: 1.5rem; font-weight: 700; color: #1f2937;">
                    ${group.baseInfo.outerMaterial} ${group.baseInfo.productGroup}
                </h2>
                <p style="margin: 0; color: #6b7280; font-size: 1rem;">
                    Product Code: <strong>${group.productCode}</strong> • 
                    ${availableVariants.length} variant${availableVariants.length !== 1 ? 's' : ''} available
                </p>
            </div>
            <button class="newModalCloseBtn" style="background: #f3f4f6; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; color: #6b7280; transition: all 0.2s;" onmouseover="this.style.backgroundColor='#e5e7eb'; this.style.color='#374151';" onmouseout="this.style.backgroundColor='#f3f4f6'; this.style.color='#6b7280';">
                <i class="fas fa-times"></i>
            </button>
        </div>

        <div class="newModalBody" style="padding: 2rem; overflow-y: auto; flex: 1;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: start;">
                
                <div class="newModalInfoSection">
                    <div style="margin-bottom: 2rem;">
                        <img src="https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&h=350&fit=crop&crop=center" 
                             alt="${group.productCode}" 
                             style="width: 100%; height: 250px; object-fit: cover; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    </div>

                    <div style="background: #f8fafc; padding: 1.5rem; border-radius: 12px; margin-bottom: 2rem;">
                        <h4 style="margin: 0 0 1rem 0; font-size: 1.1rem; font-weight: 600; color: #374151;">Product Details</h4>
                        <div style="display: grid; gap: 0.75rem;">
                            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb;">
                                <span style="font-weight: 500; color: #6b7280;">Outer Material:</span>
                                <span style="font-weight: 600; color: #1f2937;">${group.baseInfo.outerMaterial}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb;">
                                <span style="font-weight: 500; color: #6b7280;">Inner Material:</span>
                                <span style="font-weight: 600; color: #1f2937;">${group.baseInfo.innerMaterial}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb;">
                                <span style="font-weight: 500; color: #6b7280;">Sole:</span>
                                <span style="font-weight: 600; color: #1f2937;">${group.baseInfo.sole}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb;">
                                <span style="font-weight: 500; color: #6b7280;">Gender:</span>
                                <span style="font-weight: 600; color: #1f2937;">${group.baseInfo.gender}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0;">
                                <span style="font-weight: 500; color: #6b7280;">Pieces per Box:</span>
                                <span style="font-weight: 600; color: #1f2937;">${group.primaryVariant?.totalPieces || 1}</span>
                            </div>
                        </div>
                    </div>

                    ${group.baseInfo.isAssorted && group.availableSizes && group.availableSizes.length > 0 ? `
                        <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 1.5rem; border-radius: 12px;">
                            <h4 style="margin: 0 0 1rem 0; font-size: 1.1rem; font-weight: 600; color: #92400e; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-boxes"></i>
                                Assorted Product
                            </h4>
                            <p style="margin: 0 0 1rem 0; color: #92400e; line-height: 1.5;">
                                Each box contains mixed sizes. Perfect for retailers who want variety.
                            </p>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                                ${group.availableSizes.map(size => `
                                    <span style="background: #f59e0b; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem; font-weight: 500;">
                                        Size ${size}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="newModalVariantsSection">
                    <h4 style="margin: 0 0 1.5rem 0; font-size: 1.2rem; font-weight: 600; color: #1f2937;">
                        Select Color & Quantity
                    </h4>

                    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                        ${availableVariants.map((variant, index) => {
            const colorClass = variant.color.toLowerCase().replace(/\s+/g, '');
            const unitPrice = variant.finalPrice || variant.price || 0;
            const piecesPerBox = variant.totalPieces || 1;

            let displayPrice, priceLabel;
            if (group.baseInfo.isAssorted) {
                displayPrice = unitPrice * piecesPerBox;
                priceLabel = `€${displayPrice.toFixed(2)} per box (€${unitPrice.toFixed(2)} per piece)`;
            } else {
                displayPrice = unitPrice;
                priceLabel = `€${displayPrice.toFixed(2)} per box`;
            }

            const inputId = `newModalQty_${group.productCode}_${index}`;
            const sizeSelectId = `newModalSize_${group.productCode}_${index}`;

            // Size options for non-assorted products
            const availableSizes = variant.sizes && typeof variant.sizes === 'object' ?
                Object.keys(variant.sizes).filter(s => variant.sizes[s] > 0) : [];

            return `
                                <div class="newVariantCard" style="border: 2px solid #e5e7eb; border-radius: 12px; padding: 1.5rem; background: #ffffff; transition: all 0.2s; position: relative;" onmouseover="this.style.borderColor='#3b82f6'; this.style.boxShadow='0 4px 6px rgba(59, 130, 246, 0.1)';" onmouseout="this.style.borderColor='#e5e7eb'; this.style.boxShadow='none';">
                                    
                                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                                        <div class="color-${colorClass}" style="width: 32px; height: 32px; border-radius: 50%; border: 3px solid #e5e7eb; flex-shrink: 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);"></div>
                                        <div style="flex: 1;">
                                            <h5 style="margin: 0 0 0.25rem 0; font-size: 1.1rem; font-weight: 600; color: #1f2937;">
                                                ${variant.color}
                                            </h5>
                                            <p style="margin: 0; font-size: 0.875rem; color: #6b7280;">
                                                ${variant.actualStock} boxes available
                                            </p>
                                        </div>
                                        ${variant.discount > 0 ? `
                                            <span style="background: #ef4444; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">
                                                -${variant.discount}%
                                            </span>
                                        ` : ''}
                                    </div>

                                    <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f8fafc; border-radius: 8px;">
                                        <div style="font-size: 1.25rem; font-weight: 700; color: #1f2937; margin-bottom: 0.25rem;">
                                            ${priceLabel}
                                        </div>
                                        ${group.baseInfo.isAssorted ? `
                                            <div style="font-size: 0.875rem; color: #6b7280;">
                                                Contains ${piecesPerBox} pairs of mixed sizes
                                            </div>
                                        ` : ''}
                                    </div>

                                    ${!group.baseInfo.isAssorted && availableSizes.length > 0 ? `
                                        <div style="margin-bottom: 1.5rem;">
                                            <label for="${sizeSelectId}" style="display: block; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">
                                                Select Size:
                                            </label>
                                            <select id="${sizeSelectId}" style="width: 100%; padding: 0.75rem; border: 2px solid #d1d5db; border-radius: 8px; font-size: 1rem;">
                                                ${availableSizes.map(size => `
                                                    <option value="${size}">Size ${size} (${variant.sizes[size]} available)</option>
                                                `).join('')}
                                            </select>
                                        </div>
                                    ` : ''}

                                    <div style="display: flex; align-items: center; gap: 1rem;">
                                        <div style="flex: 1;">
                                            <label for="${inputId}" style="display: block; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">
                                                Quantity (boxes):
                                            </label>
                                            <input type="number" min="1" max="${variant.actualStock}" value="1" 
                                                   id="${inputId}" style="width: 100%; padding: 0.75rem; border: 2px solid #d1d5db; border-radius: 8px; font-size: 1rem; text-align: center; transition: border-color 0.2s;" onfocus="this.style.borderColor='#3b82f6';" onblur="this.style.borderColor='#d1d5db';">
                                        </div>
                                        <div style="flex: 1;">
                                            <button class="newAddToCartBtn" 
                                                    data-product="${group.productCode}" 
                                                    data-color="${variant.color}"
                                                    data-qty-input="${inputId}"
                                                    data-size-input="${sizeSelectId}"
                                                    data-is-assorted="${group.baseInfo.isAssorted}"
                                                    style="width: 100%; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; border: none; padding: 0.875rem 1.5rem; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 1.5rem;" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(59, 130, 246, 0.3)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                                                <i class="fas fa-shopping-cart"></i>
                                                Add to Cart
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `;
        }).join('')}
                    </div>

                    <div style="margin-top: 2rem; padding: 1.5rem; background: #f0fdf4; border: 1px solid #16a34a; border-radius: 12px;">
                        <h5 style="margin: 0 0 1rem 0; font-size: 1.1rem; font-weight: 600; color: #16a34a; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-chart-line"></i>
                            Stock Summary
                        </h5>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div style="text-align: center;">
                                <div style="font-size: 2rem; font-weight: 700; color: #16a34a;">${group.totalStock}</div>
                                <div style="font-size: 0.875rem; color: #15803d;">Total Boxes</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 2rem; font-weight: 700; color: #16a34a;">${group.totalStock * (group.primaryVariant?.totalPieces || 1)}</div>
                                <div style="font-size: 0.875rem; color: #15803d;">Total Pieces</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

        modalBackdrop.appendChild(modalContainer);
        document.body.appendChild(modalBackdrop);

        this.attachNewModalEventListeners(modalBackdrop);
        document.body.style.overflow = 'hidden';

        console.log('NEW Modal opened successfully');
    }
    closeNewProductModal() {
        const existingModal = document.querySelector('.newProductModalBackdrop');
        if (existingModal) {
            existingModal.style.animation = 'fadeOut 0.2s ease';
            setTimeout(() => {
                existingModal.remove();
                document.body.style.overflow = 'auto';
            }, 200);
        }

        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // attachNewModalEventListeners method'unu güncelle
    attachNewModalEventListeners(modalBackdrop) {
        const closeBtn = modalBackdrop.querySelector('.newModalCloseBtn');
        if (closeBtn) {
            closeBtn.onclick = () => this.closeNewProductModal();
        }

        modalBackdrop.onclick = (e) => {
            if (e.target === modalBackdrop) {
                this.closeNewProductModal();
            }
        };

        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                this.closeNewProductModal();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);

        const addButtons = modalBackdrop.querySelectorAll('.newAddToCartBtn');
        addButtons.forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const productCode = btn.dataset.product;
                const color = btn.dataset.color;
                const qtyInputId = btn.dataset.qtyInput;
                const sizeInputId = btn.dataset.sizeInput;
                const isAssorted = btn.dataset.isAssorted === 'true';

                const qtyInput = document.getElementById(qtyInputId);
                const quantity = parseInt(qtyInput?.value) || 1;

                let selectedSize = null;
                if (!isAssorted && sizeInputId) {
                    const sizeInput = document.getElementById(sizeInputId);
                    selectedSize = sizeInput ? parseInt(sizeInput.value) : null;
                }

                // Group ve variant bilgisini bul
                const group = this.productGroups[productCode];
                const variant = group?.variants.find(v => v.color === color);

                if (group && variant) {
                    this.addVariantToCart(group, variant, quantity, selectedSize);
                }
            };
        });
    }
    // ===== OLD MODAL COMPATIBILITY =====
    showProductModal(group) {
        this.showNewProductModal(group);
    }

    closeProductModal() {
        this.closeNewProductModal();
    }

    // ===== EVENT HANDLERS =====
    initializeEventListeners() {
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentView = btn.dataset.view;
                this.renderProducts();
            });
        });

        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => this.sortProducts());
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeNewProductModal();
            }
        });
    }

    // ===== UTILITY FUNCTIONS =====
    showLoading() {
        const loadingState = document.getElementById('loadingState');
        const productsGrid = document.getElementById('productsGrid');

        if (loadingState) loadingState.style.display = 'flex';
        if (productsGrid) productsGrid.style.display = 'none';
    }

    hideLoading() {
        const loadingState = document.getElementById('loadingState');
        if (loadingState) loadingState.style.display = 'none';
    }

    showError(message) {
        const loadingState = document.getElementById('loadingState');
        const noResults = document.getElementById('noResults');

        if (loadingState) loadingState.style.display = 'none';
        if (noResults) {
            noResults.style.display = 'block';
            const content = noResults.querySelector('.no-results-content');
            if (content) {
                content.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error Loading Products</h3>
                    <p>${message}</p>
                    <button class="btn-clear-filters" onclick="shoeStore.loadProducts()">
                        <i class="fas fa-refresh"></i>
                        Try Again
                    </button>
                `;
            }
        }
    }

    showToast(message, type = 'success') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }

        const container = document.getElementById('toastContainer') || document.body;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 100px;
            right: 2rem;
            background: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            border-left: 4px solid ${type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#ef4444'};
            z-index: 9999;
            transform: translateX(400px);
            transition: transform 0.3s ease;
        `;

        const iconMap = {
            'success': 'check-circle',
            'warning': 'exclamation-triangle',
            'error': 'exclamation-circle'
        };

        const colorMap = {
            'success': '#10b981',
            'warning': '#f59e0b',
            'error': '#ef4444'
        };

        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <i class="fas fa-${iconMap[type] || 'info-circle'}" 
                   style="color: ${colorMap[type] || '#6b7280'}"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: #6b7280; cursor: pointer; margin-left: auto; padding: 0.25rem;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        container.appendChild(toast);

        setTimeout(() => toast.style.transform = 'translateX(0)', 100);
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.transform = 'translateX(400px)';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }
}

// ===== GLOBAL INITIALIZATION =====
const shoeStore = new ShoeStore();

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing ShoeStore...');
    shoeStore.init();
});

// ===== PERIODIC SYNC (Optional) =====
// Her 30 saniyede bir cart'ı backend ile senkronize et
setInterval(() => {
    if (window.shoeStore && typeof window.shoeStore.syncCartFromBackend === 'function') {
        try {
            window.shoeStore.syncCartFromBackend().catch(error => {
                console.warn('Periodic cart sync failed:', error);
            });
        } catch (error) {
            console.warn('Periodic cart sync failed:', error);
        }
    }
}, 30000); // 30 seconds

// Make functions globally available for onclick handlers
window.shoeStore = shoeStore;
window.filterProducts = () => shoeStore.filterProducts();
window.sortProducts = () => shoeStore.sortProducts();
window.changePage = (page) => shoeStore.changePage(page);
window.clearAllFilters = () => shoeStore.clearAllFilters();
window.addToCart = (productCode, color, quantity) => shoeStore.addToCart(productCode, color, quantity);
window.removeFromCart = (itemId) => shoeStore.removeFromCart(itemId);
window.updateCartQuantity = (itemId, quantity) => shoeStore.updateCartQuantity(itemId, quantity);
window.clearCart = () => shoeStore.clearCart();
window.toggleCartDetails = () => shoeStore.toggleCartDetails();
window.proceedToCheckout = () => shoeStore.proceedToCheckout();
window.showProductModal = (group) => shoeStore.showProductModal(group);
window.closeProductModal = () => shoeStore.closeProductModal();
window.loadProducts = () => shoeStore.loadProducts();