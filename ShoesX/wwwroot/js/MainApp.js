// ===== SIMPLE MAIN APPLICATION =====
console.log('Loading MainApp module...');

// Create UIManager if it doesn't exist
if (typeof UIManager === 'undefined') {
    console.log('UIManager not found, creating basic version');

    class UIManager {
        constructor() {
            this.isInitialized = false;
            this.cartSidebarOpen = false;
        }

        initializeEventListeners() {
            console.log('Basic UIManager initialized');
            this.isInitialized = true;

            // Basic view controls
            document.querySelectorAll('.view-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');

                    const view = btn.dataset.view || 'grid';

                    if (window.mainApp && window.mainApp.productManager) {
                        window.mainApp.productManager.currentView = view;
                        window.mainApp.productManager.renderProducts();
                    }

                    localStorage.setItem('preferredView', view);
                });
            });

            // Load saved view preference
            const savedView = localStorage.getItem('preferredView');
            if (savedView) {
                const viewBtn = document.querySelector(`[data-view="${savedView}"]`);
                if (viewBtn) {
                    viewBtn.click();
                }
            }

            // Basic keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeCartSidebar();
                    if (window.closeProductModal) {
                        window.closeProductModal();
                    }
                }
            });
        }

        toggleCartSidebar() {
            if (this.cartSidebarOpen) {
                this.closeCartSidebar();
            } else {
                this.openCartSidebar();
            }
        }

        openCartSidebar() {
            const sidebar = document.getElementById('cartSidebar');
            if (sidebar) {
                sidebar.classList.add('show');
                document.body.style.overflow = 'hidden';
                this.cartSidebarOpen = true;
            }
        }

        closeCartSidebar() {
            const sidebar = document.getElementById('cartSidebar');
            if (sidebar) {
                sidebar.classList.remove('show');
                document.body.style.overflow = 'auto';
                this.cartSidebarOpen = false;
            }
        }

        updateCartSidebarContent() {
            // Basic implementation
        }

        handleResponsive() {
            // Basic implementation
        }

        showToast(message, type = 'success') {
            if (typeof window.showToast === 'function') {
                window.showToast(message, type);
            } else {
                console.log(`${type.toUpperCase()}: ${message}`);
            }
        }

        updateCartBadge() {
            if (typeof window.updateCartBadgeGlobal === 'function') {
                window.updateCartBadgeGlobal();
            }
        }
    }

    window.UIManager = UIManager;
    console.log('Basic UIManager created and exported');
}

