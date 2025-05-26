// ===== MODAL MANAGER =====
class ModalManager {
    constructor() {
        this.currentModal = null;
    }

    // ===== PRODUCT MODAL =====
    showProductModal(group) {
        console.log('Opening product modal for:', group.productCode);
        this.closeProductModal();

        const modalBackdrop = document.createElement('div');
        modalBackdrop.className = 'productModalBackdrop';
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
        modalContainer.className = 'productModalContainer';
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
            <div class="modalHeader" style="
                padding: 2rem 2rem 1rem 2rem;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: #f8fafc;
            ">
                <div>
                    <h2 style="margin: 0 0 0.5rem 0; font-size: 1.5rem; font-weight: 700; color: #1f2937;">
                        ${group.baseInfo.outerMaterial} ${group.baseInfo.productGroup}
                    </h2>
                    <p style="margin: 0; color: #6b7280; font-size: 1rem;">
                        Product Code: <strong>${group.productCode}</strong> • 
                        ${availableVariants.length} variant${availableVariants.length !== 1 ? 's' : ''} available
                    </p>
                </div>
                <button class="modalCloseBtn" style="
                    background: #f3f4f6;
                    border: none;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.25rem;
                    color: #6b7280;
                    transition: all 0.2s;
                " onmouseover="this.style.backgroundColor='#e5e7eb'; this.style.color='#374151';" 
                   onmouseout="this.style.backgroundColor='#f3f4f6'; this.style.color='#6b7280';">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="modalBody" style="
                padding: 2rem;
                overflow-y: auto;
                flex: 1;
            ">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: start;">
                    
                    <div class="modalInfoSection">
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

                    <div class="modalVariantsSection">
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

            const inputId = `modalQty_${group.productCode}_${index}`;
            const sizeSelectId = `modalSize_${group.productCode}_${index}`;

            // Size options for non-assorted products
            const availableSizes = variant.sizes && typeof variant.sizes === 'object' ?
                Object.keys(variant.sizes).filter(s => variant.sizes[s] > 0) : [];

            return `
                                    <div class="variantCard" style="
                                        border: 2px solid #e5e7eb;
                                        border-radius: 12px;
                                        padding: 1.5rem;
                                        background: #ffffff;
                                        transition: all 0.2s;
                                        position: relative;
                                    " onmouseover="this.style.borderColor='#3b82f6'; this.style.boxShadow='0 4px 6px rgba(59, 130, 246, 0.1)';" 
                                       onmouseout="this.style.borderColor='#e5e7eb'; this.style.boxShadow='none';">
                                        
                                        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                                            <div class="color-${colorClass}" style="
                                                width: 32px;
                                                height: 32px;
                                                border-radius: 50%;
                                                border: 3px solid #e5e7eb;
                                                flex-shrink: 0;
                                                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                                            "></div>
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
                                                       id="${inputId}" style="
                                                    width: 100%;
                                                    padding: 0.75rem;
                                                    border: 2px solid #d1d5db;
                                                    border-radius: 8px;
                                                    font-size: 1rem;
                                                    text-align: center;
                                                    transition: border-color 0.2s;
                                                " onfocus="this.style.borderColor='#3b82f6';" 
                                                   onblur="this.style.borderColor='#d1d5db';">
                                            </div>
                                            <div style="flex: 1;">
                                                <button class="addToCartBtn" 
                                                        data-product="${group.productCode}" 
                                                        data-color="${variant.color}"
                                                        data-qty-input="${inputId}"
                                                        data-size-input="${sizeSelectId}"
                                                        data-is-assorted="${group.baseInfo.isAssorted}"
                                                        style="
                                                    width: 100%;
                                                    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                                                    color: white;
                                                    border: none;
                                                    padding: 0.875rem 1.5rem;
                                                    border-radius: 8px;
                                                    cursor: pointer;
                                                    font-weight: 600;
                                                    font-size: 1rem;
                                                    transition: all 0.2s;
                                                    display: flex;
                                                    align-items: center;
                                                    justify-content: center;
                                                    gap: 0.5rem;
                                                    margin-top: 1.5rem;
                                                " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(59, 130, 246, 0.3)';" 
                                                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
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

            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @media (max-width: 768px) {
                    .modalBody > div {
                        grid-template-columns: 1fr !important;
                        gap: 2rem !important;
                    }
                }
            </style>
        `;

        modalBackdrop.appendChild(modalContainer);
        document.body.appendChild(modalBackdrop);

        this.attachModalEventListeners(modalBackdrop, group);
        document.body.style.overflow = 'hidden';
        this.currentModal = modalBackdrop;

        console.log('Product modal opened successfully');
    }

