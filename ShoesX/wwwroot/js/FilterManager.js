// ===== ENHANCED FILTER MANAGER =====
class FilterManager {
    constructor() {
        this.filters = {
            productCode: '',
            colors: [],
            outerMaterials: [],
            innerMaterials: [],
            soles: [],
            productGroups: [],
            genders: [],
            sizes: [],
            minPrice: null,
            maxPrice: null,
            inStock: false,
            isAssorted: false,
            onSale: false
        };

        this.uniqueValues = {
            colors: new Set(),
            outerMaterials: new Set(),
            innerMaterials: new Set(),
            soles: new Set(),
            productGroups: new Set(),
            genders: new Set(),
            sizes: new Set()
        };

        this.priceRange = { min: 0, max: 1000 };
        this.isMobile = window.innerWidth < 768;
        this.sidebarCollapsed = this.isMobile;
    }

    // Initialize filter manager
    init(productGroups) {
        this.extractUniqueValues(productGroups);
        this.calculatePriceRange(productGroups);
        this.createEnhancedSidebar();
        this.attachEventListeners();
        this.handleResponsive();
        console.log('Enhanced Filter Manager initialized');
    }

    // Extract unique values from product data
    extractUniqueValues(productGroups) {
        Object.values(productGroups).forEach(group => {
            // Add base info values
            if (group.baseInfo.outerMaterial) {
                this.uniqueValues.outerMaterials.add(group.baseInfo.outerMaterial);
            }
            if (group.baseInfo.innerMaterial) {
                this.uniqueValues.innerMaterials.add(group.baseInfo.innerMaterial);
            }
            if (group.baseInfo.sole) {
                this.uniqueValues.soles.add(group.baseInfo.sole);
            }
            if (group.baseInfo.productGroup) {
                this.uniqueValues.productGroups.add(group.baseInfo.productGroup);
            }
            if (group.baseInfo.gender) {
                this.uniqueValues.genders.add(group.baseInfo.gender);
            }

            // Add colors from variants
            group.availableColors.forEach(color => {
                this.uniqueValues.colors.add(color);
            });

            // Add sizes
            group.availableSizes.forEach(size => {
                this.uniqueValues.sizes.add(size.toString());
            });
        });

        console.log('Extracted unique values:', {
            colors: this.uniqueValues.colors.size,
            outerMaterials: this.uniqueValues.outerMaterials.size,
            innerMaterials: this.uniqueValues.innerMaterials.size,
            soles: this.uniqueValues.soles.size,
            productGroups: this.uniqueValues.productGroups.size,
            genders: this.uniqueValues.genders.size,
            sizes: this.uniqueValues.sizes.size
        });
    }

    // Calculate price range from products
    calculatePriceRange(productGroups) {
        let minPrice = Infinity;
        let maxPrice = 0;

        Object.values(productGroups).forEach(group => {
            if (group.priceRange.min < minPrice && group.priceRange.min > 0) {
                minPrice = group.priceRange.min;
            }
            if (group.priceRange.max > maxPrice) {
                maxPrice = group.priceRange.max;
            }
        });

        this.priceRange = {
            min: minPrice === Infinity ? 0 : Math.floor(minPrice),
            max: Math.ceil(maxPrice)
        };
    }