// ===== MAIN APPLICATION CLASS =====
class MainApp {
    constructor() {
        console.log('MainApp constructor called');
        this.productManager = null;
        this.cartManager = null;
        this.modalManager = null;
        this.filterManager = null;
        this.uiManager = null;
        this.isInitialized = false;
        this.initPromise = null;
    }

    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._doInit();
        return this.initPromise;
    }

    async _doInit() {
        try {
            console.log('Initializing MainApp...');

            // Wait for dependencies
            await this.waitForDependencies();

            // Create managers
            this.productManager = new ProductManager();
            this.cartManager = new CartManager();
            this.modalManager = new ModalManager();
            this.filterManager = new FilterManager();
            this.uiManager = new UIManager();

            console.log('Managers created successfully');

            // Initialize product manager
            await this.productManager.loadProducts();

            // Initialize filter manager
            this.filterManager.init(this.productManager.productGroups);

            // Initialize UI manager
            this.uiManager.initializeEventListeners();

            // Load cart
            try {
                await this.cartManager.syncCartFromBackend();
            } catch (error) {
                console.warn('Backend cart sync failed:', error);
            }

            if (this.cartManager.cart.length === 0) {
                this.cartManager.loadCartFromStorage();
            }

            this.productManager.updateStats();
            this.isInitialized = true;

            console.log('MainApp initialized successfully');

            // Dispatch ready event
            window.dispatchEvent(new CustomEvent('mainAppReady', {
                detail: { mainApp: this }
            }));

            return this;
        } catch (error) {
            console.error('MainApp initialization error:', error);
            this.showError('Failed to initialize application: ' + error.message);
            throw error;
        }
    }

    waitForDependencies() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50;

            const checkDependencies = () => {
                attempts++;

                const deps = {
                    CartManager: typeof CartManager !== 'undefined',
                    ProductManager: typeof ProductManager !== 'undefined',
                    ModalManager: typeof ModalManager !== 'undefined',
                    FilterManager: typeof FilterManager !== 'undefined',
                    UIManager: typeof UIManager !== 'undefined'
                };

                const allReady = Object.values(deps).every(ready => ready);

                if (allReady) {
                    console.log('All dependencies ready for MainApp');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.error('Dependencies timeout after', attempts, 'attempts:', deps);
                    reject(new Error('Required dependencies not loaded'));
                } else {
                    if (attempts % 10 === 0) {
                        console.log(`Waiting for dependencies... ${attempts}/${maxAttempts}`, deps);
                    }
                    setTimeout(checkDependencies, 100);
                }
            };

            checkDependencies();
        });
    }

    showError(message) {
        console.error(message);
        if (typeof window.showToast === 'function') {
            window.showToast(message, 'error');
        }
    }

    // API Methods
    addToCart(productCode, color, quantity) {
        if (!this.cartManager) {
            console.warn('CartManager not initialized');
            return;
        }
        return this.cartManager.addToCart(productCode, color, quantity);
    }

    removeFromCart(itemId) {
        if (!this.cartManager) {
            console.warn('CartManager not initialized');
            return;
        }
        return this.cartManager.removeFromCart(itemId);
    }

    updateCartQuantity(itemId, quantity) {
        if (!this.cartManager) {
            console.warn('CartManager not initialized');
            return;
        }
        return this.cartManager.updateCartQuantity(itemId, quantity);
    }

    clearCart() {
        if (!this.cartManager) {
            console.warn('CartManager not initialized');
            return;
        }
        return this.cartManager.clearCart();
    }

    toggleCartDetails() {
        if (!this.cartManager) {
            console.warn('CartManager not initialized');
            return;
        }
        return this.cartManager.toggleCartDetails();
    }

    proceedToCheckout() {
        if (!this.cartManager) {
            console.warn('CartManager not initialized');
            return;
        }
        return this.cartManager.proceedToCheckout();
    }

    showProductModal(group) {
        if (!this.modalManager) {
            console.warn('ModalManager not initialized');
            return;
        }
        return this.modalManager.showProductModal(group);
    }

    closeProductModal() {
        if (!this.modalManager) {
            console.warn('ModalManager not initialized');
            return;
        }
        return this.modalManager.closeProductModal();
    }

    applyFilters(filters) {
        if (!this.productManager) {
            console.warn('ProductManager not initialized');
            return;
        }
        return this.productManager.applyEnhancedFilters(filters);
    }

    clearAllFilters() {
        if (this.filterManager) {
            this.filterManager.clearAllFilters();
        }
        if (this.productManager) {
            return this.productManager.clearAllFilters();
        }
    }

    filterProducts() {
        if (!this.filterManager || !this.productManager) {
            console.warn('Managers not initialized for filterProducts');
            return;
        }
        const filters = this.filterManager.getCurrentFilters();
        return this.productManager.applyEnhancedFilters(filters);
    }

    sortProducts() {
        if (!this.productManager) {
            console.warn('ProductManager not initialized');
            return;
        }
        return this.productManager.sortProducts();
    }

    changePage(page) {
        if (!this.productManager) {
            console.warn('ProductManager not initialized');
            return;
        }
        return this.productManager.changePage(page);
    }

    loadProducts() {
        if (!this.productManager) {
            console.warn('ProductManager not initialized');
            return;
        }
        return this.productManager.loadProducts();
    }
}

