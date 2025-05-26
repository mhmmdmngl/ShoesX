// ===== PRODUCT MANAGER =====
class ProductManager {
    constructor() {
        this.allProducts = [];
        this.productGroups = {};
        this.filteredGroups = {};
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

        // Clear unique values
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

            // Set primary variant (highest stock)
            if (!group.primaryVariant || variant.actualStock > group.primaryVariant.actualStock) {
                group.primaryVariant = variant;
            }

            // Update group totals
            group.totalStock += variant.actualStock;
            if (variant.color && !group.availableColors.includes(variant.color)) {
                group.availableColors.push(variant.color);
            }

            // Process sizes
            if (product.sizes && typeof product.sizes === 'object') {
                Object.keys(product.sizes).forEach(size => {
                    if (product.sizes[size] && product.sizes[size] > 0) {
                        group.availableSizes.add(size);
                    }
                });
            }

            // Update price range
            if (actualPrice > 0) {
                if (actualPrice < group.priceRange.min) group.priceRange.min = actualPrice;
                if (actualPrice > group.priceRange.max) group.priceRange.max = actualPrice;
            }
            if (discount > 0) group.hasDiscount = true;

            // Add to unique values
            if (product.color) this.uniqueValues.colors.add(product.color);
            if (product.outerMaterial) this.uniqueValues.materials.add(product.outerMaterial);
            if (product.sole) this.uniqueValues.soles.add(product.sole);
            if (product.productGroup) this.uniqueValues.productGroups.add(product.productGroup);
            if (product.gender) this.uniqueValues.genders.add(product.gender);
        });

        // Clean up empty groups and finalize data
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

    // ===== FILTERING & SORTING =====
    filterProducts() {
        // Reset to show all products - actual filtering would be implemented here
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

    clearAllFilters() {
        this.filteredGroups = { ...this.productGroups };
        this.currentPage = 1;
        this.renderProducts();
        this.updateStats();
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
                        <button class="quick-view-btn" onclick="window.showProductModal(window.mainApp.productManager.productGroups['${group.productCode}'])">
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
                                              onclick="window.addToCart('${group.productCode}', '${color}')"
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
                        <button class="btn-secondary" onclick="window.showProductModal(window.mainApp.productManager.productGroups['${group.productCode}'])">
                            <i class="fas fa-info-circle"></i>
                            View Details
                        </button>
                        <button class="btn-primary" onclick="window.addToCart('${group.productCode}')"
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

        // Previous button
        if (this.currentPage > 1) {
            paginationHTML += `
                <li class="page-item">
                    <button class="page-link" onclick="window.changePage(${this.currentPage - 1})">
                        <i class="fas fa-chevron-left"></i>
                        Previous
                    </button>
                </li>
            `;
        }

        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        if (startPage > 1) {
            paginationHTML += `
                <li class="page-item">
                    <button class="page-link" onclick="window.changePage(1)">1</button>
                </li>
            `;
            if (startPage > 2) {
                paginationHTML += '<li class="page-item"><span class="page-dots">...</span></li>';
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <button class="page-link" onclick="window.changePage(${i})">${i}</button>
                </li>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += '<li class="page-item"><span class="page-dots">...</span></li>';
            }
            paginationHTML += `
                <li class="page-item">
                    <button class="page-link" onclick="window.changePage(${totalPages})">${totalPages}</button>
                </li>
            `;
        }

        // Next button
        if (this.currentPage < totalPages) {
            paginationHTML += `
                <li class="page-item">
                    <button class="page-link" onclick="window.changePage(${this.currentPage + 1})">
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

        // Scroll to top
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

    // ===== VIEW MANAGEMENT =====
    setView(view) {
        this.currentView = view;
        this.renderProducts();
    }

    // ===== SEARCH FUNCTIONALITY =====
    searchProducts(searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            this.filteredGroups = { ...this.productGroups };
        } else {
            const term = searchTerm.toLowerCase().trim();
            this.filteredGroups = {};

            Object.values(this.productGroups).forEach(group => {
                const searchable = [
                    group.productCode,
                    group.baseInfo.outerMaterial,
                    group.baseInfo.innerMaterial,
                    group.baseInfo.sole,
                    group.baseInfo.productGroup,
                    group.baseInfo.gender,
                    ...group.availableColors
                ].join(' ').toLowerCase();

                if (searchable.includes(term)) {
                    this.filteredGroups[group.productCode] = group;
                }
            });
        }

        this.currentPage = 1;
        this.renderProducts();
        this.updateStats();
    }

    // ===== UTILITY FUNCTIONS =====
    showLoading() {
        this.isLoading = true;
        const loadingState = document.getElementById('loadingState');
        const productsGrid = document.getElementById('productsGrid');

        if (loadingState) loadingState.style.display = 'flex';
        if (productsGrid) productsGrid.style.display = 'none';
    }

    hideLoading() {
        this.isLoading = false;
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
                    <button class="btn-clear-filters" onclick="window.loadProducts()">
                        <i class="fas fa-refresh"></i>
                        Try Again
                    </button>
                `;
            }
        }
    }

    // ===== PRODUCT FINDER HELPERS =====
    getProductByCode(productCode) {
        return this.productGroups[productCode] || null;
    }

    getProductsByMaterial(material) {
        return Object.values(this.productGroups).filter(group =>
            group.baseInfo.outerMaterial === material || group.baseInfo.innerMaterial === material
        );
    }

    getProductsByColor(color) {
        return Object.values(this.productGroups).filter(group =>
            group.availableColors.includes(color)
        );
    }

    getProductsByGender(gender) {
        return Object.values(this.productGroups).filter(group =>
            group.baseInfo.gender === gender
        );
    }

    getAvailableProducts() {
        return Object.values(this.productGroups).filter(group =>
            group.totalStock > 0
        );
    }

    getDiscountedProducts() {
        return Object.values(this.productGroups).filter(group =>
            group.hasDiscount
        );
    }

    getAssortedProducts() {
        return Object.values(this.productGroups).filter(group =>
            group.baseInfo.isAssorted
        );
    }

    // ===== STATISTICS =====
    getStatistics() {
        const stats = {
            totalProducts: Object.keys(this.productGroups).length,
            totalVariants: Object.values(this.productGroups).reduce((sum, group) => sum + group.variants.length, 0),
            totalStock: Object.values(this.productGroups).reduce((sum, group) => sum + group.totalStock, 0),
            availableProducts: this.getAvailableProducts().length,
            discountedProducts: this.getDiscountedProducts().length,
            assortedProducts: this.getAssortedProducts().length,
            uniqueColors: this.uniqueValues.colors.size,
            uniqueMaterials: this.uniqueValues.materials.size,
            uniqueSoles: this.uniqueValues.soles.size,
            productGroups: this.uniqueValues.productGroups.size,
            genders: this.uniqueValues.genders.size
        };

        return stats;
    }

    // ===== DEBUG HELPERS =====
    debugInfo() {
        console.log('=== Product Manager Debug Info ===');
        console.log('Total Products:', Object.keys(this.productGroups).length);
        console.log('Filtered Products:', Object.keys(this.filteredGroups).length);
        console.log('Current Page:', this.currentPage);
        console.log('Products Per Page:', this.productsPerPage);
        console.log('Current View:', this.currentView);
        console.log('Is Loading:', this.isLoading);
        console.log('Statistics:', this.getStatistics());
        console.log('Sample Product:', Object.values(this.productGroups)[0]);
    }
}