    // Create enhanced sidebar with dynamic data
    createEnhancedSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        sidebar.innerHTML = `
            <div class="enhanced-sidebar">
                <!-- Mobile Toggle Button -->
                <div class="sidebar-mobile-header">
                    <button class="sidebar-toggle-btn" onclick="filterManager.toggleSidebar()">
                        <i class="fas fa-filter"></i>
                        <span>Filters</span>
                        <i class="fas fa-chevron-down toggle-icon"></i>
                    </button>
                </div>

                <!-- Sidebar Content -->
                <div class="sidebar-content-wrapper" ${this.sidebarCollapsed ? 'style="display: none;"' : ''}>
                    <div class="sidebar-content">
                        <!-- Header -->
                        <div class="filter-header">
                            <h3><i class="fas fa-filter"></i> Product Filters</h3>
                            <button class="clear-all-btn" onclick="filterManager.clearAllFilters()">
                                <i class="fas fa-times"></i>
                                <span>Clear All</span>
                            </button>
                        </div>

                        <!-- Quick Search -->
                        <div class="filter-section">
                            <h4 class="filter-title">
                                <i class="fas fa-search"></i>
                                Quick Search
                            </h4>
                            <div class="filter-content">
                                <div class="search-input-wrapper">
                                    <input type="text" 
                                           id="productCodeFilter" 
                                           placeholder="Product Code..." 
                                           class="filter-input">
                                    <i class="fas fa-barcode search-icon"></i>
                                </div>
                            </div>
                        </div>

                        <!-- Colors -->
                        ${this.createColorSection()}

                        <!-- Materials -->
                        ${this.createMaterialSection()}

                        <!-- Product Groups -->
                        ${this.createProductGroupSection()}

                        <!-- Gender -->
                        ${this.createGenderSection()}

                        <!-- Sizes -->
                        ${this.createSizeSection()}

                        <!-- Price Range -->
                        ${this.createPriceSection()}

                        <!-- Toggles -->
                        ${this.createToggleSection()}

                        <!-- Apply Button -->
                        <div class="filter-section">
                            <button class="apply-filters-btn" onclick="filterManager.applyFilters()">
                                <i class="fas fa-search"></i>
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.addFilterStyles();
    }

    // Create color filter section
    createColorSection() {
        if (this.uniqueValues.colors.size === 0) return '';

        const colors = Array.from(this.uniqueValues.colors).sort();
        const colorMap = this.getColorMap();

        return `
            <div class="filter-section">
                <h4 class="filter-title collapsible" onclick="filterManager.toggleSection('colors')">
                    <i class="fas fa-palette"></i>
                    Colors (${colors.length})
                    <i class="fas fa-chevron-down section-toggle"></i>
                </h4>
                <div class="filter-content" id="colors-content">
                    <div class="color-grid">
                        ${colors.map(color => {
            const colorClass = color.toLowerCase().replace(/\s+/g, '');
            const style = colorMap[color.toUpperCase()] || { bg: '#6c757d', text: '#ffffff' };

            return `
                                <label class="color-option">
                                    <input type="checkbox" name="colors" value="${color}" class="color-checkbox">
                                    <div class="color-item">
                                        <div class="color-dot" style="background: ${style.bg}; ${style.border || ''}"></div>
                                        <span class="color-name">${color}</span>
                                    </div>
                                </label>
                            `;
        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // Create material filter section
    createMaterialSection() {
        if (this.uniqueValues.outerMaterials.size === 0) return '';

        const materials = Array.from(this.uniqueValues.outerMaterials).sort();

        return `
            <div class="filter-section">
                <h4 class="filter-title collapsible" onclick="filterManager.toggleSection('materials')">
                    <i class="fas fa-gem"></i>
                    Outer Materials (${materials.length})
                    <i class="fas fa-chevron-down section-toggle"></i>
                </h4>
                <div class="filter-content" id="materials-content">
                    <div class="checkbox-grid">
                        ${materials.map(material => `
                            <label class="checkbox-option">
                                <input type="checkbox" name="outerMaterials" value="${material}">
                                <span class="checkbox-label">${material}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // Create product group section
    createProductGroupSection() {
        if (this.uniqueValues.productGroups.size === 0) return '';

        const groups = Array.from(this.uniqueValues.productGroups).sort();

        return `
            <div class="filter-section">
                <h4 class="filter-title collapsible" onclick="filterManager.toggleSection('groups')">
                    <i class="fas fa-tags"></i>
                    Product Groups (${groups.length})
                    <i class="fas fa-chevron-down section-toggle"></i>
                </h4>
                <div class="filter-content" id="groups-content">
                    <div class="checkbox-grid">
                        ${groups.map(group => `
                            <label class="checkbox-option">
                                <input type="checkbox" name="productGroups" value="${group}">
                                <span class="checkbox-label">${group}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // Create gender section
    createGenderSection() {
        if (this.uniqueValues.genders.size === 0) return '';

        const genders = Array.from(this.uniqueValues.genders).sort();
        const genderIcons = {
            'MEN': 'fas fa-mars',
            'WOMEN': 'fas fa-venus',
            'UNISEX': 'fas fa-venus-mars',
            'KIDS': 'fas fa-child'
        };

        return `
            <div class="filter-section">
                <h4 class="filter-title collapsible" onclick="filterManager.toggleSection('genders')">
                    <i class="fas fa-users"></i>
                    Gender (${genders.length})
                    <i class="fas fa-chevron-down section-toggle"></i>
                </h4>
                <div class="filter-content" id="genders-content">
                    <div class="gender-grid">
                        ${genders.map(gender => `
                            <label class="gender-option">
                                <input type="checkbox" name="genders" value="${gender}">
                                <div class="gender-item">
                                    <i class="${genderIcons[gender] || 'fas fa-user'}"></i>
                                    <span>${gender}</span>
                                </div>
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // Create size section
    createSizeSection() {
        if (this.uniqueValues.sizes.size === 0) return '';

        const sizes = Array.from(this.uniqueValues.sizes).sort((a, b) => parseInt(a) - parseInt(b));

        return `
            <div class="filter-section">
                <h4 class="filter-title collapsible" onclick="filterManager.toggleSection('sizes')">
                    <i class="fas fa-ruler"></i>
                    Sizes (${sizes.length})
                    <i class="fas fa-chevron-down section-toggle"></i>
                </h4>
                <div class="filter-content" id="sizes-content">
                    <div class="size-grid">
                        ${sizes.map(size => `
                            <label class="size-option">
                                <input type="checkbox" name="sizes" value="${size}">
                                <span class="size-badge">${size}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // Create price range section
    createPriceSection() {
        return `
            <div class="filter-section">
                <h4 class="filter-title collapsible" onclick="filterManager.toggleSection('price')">
                    <i class="fas fa-euro-sign"></i>
                    Price Range
                    <i class="fas fa-chevron-down section-toggle"></i>
                </h4>
                <div class="filter-content" id="price-content">
                    <div class="price-range-container">
                        <div class="price-inputs">
                            <div class="price-input-group">
                                <label>Min Price</label>
                                <input type="number" 
                                       id="minPrice" 
                                       placeholder="${this.priceRange.min}" 
                                       min="${this.priceRange.min}" 
                                       max="${this.priceRange.max}"
                                       class="price-input">
                            </div>
                            <div class="price-separator">–</div>
                            <div class="price-input-group">
                                <label>Max Price</label>
                                <input type="number" 
                                       id="maxPrice" 
                                       placeholder="${this.priceRange.max}" 
                                       min="${this.priceRange.min}" 
                                       max="${this.priceRange.max}"
                                       class="price-input">
                            </div>
                        </div>
                        <div class="price-range-info">
                            <span class="price-range-label">
                                Available range: €${this.priceRange.min} - €${this.priceRange.max}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Create toggle section
    createToggleSection() {
        return `
            <div class="filter-section">
                <h4 class="filter-title collapsible" onclick="filterManager.toggleSection('toggles')">
                    <i class="fas fa-toggle-on"></i>
                    Options
                    <i class="fas fa-chevron-down section-toggle"></i>
                </h4>
                <div class="filter-content" id="toggles-content">
                    <div class="toggle-options">
                        <label class="toggle-option">
                            <input type="checkbox" name="inStock" class="toggle-checkbox">
                            <div class="toggle-switch"></div>
                            <span class="toggle-label">
                                <i class="fas fa-box"></i>
                                In Stock Only
                            </span>
                        </label>
                        
                        <label class="toggle-option">
                            <input type="checkbox" name="isAssorted" class="toggle-checkbox">
                            <div class="toggle-switch"></div>
                            <span class="toggle-label">
                                <i class="fas fa-boxes"></i>
                                Assorted Products
                            </span>
                        </label>
                        
                        <label class="toggle-option">
                            <input type="checkbox" name="onSale" class="toggle-checkbox">
                            <div class="toggle-switch"></div>
                            <span class="toggle-label">
                                <i class="fas fa-percentage"></i>
                                On Sale
                            </span>
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    // Get color mapping for CSS
    getColorMap() {
        return {
            'BLACK': { bg: '#000000', text: '#ffffff' },
            'WHITE': { bg: '#ffffff', text: '#000000', border: 'border: 2px solid #e0e0e0;' },
            'BROWN': { bg: '#8B4513', text: '#ffffff' },
            'TAN': { bg: '#D2B48C', text: '#654321' },
            'NAVY': { bg: '#1e3a8a', text: '#ffffff' },
            'KHAKI': { bg: '#9CAF88', text: '#ffffff' },
            'SAND': { bg: '#F4E4BC', text: '#8B4513' },
            'BEIGE': { bg: '#F5F5DC', text: '#8B4513' },
            'GRAY': { bg: '#808080', text: '#ffffff' },
            'GREY': { bg: '#808080', text: '#ffffff' },
            'GOLD': { bg: '#FFD700', text: '#000000' },
            'SILVER': { bg: '#C0C0C0', text: '#000000' },
            'BLUE': { bg: '#0000FF', text: '#ffffff' },
            'RED': { bg: '#FF0000', text: '#ffffff' },
            'GREEN': { bg: '#008000', text: '#ffffff' }
        };
    }

    // Add comprehensive styles
    addFilterStyles() {
        if (document.getElementById('enhanced-filter-styles')) return;

        const style = document.createElement('style');
        style.id = 'enhanced-filter-styles';
        style.textContent = `
            /* Enhanced Sidebar Styles */
            .enhanced-sidebar {
                height: 100%;
                display: flex;
                flex-direction: column;
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }

            /* Mobile Header */
            .sidebar-mobile-header {
                display: none;
                padding: 1rem;
                background: #f8fafc;
                border-bottom: 1px solid #e2e8f0;
            }

            .sidebar-toggle-btn {
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: none;
                border: none;
                padding: 0.75rem;
                font-size: 1rem;
                font-weight: 600;
                color: #374151;
                cursor: pointer;
                border-radius: 8px;
                transition: all 0.2s ease;
            }

            .sidebar-toggle-btn:hover {
                background: #e2e8f0;
            }

            .sidebar-toggle-btn .toggle-icon {
                transition: transform 0.3s ease;
            }

            .sidebar-toggle-btn.collapsed .toggle-icon {
                transform: rotate(-180deg);
            }

            /* Sidebar Content */
            .sidebar-content-wrapper {
                flex: 1;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }

            .sidebar-content {
                flex: 1;
                overflow-y: auto;
                padding: 1.5rem;
                scrollbar-width: thin;
                scrollbar-color: #cbd5e1 #f1f5f9;
            }

            .sidebar-content::-webkit-scrollbar {
                width: 6px;
            }

            .sidebar-content::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 3px;
            }

            .sidebar-content::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 3px;
            }

            .sidebar-content::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
            }

            /* Filter Header */
            .filter-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2rem;
                padding-bottom: 1rem;
                border-bottom: 2px solid #e2e8f0;
            }

            .filter-header h3 {
                font-size: 1.2rem;
                font-weight: 700;
                color: #1f2937;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }

            .clear-all-btn {
                background: #fee2e2;
                color: #dc2626;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 8px;
                font-size: 0.875rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .clear-all-btn:hover {
                background: #fecaca;
                transform: translateY(-1px);
            }

            /* Filter Sections */
            .filter-section {
                margin-bottom: 1.5rem;
                background: #f8fafc;
                border-radius: 12px;
                border: 1px solid #e2e8f0;
                overflow: hidden;
                transition: all 0.3s ease;
            }

            .filter-section:hover {
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .filter-title {
                font-size: 1rem;
                font-weight: 600;
                color: #374151;
                margin: 0;
                padding: 1rem 1.25rem;
                background: #ffffff;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                align-items: center;
                gap: 0.75rem;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .filter-title.collapsible {
                justify-content: space-between;
            }

            .filter-title:hover {
                background: #f8fafc;
                color: #1f2937;
            }

            .filter-title i:first-child {
                color: #6366f1;
                font-size: 0.875rem;
            }

            .section-toggle {
                transition: transform 0.3s ease;
                color: #9ca3af;
                font-size: 0.75rem;
            }

            .filter-title.collapsed .section-toggle {
                transform: rotate(-180deg);
            }

            .filter-content {
                padding: 1.25rem;
                background: #ffffff;
            }

            .filter-content.collapsed {
                display: none;
            }

            /* Search Input */
            .search-input-wrapper {
                position: relative;
                width: 100%;
            }

            .filter-input {
                width: 100%;
                padding: 0.75rem 1rem 0.75rem 2.5rem;
                border: 2px solid #e2e8f0;
                border-radius: 8px;
                font-size: 0.9rem;
                transition: all 0.2s ease;
                background: #ffffff;
                box-sizing: border-box;
            }

            .filter-input:focus {
                outline: none;
                border-color: #6366f1;
                box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
            }

            .search-icon {
                position: absolute;
                left: 0.75rem;
                top: 50%;
                transform: translateY(-50%);
                color: #9ca3af;
                font-size: 0.875rem;
            }

            /* Color Grid */
            .color-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 0.5rem;
                max-height: 200px;
                overflow-y: auto;
            }

            .color-option {
                cursor: pointer;
                border-radius: 8px;
                transition: all 0.2s ease;
            }

            .color-option:hover {
                background: #f1f5f9;
            }

            .color-checkbox {
                display: none;
            }

            .color-item {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem;
                border-radius: 8px;
                border: 2px solid transparent;
                transition: all 0.2s ease;
            }

            .color-checkbox:checked + .color-item {
                border-color: #6366f1;
                background: rgba(99, 102, 241, 0.1);
            }

            .color-dot {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                flex-shrink: 0;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }

            .color-name {
                font-size: 0.875rem;
                font-weight: 500;
                color: #374151;
                text-transform: capitalize;
            }

            /* Checkbox Grid */
            .checkbox-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 0.5rem;
                max-height: 200px;
                overflow-y: auto;
            }

            .checkbox-option {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                border: 2px solid transparent;
            }

            .checkbox-option:hover {
                background: #f1f5f9;
            }

            .checkbox-option input[type="checkbox"] {
                width: 16px;
                height: 16px;
                accent-color: #6366f1;
                cursor: pointer;
            }

            .checkbox-option input[type="checkbox"]:checked + .checkbox-label {
                color: #6366f1;
                font-weight: 600;
            }

            .checkbox-label {
                font-size: 0.875rem;
                color: #374151;
                font-weight: 500;
                text-transform: capitalize;
            }

            /* Gender Grid */
            .gender-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 0.5rem;
            }

            .gender-option {
                cursor: pointer;
            }

            .gender-option input[type="checkbox"] {
                display: none;
            }

            .gender-item {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem;
                border-radius: 8px;
                border: 2px solid transparent;
                transition: all 0.2s ease;
                font-weight: 500;
                color: #374151;
            }

            .gender-option:hover .gender-item {
                background: #f1f5f9;
            }

            .gender-option input[type="checkbox"]:checked + .gender-item {
                border-color: #6366f1;
                background: rgba(99, 102, 241, 0.1);
                color: #6366f1;
            }

            .gender-item i {
                font-size: 1rem;
                width: 20px;
                text-align: center;
            }

            /* Size Grid */
            .size-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(45px, 1fr));
                gap: 0.5rem;
                max-height: 150px;
                overflow-y: auto;
            }

            .size-option {
                cursor: pointer;
            }

            .size-option input[type="checkbox"] {
                display: none;
            }

            .size-badge {
                display: block;
                padding: 0.5rem;
                text-align: center;
                border: 2px solid #e2e8f0;
                border-radius: 8px;
                font-weight: 600;
                font-size: 0.875rem;
                color: #374151;
                transition: all 0.2s ease;
                background: #ffffff;
            }

            .size-option:hover .size-badge {
                border-color: #6366f1;
                background: #f8fafc;
            }

            .size-option input[type="checkbox"]:checked + .size-badge {
                border-color: #6366f1;
                background: #6366f1;
                color: #ffffff;
            }

            /* Price Range */
            .price-range-container {
                width: 100%;
            }

            .price-inputs {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                margin-bottom: 1rem;
            }

            .price-input-group {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .price-input-group label {
                font-size: 0.75rem;
                font-weight: 600;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .price-input {
                width: 100%;
                padding: 0.75rem;
                border: 2px solid #e2e8f0;
                border-radius: 8px;
                font-size: 0.875rem;
                text-align: center;
                transition: all 0.2s ease;
                box-sizing: border-box;
            }

            .price-input:focus {
                outline: none;
                border-color: #6366f1;
                box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
            }

            .price-separator {
                font-weight: 700;
                color: #6b7280;
                margin-top: 1.5rem;
            }

            .price-range-info {
                text-align: center;
            }

            .price-range-label {
                font-size: 0.75rem;
                color: #6b7280;
                font-style: italic;
            }

            /* Toggle Options */
            .toggle-options {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            .toggle-option {
                display: flex;
                align-items: center;
                gap: 1rem;
                cursor: pointer;
                padding: 0.75rem;
                border-radius: 8px;
                transition: all 0.2s ease;
            }

            .toggle-option:hover {
                background: #f1f5f9;
            }

            .toggle-checkbox {
                display: none;
            }

            .toggle-switch {
                width: 44px;
                height: 24px;
                background: #d1d5db;
                border-radius: 12px;
                position: relative;
                transition: all 0.3s ease;
                flex-shrink: 0;
            }

            .toggle-switch::before {
                content: '';
                position: absolute;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #ffffff;
                top: 2px;
                left: 2px;
                transition: all 0.3s ease;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }

            .toggle-checkbox:checked + .toggle-switch {
                background: #6366f1;
            }

            .toggle-checkbox:checked + .toggle-switch::before {
                transform: translateX(20px);
            }

            .toggle-label {
                font-size: 0.875rem;
                font-weight: 500;
                color: #374151;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                flex: 1;
            }

            .toggle-label i {
                color: #6b7280;
            }

            /* Apply Button */
            .apply-filters-btn {
                width: 100%;
                background: linear-gradient(135deg, #6366f1, #4f46e5);
                color: #ffffff;
                border: none;
                padding: 1rem 1.5rem;
                border-radius: 12px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.75rem;
                box-shadow: 0 4px 6px rgba(99, 102, 241, 0.25);
            }

            .apply-filters-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 15px rgba(99, 102, 241, 0.35);
                background: linear-gradient(135deg, #4f46e5, #3730a3);
            }

            .apply-filters-btn:active {
                transform: translateY(0);
            }

            /* Responsive Design */
            @media (max-width: 1024px) {
                .sidebar-content {
                    padding: 1rem;
                }
                
                .filter-section {
                    margin-bottom: 1rem;
                }
            }

            @media (max-width: 768px) {
                .sidebar-mobile-header {
                    display: block;
                }

                .enhanced-sidebar {
                    position: static;
                    height: auto;
                    box-shadow: none;
                    border-radius: 0;
                    border-bottom: 1px solid #e2e8f0;
                    margin-bottom: 1rem;
                }

                .sidebar-content {
                    padding: 0 1rem 1rem 1rem;
                    max-height: none;
                    overflow-y: visible;
                }

                .filter-header {
                    margin-bottom: 1rem;
                    flex-direction: column;
                    align-items: stretch;
                    gap: 1rem;
                }

                .filter-header h3 {
                    text-align: center;
                }

                .clear-all-btn {
                    align-self: center;
                }

                .color-grid,
                .checkbox-grid {
                    max-height: 150px;
                }

                .size-grid {
                    grid-template-columns: repeat(auto-fit, minmax(40px, 1fr));
                    max-height: 120px;
                }

                .price-inputs {
                    flex-direction: column;
                    gap: 1rem;
                }

                .price-separator {
                    margin-top: 0;
                    text-align: center;
                }

                .toggle-options {
                    gap: 0.75rem;
                }
            }

            @media (max-width: 480px) {
                .sidebar-content {
                    padding: 0 0.75rem 0.75rem 0.75rem;
                }

                .filter-title {
                    padding: 0.75rem 1rem;
                    font-size: 0.9rem;
                }

                .filter-content {
                    padding: 1rem;
                }

                .size-grid {
                    grid-template-columns: repeat(auto-fit, minmax(35px, 1fr));
                }

                .apply-filters-btn {
                    padding: 0.875rem 1.25rem;
                    font-size: 0.9rem;
                }
            }

            /* Animation Classes */
            .filter-section.expanding .filter-content {
                animation: expandSection 0.3s ease-out;
            }

            .filter-section.collapsing .filter-content {
                animation: collapseSection 0.3s ease-out;
            }

            @keyframes expandSection {
                from {
                    opacity: 0;
                    max-height: 0;
                    padding-top: 0;
                    padding-bottom: 0;
                }
                to {
                    opacity: 1;
                    max-height: 500px;
                    padding-top: 1.25rem;
                    padding-bottom: 1.25rem;
                }
            }

            @keyframes collapseSection {
                from {
                    opacity: 1;
                    max-height: 500px;
                    padding-top: 1.25rem;
                    padding-bottom: 1.25rem;
                }
                to {
                    opacity: 0;
                    max-height: 0;
                    padding-top: 0;
                    padding-bottom: 0;
                }
            }

            /* Loading States */
            .filter-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2rem;
                color: #6b7280;
                font-style: italic;
            }

            .filter-loading::before {
                content: '';
                width: 20px;
                height: 20px;
                border: 2px solid #e5e7eb;
                border-top: 2px solid #6366f1;
                border-radius: 50%;
                margin-right: 0.75rem;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                to {
                    transform: rotate(360deg);
                }
            }

            /* Active Filter Indicators */
            .filter-title.has-active-filters {
                color: #6366f1;
                font-weight: 700;
            }

            .filter-title.has-active-filters::after {
                content: '';
                width: 8px;
                height: 8px;
                background: #ef4444;
                border-radius: 50%;
                margin-left: auto;
            }

            /* Accessibility Improvements */
            .filter-option:focus-within {
                outline: 2px solid #6366f1;
                outline-offset: 2px;
                border-radius: 8px;
            }

            .apply-filters-btn:focus {
                outline: 2px solid #ffffff;
                outline-offset: 2px;
            }

            /* Dark mode support (if needed) */
            @media (prefers-color-scheme: dark) {
                .enhanced-sidebar {
                    background: #1f2937;
                    color: #f9fafb;
                }

                .filter-section {
                    background: #374151;
                    border-color: #4b5563;
                }

                .filter-title {
                    background: #1f2937;
                    color: #f9fafb;
                    border-color: #4b5563;
                }

                .filter-content {
                    background: #374151;
                }

                .filter-input,
                .price-input {
                    background: #1f2937;
                    color: #f9fafb;
                    border-color: #4b5563;
                }

                .color-item,
                .gender-item,
                .size-badge {
                    background: #1f2937;
                    color: #f9fafb;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Event Listeners
    attachEventListeners() {
        // Search input
        const searchInput = document.getElementById('productCodeFilter');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.productCode = e.target.value.toLowerCase();
                this.debounceApplyFilters();
            });
        }

        // Price inputs
        const minPriceInput = document.getElementById('minPrice');
        const maxPriceInput = document.getElementById('maxPrice');

        if (minPriceInput) {
            minPriceInput.addEventListener('change', (e) => {
                this.filters.minPrice = parseFloat(e.target.value) || null;
                this.debounceApplyFilters();
            });
        }

        if (maxPriceInput) {
            maxPriceInput.addEventListener('change', (e) => {
                this.filters.maxPrice = parseFloat(e.target.value) || null;
                this.debounceApplyFilters();
            });
        }

        // Checkbox filters
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateFiltersFromForm();
                this.debounceApplyFilters();
            });
        });

        // Window resize for responsive behavior
        window.addEventListener('resize', () => {
            this.handleResponsive();
        });
    }

    // Update filters from form
    updateFiltersFromForm() {
        // Colors
        this.filters.colors = Array.from(document.querySelectorAll('input[name="colors"]:checked'))
            .map(input => input.value);

        // Materials
        this.filters.outerMaterials = Array.from(document.querySelectorAll('input[name="outerMaterials"]:checked'))
            .map(input => input.value);

        // Product Groups
        this.filters.productGroups = Array.from(document.querySelectorAll('input[name="productGroups"]:checked'))
            .map(input => input.value);

        // Genders
        this.filters.genders = Array.from(document.querySelectorAll('input[name="genders"]:checked'))
            .map(input => input.value);

        // Sizes
        this.filters.sizes = Array.from(document.querySelectorAll('input[name="sizes"]:checked'))
            .map(input => input.value);

        // Toggle options
        this.filters.inStock = document.querySelector('input[name="inStock"]')?.checked || false;
        this.filters.isAssorted = document.querySelector('input[name="isAssorted"]')?.checked || false;
        this.filters.onSale = document.querySelector('input[name="onSale"]')?.checked || false;

        // Update filter indicators
        this.updateFilterIndicators();
    }

    // Update visual indicators for active filters
    updateFilterIndicators() {
        const sections = ['colors', 'materials', 'groups', 'genders', 'sizes', 'toggles'];

        sections.forEach(section => {
            const title = document.querySelector(`#${section}-content`)?.parentElement.querySelector('.filter-title');
            if (title) {
                const hasActiveFilters = this.sectionHasActiveFilters(section);
                title.classList.toggle('has-active-filters', hasActiveFilters);
            }
        });
    }

    // Check if section has active filters
    sectionHasActiveFilters(section) {
        switch (section) {
            case 'colors':
                return this.filters.colors.length > 0;
            case 'materials':
                return this.filters.outerMaterials.length > 0;
            case 'groups':
                return this.filters.productGroups.length > 0;
            case 'genders':
                return this.filters.genders.length > 0;
            case 'sizes':
                return this.filters.sizes.length > 0;
            case 'toggles':
                return this.filters.inStock || this.filters.isAssorted || this.filters.onSale;
            default:
                return false;
        }
    }

    // Debounced filter application
    debounceApplyFilters() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.applyFilters();
        }, 300);
    }

    // Apply filters to product manager
    applyFilters() {
        console.log('Applying filters:', this.filters);

        if (window.mainApp && window.mainApp.productManager) {
            window.mainApp.productManager.applyFilters(this.filters);
        } else if (window.shoeStore) {
            window.shoeStore.applyFilters(this.filters);
        }

        // Show loading state briefly
        this.showLoadingState();
    }

    // Clear all filters
    clearAllFilters() {
        // Reset filter object
        this.filters = {
            productCode: '',
            colors: [],
            outerMaterials: [],
            innerMaterials: [],
            soles: [],
            productGroups: [],
            genders: [],
            sizes: [],
            minPrice: null,
            maxPrice: null,
            inStock: false,
            isAssorted: false,
            onSale: false
        };

        // Clear form inputs
        document.querySelectorAll('input[type="checkbox"]').forEach(input => {
            input.checked = false;
        });

        document.getElementById('productCodeFilter').value = '';
        document.getElementById('minPrice').value = '';
        document.getElementById('maxPrice').value = '';

        // Update indicators and apply
        this.updateFilterIndicators();
        this.applyFilters();

        // Show success message
        this.showToast('All filters cleared', 'success');
    }

    // Toggle section visibility
    toggleSection(sectionName) {
        const content = document.getElementById(`${sectionName}-content`);
        const title = content?.parentElement.querySelector('.filter-title');

        if (content && title) {
            const isCollapsed = content.classList.contains('collapsed');

            if (isCollapsed) {
                content.classList.remove('collapsed');
                title.classList.remove('collapsed');
                content.parentElement.classList.add('expanding');
            } else {
                content.classList.add('collapsed');
                title.classList.add('collapsed');
                content.parentElement.classList.add('collapsing');
            }

            // Clean up animation classes
            setTimeout(() => {
                content.parentElement.classList.remove('expanding', 'collapsing');
            }, 300);
        }
    }

    // Toggle sidebar on mobile
    toggleSidebar() {
        const wrapper = document.querySelector('.sidebar-content-wrapper');
        const toggleBtn = document.querySelector('.sidebar-toggle-btn');

        if (wrapper && toggleBtn) {
            this.sidebarCollapsed = !this.sidebarCollapsed;

            if (this.sidebarCollapsed) {
                wrapper.style.display = 'none';
                toggleBtn.classList.add('collapsed');
            } else {
                wrapper.style.display = 'flex';
                toggleBtn.classList.remove('collapsed');
            }
        }
    }

    // Handle responsive behavior
    handleResponsive() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth < 768;

        if (wasMobile !== this.isMobile) {
            const wrapper = document.querySelector('.sidebar-content-wrapper');
            if (wrapper) {
                if (this.isMobile) {
                    wrapper.style.display = 'none';
                    this.sidebarCollapsed = true;
                } else {
                    wrapper.style.display = 'flex';
                    this.sidebarCollapsed = false;
                }
            }
        }
    }

    // Show loading state
    showLoadingState() {
        const applyBtn = document.querySelector('.apply-filters-btn');
        if (applyBtn) {
            const originalText = applyBtn.innerHTML;
            applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying...';
            applyBtn.disabled = true;

            setTimeout(() => {
                applyBtn.innerHTML = originalText;
                applyBtn.disabled = false;
            }, 500);
        }
    }

    // Show toast message
    showToast(message, type = 'success') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Get current filters
    getCurrentFilters() {
        return { ...this.filters };
    }

    // Set filters programmatically
    setFilters(newFilters) {
        this.filters = { ...this.filters, ...newFilters };
        this.updateFormFromFilters();
        this.updateFilterIndicators();
    }

    // Update form from filters object
    updateFormFromFilters() {
        // Update search input
        const searchInput = document.getElementById('productCodeFilter');
        if (searchInput) {
            searchInput.value = this.filters.productCode || '';
        }

        // Update price inputs
        const minPriceInput = document.getElementById('minPrice');
        const maxPriceInput = document.getElementById('maxPrice');
        if (minPriceInput) minPriceInput.value = this.filters.minPrice || '';
        if (maxPriceInput) maxPriceInput.value = this.filters.maxPrice || '';

        // Update checkboxes
        Object.keys(this.filters).forEach(filterKey => {
            if (Array.isArray(this.filters[filterKey])) {
                this.filters[filterKey].forEach(value => {
                    const checkbox = document.querySelector(`input[name="${filterKey}"][value="${value}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            } else if (typeof this.filters[filterKey] === 'boolean') {
                const checkbox = document.querySelector(`input[name="${filterKey}"]`);
                if (checkbox) checkbox.checked = this.filters[filterKey];
            }
        });
    }

    // Get filter summary for display
    getFilterSummary() {
        const activeFilters = [];

        if (this.filters.productCode) {
            activeFilters.push(`Search: "${this.filters.productCode}"`);
        }

        if (this.filters.colors.length) {
            activeFilters.push(`Colors: ${this.filters.colors.length}`);
        }

        if (this.filters.outerMaterials.length) {
            activeFilters.push(`Materials: ${this.filters.outerMaterials.length}`);
        }

        if (this.filters.productGroups.length) {
            activeFilters.push(`Groups: ${this.filters.productGroups.length}`);
        }

        if (this.filters.genders.length) {
            activeFilters.push(`Genders: ${this.filters.genders.length}`);
        }

        if (this.filters.sizes.length) {
            activeFilters.push(`Sizes: ${this.filters.sizes.length}`);
        }

        if (this.filters.minPrice || this.filters.maxPrice) {
            const min = this.filters.minPrice || this.priceRange.min;
            const max = this.filters.maxPrice || this.priceRange.max;
            activeFilters.push(`Price: €${min}-€${max}`);
        }

        const toggles = [];
        if (this.filters.inStock) toggles.push('In Stock');
        if (this.filters.isAssorted) toggles.push('Assorted');
        if (this.filters.onSale) toggles.push('On Sale');

        if (toggles.length) {
            activeFilters.push(`Options: ${toggles.join(', ')}`);
        }

        return activeFilters;
    }
}

// Global instance
window.filterManager = new FilterManager();