// Extend ProductManager with enhanced filtering
if (typeof ProductManager !== 'undefined') {
    const OriginalProductManager = ProductManager;

    // Store original prototype methods
    const originalMethods = {
        updateStats: OriginalProductManager.prototype.updateStats,
        clearAllFilters: OriginalProductManager.prototype.clearAllFilters,
        searchProducts: OriginalProductManager.prototype.searchProducts
    };

    // Add enhanced methods to ProductManager prototype
    OriginalProductManager.prototype.applyEnhancedFilters = function (filters) {
        this.activeFilters = filters || {};
        this.filteredGroups = {};

        console.log('Applying enhanced filters:', filters);

        Object.values(this.productGroups).forEach(group => {
            if (this.groupMatchesFilters(group, filters)) {
                this.filteredGroups[group.productCode] = group;
            }
        });

        this.currentPage = 1;
        this.renderProducts();
        this.updateStats();

        console.log(`Filtered ${Object.keys(this.filteredGroups).length} products from ${Object.keys(this.productGroups).length} total`);
    };

    OriginalProductManager.prototype.groupMatchesFilters = function (group, filters) {
        if (!filters) return true;

        // Product code search
        if (filters.productCode && filters.productCode.trim()) {
            const searchTerm = filters.productCode.toLowerCase();
            const searchableText = [
                group.productCode,
                group.baseInfo.outerMaterial,
                group.baseInfo.innerMaterial,
                group.baseInfo.sole,
                group.baseInfo.productGroup,
                group.baseInfo.gender,
                ...group.availableColors
            ].join(' ').toLowerCase();

            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }

        // Color filter
        if (filters.colors && filters.colors.length > 0) {
            const hasMatchingColor = filters.colors.some(color =>
                group.availableColors.includes(color)
            );
            if (!hasMatchingColor) return false;
        }

        // Outer material filter
        if (filters.outerMaterials && filters.outerMaterials.length > 0) {
            if (!filters.outerMaterials.includes(group.baseInfo.outerMaterial)) {
                return false;
            }
        }

        // Product group filter
        if (filters.productGroups && filters.productGroups.length > 0) {
            if (!filters.productGroups.includes(group.baseInfo.productGroup)) {
                return false;
            }
        }

        // Gender filter
        if (filters.genders && filters.genders.length > 0) {
            if (!filters.genders.includes(group.baseInfo.gender)) {
                return false;
            }
        }

        // Size filter
        if (filters.sizes && filters.sizes.length > 0) {
            const hasMatchingSize = filters.sizes.some(size =>
                group.availableSizes.includes(size)
            );
            if (!hasMatchingSize) return false;
        }

        // Price filter
        if (filters.minPrice !== null || filters.maxPrice !== null) {
            const minPrice = filters.minPrice || 0;
            const maxPrice = filters.maxPrice || Infinity;

            if (group.priceRange.min > maxPrice || group.priceRange.max < minPrice) {
                return false;
            }
        }

        // Stock filter
        if (filters.inStock) {
            if (group.totalStock <= 0) return false;
        }

        // Assorted filter
        if (filters.isAssorted) {
            if (!group.baseInfo.isAssorted) return false;
        }

        // On sale filter
        if (filters.onSale) {
            if (!group.hasDiscount) return false;
        }

        return true;
    };

    // Enhanced updateStats
    OriginalProductManager.prototype.updateStats = function () {
        const countElement = document.querySelector('.product-count');
        if (countElement) {
            const totalProducts = Object.keys(this.productGroups).length;
            const filteredProducts = Object.keys(this.filteredGroups).length;
            const totalVariants = Object.values(this.filteredGroups).reduce((sum, group) => sum + group.variants.length, 0);

            if (this.activeFilters && Object.keys(this.activeFilters).length > 0 && filteredProducts < totalProducts) {
                countElement.innerHTML = `
                    <div class="stats-with-filters">
                        <div class="main-stats">
                            Showing ${filteredProducts} of ${totalProducts} Products (${totalVariants} Variants)
                        </div>
                        <div class="filter-summary">
                            ${this.getFilterSummaryText()}
                        </div>
                    </div>
                `;
            } else {
                countElement.textContent = `${filteredProducts} Products (${totalVariants} Variants)`;
            }
        }
    };

    OriginalProductManager.prototype.getFilterSummaryText = function () {
        if (window.filterManager) {
            const summary = window.filterManager.getFilterSummary();
            if (summary.length > 0) {
                return `Filters: ${summary.join(' • ')}`;
            }
        }
        return '';
    };

    // Enhanced clearAllFilters
    OriginalProductManager.prototype.clearAllFilters = function () {
        this.activeFilters = {};
        this.filteredGroups = { ...this.productGroups };
        this.currentPage = 1;
        this.renderProducts();
        this.updateStats();
    };

    // Enhanced searchProducts
    OriginalProductManager.prototype.searchProducts = function (searchTerm) {
        if (window.filterManager) {
            const currentFilters = window.filterManager.getCurrentFilters();
            currentFilters.productCode = searchTerm;
            window.filterManager.setFilters(currentFilters);
            this.applyEnhancedFilters(currentFilters);
        } else {
            // Call original method if filterManager not available
            if (originalMethods.searchProducts) {
                originalMethods.searchProducts.call(this, searchTerm);
            }
        }
    };

    // Add alias for backward compatibility
    OriginalProductManager.prototype.applyFilters = function (filters) {
        return this.applyEnhancedFilters(filters);
    };
}

