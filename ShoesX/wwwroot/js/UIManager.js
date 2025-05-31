// ===== UI MANAGER BASE CLASS =====
class UIManager {
    constructor() {
        this.isInitialized = false;
        this.cartSidebarOpen = false;
    }

    initializeEventListeners() {
        console.log('Base UIManager - initializing event listeners');

        // View controls
        this.initializeViewControls();

        // Cart sidebar controls
        this.initializeCartSidebar();

        // Search functionality
        this.initializeSearch();

        // Keyboard shortcuts
        this.initializeKeyboardShortcuts();

        this.isInitialized = true;
        console.log('Base UIManager initialized successfully');
    }

    initializeViewControls() {
        // View mode buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const view = btn.dataset.view || 'grid';

                // Update product manager view if available
                if (window.mainApp && window.mainApp.productManager) {
                    window.mainApp.productManager.currentView = view;
                    window.mainApp.productManager.renderProducts();
                } else if (window.shoeStore && window.shoeStore.renderProducts) {
                    window.shoeStore.currentView = view;
                    window.shoeStore.renderProducts();
                }

                // Save preference
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
    }

    initializeCartSidebar() {
        // Cart icon click handler
        const cartButtons = document.querySelectorAll('.cart-icon-btn');
        cartButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleCartSidebar();
            });
        });

        // Close cart sidebar when clicking overlay
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('cart-sidebar-overlay')) {
                this.closeCartSidebar();
            }
        });

        // Close button
        const closeButtons = document.querySelectorAll('.cart-close-btn');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeCartSidebar();
            });
        });
    }

    initializeSearch() {
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            // Enter key search
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const searchTerm = e.target.value.trim();
                    this.performSearch(searchTerm);
                }
            });

            // Real-time search with debounce
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    const searchTerm = e.target.value.trim();
                    if (searchTerm.length > 2 || searchTerm.length === 0) {
                        this.performSearch(searchTerm);
                    }
                }, 500);
            });
        }
    }

    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Escape key - close modals and sidebars
            if (e.key === 'Escape') {
                this.closeCartSidebar();
                if (window.closeProductModal) {
                    window.closeProductModal();
                }
            }

            // Ctrl+K for search focus
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.getElementById('globalSearch');
                if (searchInput) {
                    searchInput.focus();
                }
            }

            // Ctrl+Shift+C for clear filters
            if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                if (window.clearAllFilters) {
                    window.clearAllFilters();
                }
            }
        });
    }

    performSearch(searchTerm) {
        console.log('Performing search for:', searchTerm);

        if (window.mainApp && window.mainApp.productManager) {
            window.mainApp.productManager.searchProducts(searchTerm);
        } else if (window.shoeStore && window.shoeStore.searchProducts) {
            window.shoeStore.searchProducts(searchTerm);
        } else {
            console.warn('No search method available');
        }
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

            // Update cart display when opening
            this.updateCartSidebarContent();
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
        // Update cart sidebar content
        if (window.mainApp && window.mainApp.cartManager) {
            window.mainApp.cartManager.updateCartSidebar();
        } else if (window.shoeStore && window.shoeStore.updateCartDisplay) {
            window.shoeStore.updateCartDisplay();
        }
    }

    // Responsive handling
    handleResponsive() {
        const isMobile = window.innerWidth < 768;

        // Handle mobile-specific UI changes
        if (isMobile) {
            this.optimizeForMobile();
        } else {
            this.optimizeForDesktop();
        }
    }

    optimizeForMobile() {
        // Mobile optimizations
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.add('mobile-mode');
        }
    }

    optimizeForDesktop() {
        // Desktop optimizations
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('mobile-mode');
        }
    }

    // Utility methods
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

// Export UIManager globally
window.UIManager = UIManager;

console.log('UIManager base class loaded');