    closeProductModal() {
        const existingModal = document.querySelector('.productModalBackdrop');
        if (existingModal) {
            existingModal.style.animation = 'fadeOut 0.2s ease';
            setTimeout(() => {
                existingModal.remove();
                document.body.style.overflow = 'auto';
            }, 200);
        }

        this.currentModal = null;

        // Add fadeOut animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        setTimeout(() => style.remove(), 300);
    }

    attachModalEventListeners(modalBackdrop, group) {
        // Close button
        const closeBtn = modalBackdrop.querySelector('.modalCloseBtn');
        if (closeBtn) {
            closeBtn.onclick = () => this.closeProductModal();
        }

        // Backdrop click
        modalBackdrop.onclick = (e) => {
            if (e.target === modalBackdrop) {
                this.closeProductModal();
            }
        };

        // Escape key
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                this.closeProductModal();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);

        // Add to cart buttons
        const addButtons = modalBackdrop.querySelectorAll('.addToCartBtn');
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

                // Find group and variant
                const variant = group?.variants.find(v => v.color === color);

                if (group && variant && window.mainApp && window.mainApp.cartManager) {
                    window.mainApp.cartManager.addVariantToCart(group, variant, quantity, selectedSize);
                }
            };
        });
    }
}

// ===== CART DISPLAY COMPONENTS =====
class CartDisplayManager {
    constructor() {
        this.isInitialized = false;
    }

    init() {
        this.createCartHTML();
        this.attachEventListeners();
        this.isInitialized = true;
    }

    createCartHTML() {
        // Create cart icon if it doesn't exist
        if (!document.getElementById('cartBadge')) {
            this.createCartIcon();
        }

        // Create cart sidebar if it doesn't exist
        if (!document.getElementById('cartSidebar')) {
            this.createCartSidebar();
        }

        // Create cart summary if it doesn't exist
        if (!document.getElementById('cartSummary')) {
            this.createCartSummary();
        }
    }

    createCartIcon() {
        const headerRight = document.querySelector('.header-right') || document.querySelector('.navbar-nav') || document.querySelector('header');
        if (!headerRight) return;

        const cartSection = document.createElement('div');
        cartSection.className = 'cart-section';
        cartSection.innerHTML = `
            <div class="cart-icon-container">
                <button type="button" class="cart-icon-btn">
                    <i class="fas fa-shopping-cart"></i>
                    <span class="cart-badge" id="cartBadge">0</span>
                </button>
            </div>
        `;

        headerRight.appendChild(cartSection);
    }