// Create and export MainApp instance
window.MainApp = MainApp;
const mainApp = new MainApp();
window.mainApp = mainApp;

// Safe global functions
function createSafeFunction(name, method) {
    return function (...args) {
        if (mainApp.isInitialized && method) {
            return method.apply(mainApp, args);
        } else {
            console.warn(`${name} called but MainApp not ready`);
            return null;
        }
    };
}

// Export global functions
window.filterProducts = createSafeFunction('filterProducts', mainApp.filterProducts);
window.sortProducts = createSafeFunction('sortProducts', mainApp.sortProducts);
window.changePage = createSafeFunction('changePage', mainApp.changePage);
window.clearAllFilters = createSafeFunction('clearAllFilters', mainApp.clearAllFilters);
window.addToCart = createSafeFunction('addToCart', mainApp.addToCart);
window.removeFromCart = createSafeFunction('removeFromCart', mainApp.removeFromCart);
window.updateCartQuantity = createSafeFunction('updateCartQuantity', mainApp.updateCartQuantity);
window.clearCart = createSafeFunction('clearCart', mainApp.clearCart);
window.toggleCartDetails = createSafeFunction('toggleCartDetails', mainApp.toggleCartDetails);
window.proceedToCheckout = createSafeFunction('proceedToCheckout', mainApp.proceedToCheckout);
window.showProductModal = createSafeFunction('showProductModal', mainApp.showProductModal);
window.closeProductModal = createSafeFunction('closeProductModal', mainApp.closeProductModal);
window.loadProducts = createSafeFunction('loadProducts', mainApp.loadProducts);
window.applyFilters = createSafeFunction('applyFilters', mainApp.applyFilters);
window.getFilterSummary = () => mainApp.filterManager ? mainApp.filterManager.getFilterSummary() : [];

// Cart display functions
window.updateCartDisplay = () => {
    if (mainApp.isInitialized && mainApp.cartManager) {
        mainApp.cartManager.updateCartDisplay();
    }
};

window.updateCartBadge = () => {
    if (mainApp.isInitialized && mainApp.cartManager) {
        mainApp.cartManager.updateCartBadge();
    }
};

// Legacy shoeStore compatibility
window.shoeStore = {
    get cart() { return mainApp.cartManager ? mainApp.cartManager.cart : []; },
    get productGroups() { return mainApp.productManager ? mainApp.productManager.productGroups : {}; },
    updateCartDisplay: () => window.updateCartDisplay(),
    addToCart: (productCode, color, quantity) => window.addToCart(productCode, color, quantity),
    removeFromCart: (itemId) => window.removeFromCart(itemId),
    updateCartQuantity: (itemId, quantity) => window.updateCartQuantity(itemId, quantity),
    clearCart: () => window.clearCart(),
    showNewProductModal: (group) => window.showProductModal(group),
    closeNewProductModal: () => window.closeProductModal(),
    showProductModal: (group) => window.showProductModal(group),
    closeProductModal: () => window.closeProductModal(),
    syncCartFromBackend: () => mainApp.cartManager ? mainApp.cartManager.syncCartFromBackend() : Promise.resolve(),
    applyFilters: (filters) => window.applyFilters(filters),
    filterProducts: () => window.filterProducts(),
    clearAllFilters: () => window.clearAllFilters()
};

// Setup global references after initialization
function setupGlobalReferences() {
    window.productManager = mainApp.productManager;
    window.cartManager = mainApp.cartManager;
    window.modalManager = mainApp.modalManager;
    window.filterManager = mainApp.filterManager;
    window.uiManager = mainApp.uiManager;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing MainApp...');

    mainApp.init().then(() => {
        console.log('MainApp fully initialized');
        setupGlobalReferences();

        // Periodic cart sync
        setInterval(() => {
            if (mainApp.isInitialized && mainApp.cartManager) {
                try {
                    mainApp.cartManager.syncCartFromBackend().catch(error => {
                        console.warn('Periodic cart sync failed:', error);
                    });
                } catch (error) {
                    console.warn('Periodic cart sync failed:', error);
                }
            }
        }, 30000);

    }).catch((error) => {
        console.error('Failed to initialize MainApp:', error);
    });
});

console.log('MainApp module loaded successfully');