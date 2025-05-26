// ===== CART MANAGER =====
class CartManager {
    constructor() {
        this.cart = [];
        this.backendUrl = '';
    }

    // ===== BACKEND INTEGRATION =====
    async addToCartBackend(productCode, color, size, quantity) {
        try {
            const requestData = {
                ProductCode: productCode,
                Color: color,
                Size: size || 42,
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
                this.cart = this.convertBackendCartToFrontend(result.data.items);
                this.updateCartDisplay();
                this.saveCartToStorage();
                console.log('Cart synced from backend:', this.cart.length, 'items');
            } else {
                console.log('No backend cart data available');
            }
        } catch (error) {
            console.error('Error syncing cart from backend:', error);
        }
    }

    convertBackendCartToFrontend(backendItems) {
        return backendItems.map(item => ({
            id: item.id || Date.now() + Math.random(),
            cartId: item.id,
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
        const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
        return token || '';
    }

    // ===== LOCAL CART OPERATIONS =====
    async addToCart(productCode, color = null, quantity = 1) {
        const group = window.shoeStore?.productGroups[productCode];
        if (!group) {
            this.showToast('Product not found!', 'error');
            return;
        }

        if (color) {
            const variant = group.variants.find(v => v.color === color);
            if (variant && variant.actualStock > 0) {
                await this.addVariantToCart(group, variant, quantity);
            } else {
                this.showToast('Selected variant out of stock!', 'error');
            }
        } else {
            window.shoeStore?.showNewProductModal(group);
        }
    }

    async addVariantToCart(group, variant, quantity = 1, selectedSize = null) {
        if (variant.actualStock < quantity) {
            this.showToast(`Only ${variant.actualStock} boxes available!`, 'error');
            return;
        }

        let size = selectedSize;
        if (!group.baseInfo.isAssorted && !size) {
            const availableSizes = Object.keys(variant.sizes || {}).filter(s => variant.sizes[s] > 0);
            size = availableSizes.length > 0 ? parseInt(availableSizes[0]) : 42;
        } else if (group.baseInfo.isAssorted) {
            size = 42;
        }

        const backendSuccess = await this.addToCartBackend(group.productCode, variant.color, size, quantity);

        if (!backendSuccess) {
            this.addVariantToCartLocal(group, variant, quantity, size);
        }

        window.shoeStore?.closeNewProductModal();
    }

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
        const item = this.cart.find(item => item.id === itemId);
        if (!item) {
            this.showToast('Item not found!', 'error');
            return;
        }

        const backendSuccess = await this.removeFromCartBackend(item.cartId || itemId);

        if (!backendSuccess) {
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

        const backendSuccess = await this.updateCartQuantityBackend(item.cartId || itemId, newQuantity);

        if (!backendSuccess) {
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
            this.cart = [];
            this.saveCartToStorage();
            this.updateCartDisplay();
            this.showToast('Local cart cleared!', 'warning');
        }
    }

    // ===== STORAGE =====
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

    // ===== CART DISPLAY =====
    // CartManager.js'teki updateCartDisplay fonksiyonunu da güncelleyin:
    updateCartDisplay() {
        console.log('Updating cart display with', this.cart.length, 'items'); // Debug için

        this.updateCartSummary();
        this.updateCartBadge();
        this.updateCartPreview();
        this.updateCartSidebar();

        // Global badge güncelleyici varsa çağır
        if (typeof window.updateCartBadgeGlobal === 'function') {
            window.updateCartBadgeGlobal();
        }
    }

    updateCartSummary() {
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
                            <button onclick="window.cartManager.updateCartQuantity(${item.id}, ${item.quantity - 1})" class="qty-btn">-</button>
                            <span class="qty-display">${item.quantity}</span>
                            <button onclick="window.cartManager.updateCartQuantity(${item.id}, ${item.quantity + 1})" class="qty-btn">+</button>
                        </div>
                        <button onclick="window.cartManager.removeFromCart(${item.id})" class="remove-btn">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }

    updateCartBadge() {
        const badge = document.getElementById('cartBadge');
        const totalItems = this.cart.length || 0;

        console.log('Updating cart badge:', totalItems, 'items'); // Debug için

        if (badge) {
            badge.textContent = totalItems;

            if (totalItems > 0) {
                badge.style.display = 'flex';
                badge.classList.remove('empty');
                console.log('Badge shown with', totalItems, 'items');
            } else {
                badge.style.display = 'none';
                badge.classList.add('empty');
                console.log('Badge hidden - cart empty');
            }
        } else {
            console.warn('Cart badge element not found in DOM');

            // Badge yoksa oluşturmaya çalış
            this.createCartBadgeIfMissing();
        }
    }
    // CartManager.js'e yeni bir method ekleyin:
    createCartBadgeIfMissing() {
        // Cart icon'u bul
        const cartIcon = document.querySelector('.cart-icon-btn');
        if (cartIcon && !document.getElementById('cartBadge')) {
            console.log('Creating missing cart badge');

            const badge = document.createElement('span');
            badge.id = 'cartBadge';
            badge.className = 'cart-badge';
            badge.style.cssText = `
            position: absolute;
            top: -5px;
            right: -5px;
            background: #dc3545;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            font-size: 0.75rem;
            display: none;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            border: 2px solid white;
            animation: pulse 2s infinite;
        `;

            cartIcon.appendChild(badge);

            // CSS animation ekle
            if (!document.getElementById('cart-badge-animation')) {
                const style = document.createElement('style');
                style.id = 'cart-badge-animation';
                style.textContent = `
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
            `;
                document.head.appendChild(style);
            }

            return badge;
        }
        return null;
    }
    updateCartPreview() {
        const container = document.getElementById('cartPreviewItems');
        const total = document.getElementById('cartTotalPreview');

        if (!container) return;

        if (this.cart.length === 0) {
            container.innerHTML = '<div class="cart-preview-empty">Your cart is empty</div>';
            if (total) total.textContent = '€0.00';
            return;
        }

        const totalPrice = this.cart.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
        if (total) total.textContent = `€${totalPrice.toFixed(2)}`;

        container.innerHTML = this.cart.slice(0, 4).map(item => `
            <div class="cart-preview-item">
                <div class="cart-preview-item-info">
                    <div class="cart-preview-item-title">${item.productCode} - ${item.color}</div>
                    <div class="cart-preview-item-details">${item.quantity} boxes × €${(item.pricePerBox || 0).toFixed(2)}</div>
                </div>
                <div class="cart-preview-item-price">€${(item.totalPrice || 0).toFixed(2)}</div>
            </div>
        `).join('');

        if (this.cart.length > 4) {
            container.innerHTML += `<div class="cart-preview-more">+${this.cart.length - 4} more items</div>`;
        }
    }

    updateCartSidebar() {
        const emptyState = document.getElementById('cartEmptyState');
        const itemsList = document.getElementById('cartSidebarItems');
        const footer = document.getElementById('cartSidebarFooter');
        const totalItems = document.getElementById('cartTotalItems');
        const totalPieces = document.getElementById('cartTotalPieces');
        const totalAmount = document.getElementById('cartTotalAmount');

        if (this.cart.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            if (itemsList) itemsList.style.display = 'none';
            if (footer) footer.style.display = 'none';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        if (itemsList) itemsList.style.display = 'block';
        if (footer) footer.style.display = 'block';

        const totalBoxes = this.cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const totalPcs = this.cart.reduce((sum, item) => sum + (item.totalPiecesOrdered || 0), 0);
        const totalPrice = this.cart.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

        if (totalItems) totalItems.textContent = `${totalBoxes} boxes`;
        if (totalPieces) totalPieces.textContent = `${totalPcs} pieces`;
        if (totalAmount) totalAmount.textContent = `€${totalPrice.toFixed(2)}`;

        if (itemsList) {
            itemsList.innerHTML = this.cart.map(item => `
                <div class="cart-sidebar-item">
                    <div class="cart-sidebar-item-header">
                        <div>
                            <div class="cart-sidebar-item-title">${item.productCode} - ${item.color}</div>
                            <div class="cart-sidebar-item-details">
                                ${item.outerMaterial || 'N/A'} • ${item.productGroup || 'N/A'} • ${item.gender || 'UNISEX'}
                                ${item.isAssorted ? '<br><strong>Assorted Product</strong>' : ''}
                            </div>
                        </div>
                        <div class="cart-sidebar-item-price">€${(item.totalPrice || 0).toFixed(2)}</div>
                    </div>
                    <div class="cart-sidebar-item-actions">
                        <div class="quantity-controls">
                            <button class="qty-btn" onclick="window.cartManager.updateCartQuantity(${item.id}, ${(item.quantity || 1) - 1})">-</button>
                            <span class="qty-display">${item.quantity || 1}</span>
                            <button class="qty-btn" onclick="window.cartManager.updateCartQuantity(${item.id}, ${(item.quantity || 1) + 1})">+</button>
                        </div>
                        <button class="remove-btn" onclick="window.cartManager.removeFromCart(${item.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }

    // ===== UI INTERACTIONS =====
    toggleCartDetails() {
        const cartDetails = document.getElementById('cartDetails');
        const toggleBtn = document.querySelector('.cart-toggle i');

        if (!cartDetails || !toggleBtn) return;

        if (cartDetails.style.display === 'none' || !cartDetails.style.display) {
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

        this.saveCartToStorage();
        this.showToast('Redirecting to checkout...', 'success');

        setTimeout(() => {
            window.location.href = '/Customer/Checkout';
        }, 500);
    }

    // ===== UTILITY =====
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