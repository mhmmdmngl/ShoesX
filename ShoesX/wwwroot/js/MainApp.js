// ===== MAIN APPLICATION =====
class MainApp {
    constructor() {
        this.productManager = new ProductManager();
        this.cartManager = new CartManager();
        this.modalManager = new ModalManager();
        this.uiManager = new UIManager();
        this.isInitialized = false;
    }

    async init() {
        try {
            console.log('Initializing MainApp...');

            // Initialize managers
            await this.productManager.loadProducts();
            this.uiManager.initializeEventListeners();

            // Load cart from backend first, then fallback to localStorage
            try {
                await this.cartManager.syncCartFromBackend();
            } catch (error) {
                console.warn('Backend cart sync failed, using local cart:', error);
            }

            if (this.cartManager.cart.length === 0) {
                this.cartManager.loadCartFromStorage();
            }

            this.productManager.updateStats();
            this.isInitialized = true;

            console.log('MainApp initialized successfully');
        } catch (error) {
            console.error('Initialization error:', error);
            this.productManager.showError('Failed to initialize application');
        }
    }

    // Global methods for backward compatibility
    addToCart(productCode, color, quantity) {
        return this.cartManager.addToCart(productCode, color, quantity);
    }

    removeFromCart(itemId) {
        return this.cartManager.removeFromCart(itemId);
    }

    updateCartQuantity(itemId, quantity) {
        return this.cartManager.updateCartQuantity(itemId, quantity);
    }

    clearCart() {
        return this.cartManager.clearCart();
    }

    toggleCartDetails() {
        return this.cartManager.toggleCartDetails();
    }

    proceedToCheckout() {
        return this.cartManager.proceedToCheckout();
    }

    showProductModal(group) {
        return this.modalManager.showProductModal(group);
    }

    closeProductModal() {
        return this.modalManager.closeProductModal();
    }

    filterProducts() {
        return this.productManager.filterProducts();
    }

    sortProducts() {
        return this.productManager.sortProducts();
    }

    changePage(page) {
        return this.productManager.changePage(page);
    }

    clearAllFilters() {
        return this.productManager.clearAllFilters();
    }

    loadProducts() {
        return this.productManager.loadProducts();
    }
}

// ===== UI MANAGER =====
class UIManager {
    constructor() {
        this.cartSidebarOpen = false;
        this.cartPreviewOpen = false;
    }

    initializeEventListeners() {
        // View buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                window.mainApp.productManager.currentView = btn.dataset.view;
                window.mainApp.productManager.renderProducts();
            });
        });

        // Sort select
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => window.mainApp.productManager.sortProducts());
        }

        // Escape key handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                window.mainApp.modalManager.closeProductModal();
                this.closeCartSidebar();
                this.closeCartPreview();
            }
        });

        // Cart icon handlers
        this.initializeCartHandlers();
    }

    initializeCartHandlers() {
        // Cart icon click handler
        const cartIcon = document.querySelector('.cart-icon-btn');
        if (cartIcon) {
            cartIcon.addEventListener('click', () => this.toggleCartSidebar());
        }

        // Close cart preview when clicking outside
        document.addEventListener('click', (e) => {
            const cartSection = document.querySelector('.cart-section');
            if (this.cartPreviewOpen && cartSection && !cartSection.contains(e.target)) {
                this.closeCartPreview();
            }
        });
    }

    // Cart UI methods
    toggleCartSidebar() {
        const sidebar = document.getElementById('cartSidebar');
        this.cartSidebarOpen = !this.cartSidebarOpen;

        if (this.cartSidebarOpen) {
            if (sidebar) {
                sidebar.classList.add('show');
                document.body.style.overflow = 'hidden';
            }
            window.mainApp.cartManager.updateCartDisplay();
        } else {
            if (sidebar) {
                sidebar.classList.remove('show');
                document.body.style.overflow = 'auto';
            }
        }
    }

    closeCartSidebar() {
        const sidebar = document.getElementById('cartSidebar');
        this.cartSidebarOpen = false;
        if (sidebar) {
            sidebar.classList.remove('show');
            document.body.style.overflow = 'auto';
        }
    }

    toggleCartPreview() {
        const preview = document.getElementById('cartPreview');
        this.cartPreviewOpen = !this.cartPreviewOpen;

        if (this.cartPreviewOpen) {
            if (preview) preview.classList.add('show');
            window.mainApp.cartManager.updateCartDisplay();
        } else {
            if (preview) preview.classList.remove('show');
        }
    }

    closeCartPreview() {
        const preview = document.getElementById('cartPreview');
        this.cartPreviewOpen = false;
        if (preview) preview.classList.remove('show');
    }

    viewFullCart() {
        this.closeCartPreview();
        this.toggleCartSidebar();
    }
}

// ===== GLOBAL INITIALIZATION =====
const mainApp = new MainApp();

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing MainApp...');
    mainApp.init();
});

// ===== PERIODIC SYNC =====
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
}, 30000); // 30 seconds

// ===== GLOBAL FUNCTIONS FOR BACKWARD COMPATIBILITY =====
window.mainApp = mainApp;
window.productManager = mainApp.productManager;
window.cartManager = mainApp.cartManager;
window.modalManager = mainApp.modalManager;
window.uiManager = mainApp.uiManager;

// Backward compatibility functions
window.filterProducts = () => mainApp.filterProducts();
window.sortProducts = () => mainApp.sortProducts();
window.changePage = (page) => mainApp.changePage(page);
window.clearAllFilters = () => mainApp.clearAllFilters();
window.addToCart = (productCode, color, quantity) => mainApp.addToCart(productCode, color, quantity);
window.removeFromCart = (itemId) => mainApp.removeFromCart(itemId);
window.updateCartQuantity = (itemId, quantity) => mainApp.updateCartQuantity(itemId, quantity);
window.clearCart = () => mainApp.clearCart();
window.toggleCartDetails = () => mainApp.toggleCartDetails();
window.proceedToCheckout = () => mainApp.proceedToCheckout();
window.showProductModal = (group) => mainApp.showProductModal(group);
window.closeProductModal = () => mainApp.closeProductModal();
window.loadProducts = () => mainApp.loadProducts();

// Cart UI functions
window.toggleCartSidebar = () => mainApp.uiManager.toggleCartSidebar();
window.toggleCartPreview = () => mainApp.uiManager.toggleCartPreview();
window.viewFullCart = () => mainApp.uiManager.viewFullCart();

// Safe cart display functions that don't throw errors
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

// Legacy shoeStore object for compatibility
window.shoeStore = {
    get cart() { return mainApp.cartManager ? mainApp.cartManager.cart : []; },
    get productGroups() { return mainApp.productManager ? mainApp.productManager.productGroups : {}; },
    updateCartDisplay: () => window.updateCartDisplay(),
    addToCart: (productCode, color, quantity) => mainApp.addToCart(productCode, color, quantity),
    removeFromCart: (itemId) => mainApp.removeFromCart(itemId),
    updateCartQuantity: (itemId, quantity) => mainApp.updateCartQuantity(itemId, quantity),
    clearCart: () => mainApp.clearCart(),
    showNewProductModal: (group) => mainApp.showProductModal(group),
    closeNewProductModal: () => mainApp.closeProductModal(),
    showProductModal: (group) => mainApp.showProductModal(group),
    closeProductModal: () => mainApp.closeProductModal(),
    syncCartFromBackend: () => mainApp.cartManager ? mainApp.cartManager.syncCartFromBackend() : Promise.resolve()
};

console.log('MainApp and global functions initialized');