    createCartSidebar() {
        const cartSidebar = document.createElement('div');
        cartSidebar.className = 'cart-sidebar';
        cartSidebar.id = 'cartSidebar';
        cartSidebar.innerHTML = `
            <div class="cart-sidebar-overlay"></div>
            <div class="cart-sidebar-content">
                <div class="cart-sidebar-header">
                    <h3>
                        <i class="fas fa-shopping-cart"></i>
                        Shopping Cart
                    </h3>
                    <button class="cart-close-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="cart-sidebar-body" id="cartSidebarBody">
                    <div class="cart-empty-state" id="cartEmptyState">
                        <div class="empty-cart-icon">
                            <i class="fas fa-shopping-cart"></i>
                        </div>
                        <h4>Your cart is empty</h4>
                        <p>Add some products to get started!</p>
                    </div>
                    
                    <div class="cart-items-list" id="cartSidebarItems">
                        <!-- Cart items will be populated here -->
                    </div>
                </div>
                
                <div class="cart-sidebar-footer" id="cartSidebarFooter">
                    <div class="cart-summary">
                        <div class="cart-summary-row">
                            <span>Total Items:</span>
                            <span id="cartTotalItems">0</span>
                        </div>
                        <div class="cart-summary-row">
                            <span>Total Pieces:</span>
                            <span id="cartTotalPieces">0</span>
                        </div>
                        <div class="cart-summary-row total">
                            <span>Total Amount:</span>
                            <span id="cartTotalAmount">€0.00</span>
                        </div>
                    </div>
                    
                    <div class="cart-actions">
                        <button class="btn btn-outline-danger btn-sm" onclick="window.clearCart()">
                            <i class="fas fa-trash"></i>
                            Clear Cart
                        </button>
                        <button class="btn btn-primary" onclick="window.proceedToCheckout()">
                            <i class="fas fa-credit-card"></i>
                            Checkout
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(cartSidebar);
        this.addCartStyles();
    }

    createCartSummary() {
        // Check if there's a place to put cart summary
        const mainContent = document.querySelector('.main-content') || document.querySelector('main') || document.body;

        const cartSummary = document.createElement('div');
        cartSummary.id = 'cartSummary';
        cartSummary.className = 'cart-summary-widget';
        cartSummary.style.display = 'none';
        cartSummary.innerHTML = `
            <div class="cart-summary-header">
                <h4>Shopping Cart</h4>
                <button class="cart-toggle" onclick="window.toggleCartDetails()">
                    <i class="fas fa-chevron-up"></i>
                </button>
            </div>
            <div class="cart-summary-info">
                <div class="cart-count">0 boxes</div>
                <div class="cart-pieces-count">0 pieces</div>
                <div class="cart-total">€0.00</div>
            </div>
            <div class="cart-details" id="cartDetails" style="display: none;">
                <div class="cart-items-list" id="cartItemsList">
                    <!-- Cart items will be populated here -->
                </div>
                <div class="cart-actions">
                    <button class="btn btn-secondary btn-sm" onclick="window.clearCart()">
                        Clear Cart
                    </button>
                    <button class="btn btn-primary" onclick="window.proceedToCheckout()">
                        Checkout
                    </button>
                </div>
            </div>
        `;

        // Try to find the best place to insert cart summary
        const sidebar = document.querySelector('.sidebar') || document.querySelector('.filters-section');
        if (sidebar) {
            sidebar.appendChild(cartSummary);
        } else {
            mainContent.appendChild(cartSummary);
        }
    }

    addCartStyles() {
        if (document.getElementById('cart-display-styles')) return;

        const style = document.createElement('style');
        style.id = 'cart-display-styles';
        style.textContent = `
            /* Cart Icon Styles */
            .cart-section {
                position: relative;
                display: inline-block;
                margin-left: 1rem;
            }

            .cart-icon-btn {
                position: relative;
                background: none;
                border: none;
                font-size: 1.5rem;
                color: #333;
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 50%;
                transition: all 0.2s ease;
            }

            .cart-icon-btn:hover {
                background-color: #f8f9fa;
                color: #007bff;
            }

            .cart-badge {
                position: absolute;
                top: -5px;
                right: -5px;
                background: #dc3545;
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                font-size: 0.75rem;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                border: 2px solid white;
            }

            .cart-badge.empty {
                display: none !important;
            }

            /* Cart Sidebar */
            .cart-sidebar {
                position: fixed;
                top: 0;
                right: 0;
                width: 100%;
                height: 100%;
                z-index: 9999;
                display: none;
            }

            .cart-sidebar.show {
                display: block;
                animation: slideIn 0.3s ease;
            }

            .cart-sidebar-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
            }

            .cart-sidebar-content {
                position: absolute;
                top: 0;
                right: 0;
                width: 400px;
                max-width: 90vw;
                height: 100%;
                background: white;
                display: flex;
                flex-direction: column;
                transform: translateX(100%);
                transition: transform 0.3s ease;
            }

            .cart-sidebar.show .cart-sidebar-content {
                transform: translateX(0);
            }

            .cart-sidebar-header {
                padding: 1.5rem;
                border-bottom: 1px solid #dee2e6;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: #f8f9fa;
            }

            .cart-sidebar-header h3 {
                margin: 0;
                font-size: 1.25rem;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .cart-close-btn {
                background: none;
                border: none;
                font-size: 1.5rem;
                color: #6c757d;
                cursor: pointer;
                padding: 0.25rem;
            }

            .cart-close-btn:hover {
                color: #333;
            }

            .cart-sidebar-body {
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
            }

            .cart-empty-state {
                text-align: center;
                padding: 3rem 1rem;
                color: #6c757d;
            }

            .empty-cart-icon i {
                font-size: 4rem;
                color: #dee2e6;
                margin-bottom: 1rem;
            }

            .cart-empty-state h4 {
                margin-bottom: 0.5rem;
                color: #495057;
            }

            .cart-items-list {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            .cart-sidebar-item {
                border: 1px solid #e9ecef;
                border-radius: 8px;
                padding: 1rem;
                background: #f8f9fa;
            }

            .cart-sidebar-item-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 0.75rem;
            }

            .cart-sidebar-item-title {
                font-weight: 600;
                font-size: 1rem;
                margin-bottom: 0.25rem;
            }

            .cart-sidebar-item-details {
                font-size: 0.875rem;
                color: #6c757d;
            }

            .cart-sidebar-item-price {
                font-weight: 600;
                color: #007bff;
                font-size: 1.1rem;
            }

            .cart-sidebar-item-actions {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .quantity-controls {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .qty-btn {
                background: #007bff;
                color: white;
                border: none;
                width: 30px;
                height: 30px;
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .qty-btn:hover {
                background: #0056b3;
            }

            .qty-display {
                min-width: 40px;
                text-align: center;
                font-weight: 600;
            }

            .remove-btn {
                background: #dc3545;
                color: white;
                border: none;
                padding: 0.5rem;
                border-radius: 4px;
                cursor: pointer;
            }

            .remove-btn:hover {
                background: #c82333;
            }

            .cart-sidebar-footer {
                border-top: 1px solid #dee2e6;
                padding: 1.5rem;
                background: #f8f9fa;
            }

            .cart-summary {
                margin-bottom: 1.5rem;
            }

            .cart-summary-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 0.5rem;
                font-size: 0.9rem;
            }

            .cart-summary-row.total {
                font-weight: 600;
                font-size: 1.1rem;
                padding-top: 0.5rem;
                border-top: 1px solid #dee2e6;
                color: #007bff;
            }

            .cart-actions {
                display: flex;
                gap: 0.75rem;
            }

            .cart-actions .btn {
                flex: 1;
            }

            /* Cart Summary Widget */
            .cart-summary-widget {
                background: white;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                padding: 1rem;
                margin-bottom: 1rem;
                position: sticky;
                top: 2rem;
            }

            .cart-summary-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
            }

            .cart-summary-header h4 {
                margin: 0;
                font-size: 1.1rem;
                font-weight: 600;
            }

            .cart-toggle {
                background: none;
                border: none;
                cursor: pointer;
                padding: 0.25rem;
                color: #6c757d;
            }

            .cart-summary-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 0.9rem;
                margin-bottom: 1rem;
            }

            .cart-total {
                font-weight: 600;
                color: #007bff;
                font-size: 1.1rem;
            }

            /* Animations */
            @keyframes slideIn {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }

            /* Responsive */
            @media (max-width: 768px) {
                .cart-sidebar-content {
                    width: 100%;
                    max-width: none;
                }
            }
        `;
        document.head.appendChild(style);
    }

    attachEventListeners() {
        // Cart icon click
        document.addEventListener('click', (e) => {
            if (e.target.closest('.cart-icon-btn')) {
                if (window.mainApp && window.mainApp.uiManager) {
                    window.mainApp.uiManager.toggleCartSidebar();
                }
            }
        });

        // Cart sidebar close
        document.addEventListener('click', (e) => {
            if (e.target.closest('.cart-close-btn') || e.target.closest('.cart-sidebar-overlay')) {
                if (window.mainApp && window.mainApp.uiManager) {
                    window.mainApp.uiManager.closeCartSidebar();
                }
            }
        });
    }
}

// Initialize cart display when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const cartDisplay = new CartDisplayManager();
        cartDisplay.init();
        window.cartDisplayManager = cartDisplay;
    }, 1000);
});