// حالة التطبيق
const state = {
    products: [],
    orders: [],
    colors: [],
    sizes: [],
    features: [],
    images: [], // لتخزين صور Base64
    stats: {},
    currentPage: 1,
    productsPerPage: 10,
    ordersPerPage: 10,
    isEditing: false,
    editingProductId: null
};

// عناصر DOM
const DOM = {
    // النموذج
    addProductForm: document.getElementById('add-product-form'),
    productName: document.getElementById('name'),
    productPrice: document.getElementById('price'),
    originalPrice: document.getElementById('originalPrice'),
    discount: document.getElementById('discount'),
    category: document.getElementById('category'),
    stock: document.getElementById('stock'),
    description: document.getElementById('description'),
    
    // رفع الصور
    imageUploadArea: document.getElementById('image-upload-area'),
    imageInput: document.getElementById('image-input'),
    imagePreview: document.getElementById('image-preview'),
    
    // المدخلات المتعددة
    colorInput: document.getElementById('color-input'),
    colorsTags: document.getElementById('colors-tags'),
    sizeInput: document.getElementById('size-input'),
    sizesTags: document.getElementById('sizes-tags'),
    featureInput: document.getElementById('feature-input'),
    featuresTags: document.getElementById('features-tags'),
    
    // الحاويات
    productsContainer: document.getElementById('products-container'),
    ordersContainer: document.getElementById('orders-container'),
    productCount: document.getElementById('product-count'),
    orderCount: document.getElementById('order-count'),
    
    // البحث والتصفية
    productSearch: document.getElementById('product-search'),
    categoryFilter: document.getElementById('category-filter'),
    stockFilter: document.getElementById('stock-filter'),
    sortProducts: document.getElementById('sort-products'),
    statusFilter: document.getElementById('status-filter'),
    dateFilter: document.getElementById('date-filter'),
    orderSearch: document.getElementById('order-search'),
    
    // المودال
    orderModal: document.getElementById('order-modal'),
    orderDetails: document.getElementById('order-details'),
    productDetailModal: document.getElementById('product-detail-modal'),
    productFullDetails: document.getElementById('product-full-details'),
    shippingModal: document.getElementById('shipping-modal'),
    shippingContent: document.getElementById('shipping-content'),
    
    // الإحصائيات
    totalProducts: document.getElementById('total-products'),
    totalOrders: document.getElementById('total-orders'),
    totalSales: document.getElementById('total-sales'),
    
    // التحميل
    loadingProducts: document.getElementById('loading-products')
};

// تهيئة التطبيق
async function init() {
    updateCurrentDate();
    updateCurrentYear();
    setupEventListeners();
    setupMobileOptimizations();
    await loadStats();
    await loadProducts();
    await loadOrders();
    startAutoRefresh();
}

// تحديث التاريخ الحالي
function updateCurrentDate() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    document.getElementById('current-date').textContent = 
        now.toLocaleDateString('ar-SA', options);
}

// تحديث السنة الحالية
function updateCurrentYear() {
    document.getElementById('current-year').textContent = new Date().getFullYear();
}

// إعداد المستمعين للأحداث
function setupEventListeners() {
    // إضافة/تحديث منتج
    DOM.addProductForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (state.isEditing) {
            updateProduct(state.editingProductId);
        } else {
            handleAddProduct(e);
        }
    });
    
    // رفع الصور
    DOM.imageInput.addEventListener('change', handleImageUpload);
    
    // سحب وإفلات الصور
    DOM.imageUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        DOM.imageUploadArea.classList.add('dragover');
    });
    
    DOM.imageUploadArea.addEventListener('dragleave', () => {
        DOM.imageUploadArea.classList.remove('dragover');
    });
    
    DOM.imageUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        DOM.imageUploadArea.classList.remove('dragover');
        
        if (e.dataTransfer.files) {
            handleFiles(e.dataTransfer.files);
        }
    });
    
    // المدخلات المتعددة
    setupTagsInput('colors', DOM.colorInput, DOM.colorsTags);
    setupTagsInput('sizes', DOM.sizeInput, DOM.sizesTags);
    setupTagsInput('features', DOM.featureInput, DOM.featuresTags);
    
    // البحث والتصفية
    DOM.productSearch.addEventListener('input', debounce(filterProducts, 300));
    DOM.categoryFilter.addEventListener('change', filterProducts);
    DOM.stockFilter.addEventListener('change', filterProducts);
    DOM.sortProducts.addEventListener('change', filterProducts);
    DOM.statusFilter.addEventListener('change', filterOrders);
    DOM.dateFilter.addEventListener('change', filterOrders);
    DOM.orderSearch.addEventListener('input', debounce(filterOrders, 300));
    
    // المودال
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', () => {
            DOM.orderModal.style.display = 'none';
            DOM.productDetailModal.style.display = 'none';
            DOM.shippingModal.style.display = 'none';
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === DOM.orderModal) {
            DOM.orderModal.style.display = 'none';
        }
        if (e.target === DOM.productDetailModal) {
            DOM.productDetailModal.style.display = 'none';
        }
        if (e.target === DOM.shippingModal) {
            DOM.shippingModal.style.display = 'none';
        }
    });
    
    // تحديث الإحصائيات عند التحميل
    window.addEventListener('load', updateStatsUI);
}

// إعداد المدخلات المتعددة
function setupTagsInput(type, inputElement, tagsContainer) {
    inputElement.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const value = inputElement.value.trim();
            if (value && !state[type].includes(value)) {
                state[type].push(value);
                renderTags(type, tagsContainer);
                inputElement.value = '';
            }
        }
    });
    
    // السماح بإضافة علامات بالمسافة بعد الفاصلة
    inputElement.addEventListener('keyup', (e) => {
        if (e.key === ',' || e.key === '،') {
            const value = inputElement.value.trim().slice(0, -1);
            if (value && !state[type].includes(value)) {
                state[type].push(value);
                renderTags(type, tagsContainer);
                inputElement.value = '';
            }
        }
    });
}

// عرض العلامات
function renderTags(type, container) {
    container.innerHTML = state[type].map((tag, index) => `
        <div class="tag" data-index="${index}">
            ${tag}
            <span class="remove" onclick="removeTag('${type}', ${index})">×</span>
        </div>
    `).join('');
}

// إزالة علامة
function removeTag(type, index) {
    state[type].splice(index, 1);
    renderTags(type, DOM[`${type}Tags`]);
}

// معالجة رفع الصور
function handleImageUpload(e) {
    const files = Array.from(e.target.files);
    handleFiles(files);
}

// معالجة الملفات
function handleFiles(files) {
    files.forEach(file => {
        if (!file.type.match('image.*')) {
            showAlert('يُسمح برفع الصور فقط', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showAlert('حجم الصورة يجب أن يكون أقل من 5MB', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = {
                data: e.target.result,
                name: file.name,
                size: file.size,
                type: file.type,
                isMain: state.images.length === 0
            };
            
            state.images.push(imageData);
            renderImagePreview();
        };
        reader.readAsDataURL(file);
    });
    
    // إعادة تعيين المدخل لرفع نفس الصور مرة أخرى
    DOM.imageInput.value = '';
}

// عرض معاينة الصور
function renderImagePreview() {
    if (state.images.length === 0) {
        DOM.imagePreview.innerHTML = '';
        return;
    }
    
    DOM.imagePreview.innerHTML = state.images.map((image, index) => `
        <div class="preview-item" data-index="${index}">
            <img src="${image.data}" alt="Preview ${index + 1}" loading="lazy">
            <div class="preview-actions">
                <button class="btn-set-main" onclick="setAsMain(${index})" 
                        ${image.isMain ? 'disabled' : ''}>
                    ${image.isMain ? '✅ رئيسية' : '⭐ تعيين رئيسية'}
                </button>
                <button class="btn-remove" onclick="removeImage(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// تعيين صورة كرئيسية
function setAsMain(index) {
    state.images.forEach((img, i) => {
        img.isMain = i === index;
    });
    renderImagePreview();
}

// إزالة صورة
function removeImage(index) {
    state.images.splice(index, 1);
    if (state.images.length > 0) {
        state.images[0].isMain = true;
    }
    renderImagePreview();
}

// جلب الإحصائيات
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        if (response.ok) {
            state.stats = await response.json();
            updateStatsUI();
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        showAlert('خطأ في تحميل الإحصائيات', 'error');
    }
}

// تحديث واجهة الإحصائيات
function updateStatsUI() {
    DOM.totalProducts.querySelector('.stat-number').textContent = state.stats.totalProducts || 0;
    DOM.totalOrders.querySelector('.stat-number').textContent = state.stats.totalOrders || 0;
    DOM.totalSales.querySelector('.stat-number').textContent = (state.stats.totalSales || 0).toFixed(2);
}

// معالجة إضافة منتج
async function handleAddProduct(e) {
    e.preventDefault();
    
    if (state.images.length === 0) {
        showAlert('الرجاء إضافة صورة واحدة على الأقل', 'error');
        return;
    }
    
    const productData = {
        name: DOM.productName.value.trim(),
        price: parseFloat(DOM.productPrice.value),
        originalPrice: DOM.originalPrice.value ? parseFloat(DOM.originalPrice.value) : undefined,
        discount: parseInt(DOM.discount.value) || 0,
        category: DOM.category.value,
        stock: parseInt(DOM.stock.value),
        description: DOM.description.value.trim(),
        colors: [...state.colors],
        sizes: [...state.sizes],
        features: [...state.features],
        images: state.images.map(img => ({
            data: img.data,
            name: img.name,
            isMain: img.isMain
        }))
    };
    
    // التحقق من صحة البيانات
    if (!productData.name || productData.name.length < 3) {
        showAlert('اسم المنتج يجب أن يكون 3 أحرف على الأقل', 'error');
        return;
    }
    
    if (productData.price <= 0) {
        showAlert('السعر يجب أن يكون أكبر من صفر', 'error');
        return;
    }
    
    if (productData.stock < 0) {
        showAlert('الكمية يجب أن تكون 0 أو أكثر', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(productData)
        });
        
        if (response.ok) {
            const product = await response.json();
            showAlert('تم إضافة المنتج بنجاح', 'success');
            resetForm();
            await loadProducts();
            await loadStats();
            
            // تمرير إلى قسم المنتجات
            document.querySelector('.products-section').scrollIntoView({ behavior: 'smooth' });
        } else {
            const error = await response.json();
            showAlert(`خطأ: ${error.error || 'فشل إضافة المنتج'}`, 'error');
        }
    } catch (error) {
        console.error('Error adding product:', error);
        showAlert('خطأ في الاتصال بالخادم', 'error');
    }
}

// إعادة تعيين النموذج
function resetForm() {
    DOM.addProductForm.reset();
    state.colors = [];
    state.sizes = [];
    state.features = [];
    state.images = [];
    state.isEditing = false;
    state.editingProductId = null;
    
    renderTags('colors', DOM.colorsTags);
    renderTags('sizes', DOM.sizesTags);
    renderTags('features', DOM.featuresTags);
    renderImagePreview();
    
    // إعادة زر الإضافة
    const submitBtn = DOM.addProductForm.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-save"></i> إضافة المنتج';
    submitBtn.className = 'btn btn-primary btn-block';
}

// جلب المنتجات
async function loadProducts() {
    try {
        DOM.loadingProducts.style.display = 'flex';
        
        const response = await fetch('/api/products');
        if (response.ok) {
            state.products = await response.json();
            renderProducts();
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showAlert('خطأ في تحميل المنتجات', 'error');
    } finally {
        DOM.loadingProducts.style.display = 'none';
    }
}

// عرض المنتجات مع الصور المصغرة
function renderProducts() {
    const searchTerm = DOM.productSearch.value.toLowerCase();
    const category = DOM.categoryFilter.value;
    const stockFilter = DOM.stockFilter.value;
    const sortBy = DOM.sortProducts.value;
    
    let filteredProducts = [...state.products];
    
    // التصفية حسب البحث
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(product =>
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm) ||
            product.category.toLowerCase().includes(searchTerm) ||
            (product.colors && product.colors.some(color => color.toLowerCase().includes(searchTerm)))
        );
    }
    
    // التصفية حسب الفئة
    if (category) {
        filteredProducts = filteredProducts.filter(product => product.category === category);
    }
    
    // التصفية حسب الكمية
    if (stockFilter === 'in-stock') {
        filteredProducts = filteredProducts.filter(product => product.stock > 0);
    } else if (stockFilter === 'out-of-stock') {
        filteredProducts = filteredProducts.filter(product => product.stock === 0);
    } else if (stockFilter === 'low-stock') {
        filteredProducts = filteredProducts.filter(product => product.stock > 0 && product.stock <= 10);
    }
    
    // الترتيب
    switch (sortBy) {
        case 'name':
            filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'price-high':
            filteredProducts.sort((a, b) => b.price - a.price);
            break;
        case 'price-low':
            filteredProducts.sort((a, b) => a.price - b.price);
            break;
        case 'oldest':
            filteredProducts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
        case 'newest':
        default:
            filteredProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    DOM.productCount.textContent = filteredProducts.length;
    
    if (filteredProducts.length === 0) {
        DOM.productsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>لا توجد منتجات</h3>
                <p>${searchTerm || category || stockFilter ? 'جرب تغيير عوامل التصفية' : 'ابدأ بإضافة أول منتج'}</p>
            </div>
        `;
        return;
    }
    
    // عرض المنتجات مع الصور المصغرة
    DOM.productsContainer.innerHTML = filteredProducts.map(product => `
        <div class="product-card" data-id="${product._id}">
            <div class="product-header">
                ${product.discount > 0 ? 
                    `<span class="discount-badge"><i class="fas fa-percentage"></i> ${product.discount}%</span>` : ''
                }
                <span class="views-badge">
                    <i class="fas fa-eye"></i> ${product.views || 0}
                </span>
            </div>
            <div class="product-image" onclick="viewProductDetails('${product._id}')">
                ${getProductImage(product)}
            </div>
            <div class="product-info">
                <h3 class="product-title" onclick="viewProductDetails('${product._id}')">
                    ${product.name}
                </h3>
                <p class="product-description">${product.description.substring(0, 80)}${product.description.length > 80 ? '...' : ''}</p>
                <div class="product-price">
                    ${product.discount > 0 ? `
                        <span class="original-price">
                            ${(product.originalPrice || product.price).toFixed(2)} دج
                        </span>
                    ` : ''}
                    <span class="current-price">
                        ${calculateDiscountedPrice(product)} دج
                    </span>
                </div>
                <div class="product-meta">
                    <span class="product-category">${product.category}</span>
                    <span class="product-stock ${product.stock === 0 ? 'out-of-stock' : product.stock <= 10 ? 'low-stock' : ''}">
                        ${product.stock} وحدة
                    </span>
                </div>
                ${product.colors && product.colors.length > 0 ? `
                    <div class="product-tags">
                        ${product.colors.slice(0, 3).map(color => 
                            `<span class="tag" title="${color}">${color}</span>`
                        ).join('')}
                        ${product.colors.length > 3 ? 
                            `<span class="tag">+${product.colors.length - 3}</span>` : ''
                        }
                    </div>
                ` : ''}
                <div class="product-actions">
                    <button class="btn btn-secondary btn-sm" onclick="editProduct('${product._id}')" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteProduct('${product._id}')" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-info btn-sm" onclick="copyProductLink('${product.slug || product._id}')" title="نسخ الرابط">
                        <i class="fas fa-link"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// الحصول على صورة المنتج
function getProductImage(product) {
    if (product.mainImage) {
        return `<img src="${product.mainImage}" alt="${product.name}" loading="lazy">`;
    } else if (product.images && product.images.length > 0) {
        const mainImage = product.images.find(img => img.isMain) || product.images[0];
        return `<img src="${mainImage.data}" alt="${product.name}" loading="lazy">`;
    } else {
        return `<i class="fas fa-box" style="font-size: 3rem; color: #ccc;"></i>`;
    }
}

// حساب السعر بعد الخصم
function calculateDiscountedPrice(product) {
    if (product.discount > 0) {
        const price = product.originalPrice || product.price;
        return (price * (100 - product.discount) / 100).toFixed(2);
    }
    return product.price.toFixed(2);
}

// عرض تفاصيل المنتج
async function viewProductDetails(productId) {
    try {
        const response = await fetch(`/api/products/${productId}`);
        if (response.ok) {
            const product = await response.json();
            
            DOM.productFullDetails.innerHTML = `
                <div class="product-detail-content">
                    <div class="product-detail-header">
                        <h2>${product.name}</h2>
                        <div class="product-meta">
                            <span class="category">${product.category}</span>
                            <span class="views"><i class="fas fa-eye"></i> ${product.views || 0} مشاهدة</span>
                            <span class="stock ${product.stock === 0 ? 'out-of-stock' : ''}">
                                ${product.stock} وحدة متاحة
                            </span>
                        </div>
                    </div>
                    
                    <div class="product-detail-images">
                        ${product.images && product.images.length > 0 ? `
                            <div class="main-image" id="main-product-image">
                                <img src="${product.images.find(img => img.isMain)?.data || product.images[0].data}" 
                                     alt="${product.name}">
                            </div>
                            <div class="thumbnails">
                                ${product.images.map((img, index) => `
                                    <div class="thumbnail ${img.isMain ? 'active' : ''}" 
                                         onclick="changeDetailImage(this, '${img.data}')"
                                         title="صورة ${index + 1}">
                                        <img src="${img.data}" alt="Thumbnail ${index + 1}" loading="lazy">
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="no-image">
                                <i class="fas fa-image" style="font-size: 5rem; color: #ccc;"></i>
                                <p>لا توجد صور للمنتج</p>
                            </div>
                        `}
                    </div>
                    
                    <div class="product-detail-info">
                        <div class="price-section">
                            <div class="price">
                                ${product.discount > 0 ? `
                                    <span class="original-price">
                                        ${(product.originalPrice || product.price).toFixed(2)} دج
                                    </span>
                                ` : ''}
                                <span class="current-price">
                                    ${calculateDiscountedPrice(product)} دج
                                </span>
                                ${product.discount > 0 ? `
                                    <span class="discount-badge">${product.discount}% خصم</span>
                                ` : ''}
                            </div>
                            <div class="product-link">
                                <input type="text" id="product-link-input" 
                                       value="${window.location.origin}/product.html?product=${product.slug || product._id}" 
                                       readonly>
                                <button class="btn btn-sm" onclick="copyToClipboard('product-link-input')">
                                    <i class="fas fa-copy"></i> نسخ الرابط
                                </button>
                            </div>
                        </div>
                        
                        <div class="description-section">
                            <h3>وصف المنتج</h3>
                            <p>${product.description}</p>
                        </div>
                        
                        ${product.features && product.features.length > 0 ? `
                            <div class="features-section">
                                <h3>مميزات المنتج</h3>
                                <ul>
                                    ${product.features.map(feature => `
                                        <li><i class="fas fa-check"></i> ${feature}</li>
                                    `).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        
                        ${product.colors && product.colors.length > 0 ? `
                            <div class="colors-section">
                                <h3>الألوان المتاحة</h3>
                                <div class="colors-list">
                                    ${product.colors.map(color => `
                                        <span class="color-item">${color}</span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${product.sizes && product.sizes.length > 0 ? `
                            <div class="sizes-section">
                                <h3>المقاسات المتاحة</h3>
                                <div class="sizes-list">
                                    ${product.sizes.map(size => `
                                        <span class="size-item">${size}</span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="product-stats">
                            <div class="stat-item">
                                <i class="fas fa-box"></i>
                                <span>الكمية: ${product.stock}</span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-eye"></i>
                                <span>المشاهدات: ${product.views || 0}</span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-calendar"></i>
                                <span>أُضيف في: ${new Date(product.createdAt).toLocaleDateString('ar-SA')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            DOM.productDetailModal.style.display = 'block';
            
            // إضافة سحب للصور على الهواتف
            setupImageSwipe();
        }
    } catch (error) {
        console.error('Error loading product details:', error);
        showAlert('خطأ في تحميل تفاصيل المنتج', 'error');
    }
}

// تغيير الصورة في التفاصيل
function changeDetailImage(element, imageData) {
    const mainImage = document.getElementById('main-product-image');
    if (mainImage) {
        const img = mainImage.querySelector('img');
        img.src = imageData;
    }
    
    // تحديث حالة الصور المصغرة
    document.querySelectorAll('.thumbnail').forEach(thumb => {
        thumb.classList.remove('active');
    });
    element.classList.add('active');
}

// إعداد سحب الصور على الهواتف
function setupImageSwipe() {
    const mainImage = document.getElementById('main-product-image');
    if (!mainImage) return;
    
    let startX = 0;
    let currentIndex = 0;
    const thumbnails = document.querySelectorAll('.thumbnail');
    const thumbnailImages = Array.from(thumbnails).map(thumb => 
        thumb.querySelector('img').src
    );
    
    mainImage.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
    });
    
    mainImage.addEventListener('touchmove', (e) => {
        e.preventDefault();
    });
    
    mainImage.addEventListener('touchend', (e) => {
        const endX = e.changedTouches[0].clientX;
        const diffX = startX - endX;
        
        if (Math.abs(diffX) > 50) { // حد السحب
            if (diffX > 0 && currentIndex < thumbnailImages.length - 1) {
                // سحب لليسار - الصورة التالية
                currentIndex++;
            } else if (diffX < 0 && currentIndex > 0) {
                // سحب لليمين - الصورة السابقة
                currentIndex--;
            }
            
            const img = mainImage.querySelector('img');
            img.src = thumbnailImages[currentIndex];
            
            // تحديث الصورة المصغرة النشطة
            thumbnails.forEach((thumb, index) => {
                thumb.classList.toggle('active', index === currentIndex);
            });
        }
    });
}

// حذف منتج
async function deleteProduct(productId) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    
    try {
        const response = await fetch(`/api/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showAlert('تم حذف المنتج بنجاح', 'success');
            await loadProducts();
            await loadStats();
        } else {
            const error = await response.json();
            showAlert(`خطأ: ${error.error || 'فشل حذف المنتج'}`, 'error');
        }
    } catch (error) {
        showAlert('خطأ في حذف المنتج', 'error');
    }
}

// تعديل منتج
function editProduct(productId) {
    const product = state.products.find(p => p._id === productId);
    if (!product) {
        showAlert('المنتج غير موجود', 'error');
        return;
    }
    
    // ملء النموذج ببيانات المنتج
    DOM.productName.value = product.name;
    DOM.productPrice.value = product.price;
    DOM.originalPrice.value = product.originalPrice || '';
    DOM.discount.value = product.discount || 0;
    DOM.category.value = product.category;
    DOM.stock.value = product.stock;
    DOM.description.value = product.description;
    
    state.colors = product.colors || [];
    state.sizes = product.sizes || [];
    state.features = product.features || [];
    state.images = product.images || [];
    state.isEditing = true;
    state.editingProductId = productId;
    
    renderTags('colors', DOM.colorsTags);
    renderTags('sizes', DOM.sizesTags);
    renderTags('features', DOM.featuresTags);
    renderImagePreview();
    
    // تغيير زر الإضافة إلى تحديث
    const submitBtn = DOM.addProductForm.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-save"></i> تحديث المنتج';
    submitBtn.className = 'btn btn-warning btn-block';
    
    // تمرير إلى قسم المنتجات
    document.querySelector('.add-product-section').scrollIntoView({ behavior: 'smooth' });
}

// تحديث منتج
async function updateProduct(productId) {
    const productData = {
        name: DOM.productName.value.trim(),
        price: parseFloat(DOM.productPrice.value),
        originalPrice: DOM.originalPrice.value ? parseFloat(DOM.originalPrice.value) : undefined,
        discount: parseInt(DOM.discount.value) || 0,
        category: DOM.category.value,
        stock: parseInt(DOM.stock.value),
        description: DOM.description.value.trim(),
        colors: [...state.colors],
        sizes: [...state.sizes],
        features: [...state.features],
        images: state.images.map(img => ({
            data: img.data,
            name: img.name,
            isMain: img.isMain
        }))
    };
    
    try {
        const response = await fetch(`/api/products/${productId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(productData)
        });
        
        if (response.ok) {
            showAlert('تم تحديث المنتج بنجاح', 'success');
            resetForm();
            await loadProducts();
            await loadStats();
        } else {
            const error = await response.json();
            showAlert(`خطأ: ${error.error || 'فشل تحديث المنتج'}`, 'error');
        }
    } catch (error) {
        showAlert('خطأ في تحديث المنتج', 'error');
    }
}

// تحميل الطلبات
async function loadOrders() {
    try {
        const response = await fetch('/api/orders');
        if (response.ok) {
            state.orders = await response.json();
            renderOrders();
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        showAlert('خطأ في تحميل الطلبات', 'error');
    }
}

// عرض الطلبات مع أزرار الحالة
function renderOrders() {
    const statusFilter = DOM.statusFilter.value;
    const dateFilter = DOM.dateFilter.value;
    const searchTerm = DOM.orderSearch.value.toLowerCase();
    
    let filteredOrders = state.orders;
    
    // التصفية حسب الحالة
    if (statusFilter) {
        filteredOrders = filteredOrders.filter(order => order.status === statusFilter);
    }
    
    // التصفية حسب التاريخ
    if (dateFilter) {
        const filterDate = new Date(dateFilter);
        filteredOrders = filteredOrders.filter(order => {
            const orderDate = new Date(order.createdAt);
            return orderDate.toDateString() === filterDate.toDateString();
        });
    }
    
    // التصفية حسب البحث
    if (searchTerm) {
        filteredOrders = filteredOrders.filter(order => 
            order.orderId.toLowerCase().includes(searchTerm) ||
            order.customer.fullName.toLowerCase().includes(searchTerm) ||
            order.customer.phone.includes(searchTerm) ||
            order.customer.wilaya.toLowerCase().includes(searchTerm)
        );
    }
    
    DOM.orderCount.textContent = filteredOrders.length;
    
    if (filteredOrders.length === 0) {
        DOM.ordersContainer.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state-cell">
                    <div class="empty-state">
                        <i class="fas fa-shopping-cart"></i>
                        <h3>لا توجد طلبات</h3>
                        <p>${searchTerm || statusFilter || dateFilter ? 'جرب تغيير عوامل التصفية' : 'لم يتم استلام أي طلبات بعد'}</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    DOM.ordersContainer.innerHTML = filteredOrders.map(order => `
        <tr>
            <td>
                <strong>${order.orderId}</strong>
                <br>
                <small class="text-muted">${new Date(order.createdAt).toLocaleDateString('ar-SA')}</small>
            </td>
            <td>
                <div class="customer-info">
                    <strong>${order.customer.fullName}</strong>
                    <div class="customer-details">
                        <span><i class="fas fa-phone"></i> ${order.customer.phone}</span>
                        <br>
                        <span><i class="fas fa-map-marker-alt"></i> ${order.customer.wilaya}</span>
                    </div>
                </div>
            </td>
            <td>
                <div class="order-products-summary">
                    ${order.products.slice(0, 2).map(item => `
                        <div class="product-summary">
                            <span class="quantity">${item.quantity}x</span>
                            <span class="product-name">${item.productId?.name || 'منتج محذوف'}</span>
                        </div>
                    `).join('')}
                    ${order.products.length > 2 ? `
                        <div class="more-products">
                            +${order.products.length - 2} منتجات أخرى
                        </div>
                    ` : ''}
                </div>
            </td>
            <td>
                <strong>${order.total.toFixed(2)} دج</strong>
                <br>
                <small class="text-muted">شامل التوصيل: ${order.shipping} دج</small>
            </td>
            <td>
                <div class="status-buttons" data-order-id="${order._id}">
                    <button class="status-btn ${getStatusClass('pending')} ${order.status === 'pending' ? 'active' : ''}" 
                            onclick="updateOrderStatus('${order._id}', 'pending')" 
                            title="قيد الانتظار">
                        <i class="fas fa-clock"></i>
                        <span class="status-text">قيد الانتظار</span>
                    </button>
                    <button class="status-btn ${getStatusClass('confirmed')} ${order.status === 'confirmed' ? 'active' : ''}" 
                            onclick="updateOrderStatus('${order._id}', 'confirmed')" 
                            title="مؤكد">
                        <i class="fas fa-check-circle"></i>
                        <span class="status-text">مؤكد</span>
                    </button>
                    <button class="status-btn ${getStatusClass('shipped')} ${order.status === 'shipped' ? 'active' : ''}" 
                            onclick="updateOrderStatus('${order._id}', 'shipped')" 
                            title="مرسل">
                        <i class="fas fa-shipping-fast"></i>
                        <span class="status-text">مرسل</span>
                    </button>
                    <button class="status-btn ${getStatusClass('delivered')} ${order.status === 'delivered' ? 'active' : ''}" 
                            onclick="updateOrderStatus('${order._id}', 'delivered')" 
                            title="مستلم">
                        <i class="fas fa-box-open"></i>
                        <span class="status-text">مستلم</span>
                    </button>
                    <button class="status-btn ${getStatusClass('cancelled')} ${order.status === 'cancelled' ? 'active' : ''}" 
                            onclick="updateOrderStatus('${order._id}', 'cancelled')" 
                            title="ملغي">
                        <i class="fas fa-times-circle"></i>
                        <span class="status-text">ملغي</span>
                    </button>
                </div>
            </td>
            <td>${new Date(order.createdAt).toLocaleDateString('ar-SA')}</td>
            <td>
                <div class="order-actions">
                    <button class="btn btn-secondary btn-sm" onclick="viewOrderDetails('${order._id}')" title="عرض التفاصيل">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="printShippingForOrder('${order._id}')" title="طباعة ورقة التوصيل">
                        <i class="fas fa-print"></i>
                    </button>
                    <button class="btn btn-info btn-sm" onclick="contactCustomer('${order.customer.phone}')" title="الاتصال بالعميل">
                        <i class="fas fa-phone"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// الحصول على فئة الحالة
function getStatusClass(status) {
    const classMap = {
        'pending': 'pending',
        'confirmed': 'confirmed',
        'shipped': 'shipped',
        'delivered': 'delivered',
        'cancelled': 'cancelled',
        'returned': 'returned'
    };
    return classMap[status] || 'pending';
}

// الحصول على نص الحالة
function getStatusText(status) {
    const statusMap = {
        'pending': 'قيد الانتظار',
        'confirmed': 'مؤكد',
        'shipped': 'مرسل',
        'delivered': 'مستلم',
        'cancelled': 'ملغي',
        'returned': 'معاد'
    };
    return statusMap[status] || status;
}

// تحديث حالة الطلب
async function updateOrderStatus(orderId, status) {
    try {
        const response = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            showAlert(`تم تغيير حالة الطلب إلى "${getStatusText(status)}"`, 'success');
            await loadOrders();
        } else {
            const error = await response.json();
            showAlert(`خطأ: ${error.error || 'فشل تحديث حالة الطلب'}`, 'error');
        }
    } catch (error) {
        showAlert('خطأ في تحديث حالة الطلب', 'error');
    }
}

// عرض تفاصيل الطلب
async function viewOrderDetails(orderId) {
    const order = state.orders.find(o => o._id === orderId);
    if (!order) {
        showAlert('الطلب غير موجود', 'error');
        return;
    }
    
    DOM.orderDetails.innerHTML = `
        <div class="order-details-content">
            <div class="order-header">
                <h3>طلب #${order.orderId}</h3>
                <div class="order-status-info">
                    <span class="status-badge status-${order.status}">
                        ${getStatusText(order.status)}
                    </span>
                    <span class="order-date">
                        ${new Date(order.createdAt).toLocaleString('ar-SA')}
                    </span>
                </div>
            </div>
            
            <div class="order-info-grid">
                <div class="info-section">
                    <h4><i class="fas fa-user"></i> معلومات العميل</h4>
                    <div class="info-item">
                        <strong>الاسم:</strong> ${order.customer.fullName}
                    </div>
                    <div class="info-item">
                        <strong>الهاتف:</strong> 
                        <a href="tel:${order.customer.phone}" class="phone-link">
                            ${order.customer.phone}
                        </a>
                    </div>
                    <div class="info-item">
                        <strong>الولاية:</strong> ${order.customer.wilaya}
                    </div>
                    <div class="info-item">
                        <strong>العنوان:</strong> ${order.customer.address}
                    </div>
                    ${order.customer.email ? `
                        <div class="info-item">
                            <strong>البريد:</strong> ${order.customer.email}
                        </div>
                    ` : ''}
                    ${order.customer.notes ? `
                        <div class="info-item">
                            <strong>ملاحظات:</strong> ${order.customer.notes}
                        </div>
                    ` : ''}
                </div>
                
                <div class="info-section">
                    <h4><i class="fas fa-receipt"></i> معلومات الطلب</h4>
                    <div class="info-item">
                        <strong>رقم الطلب:</strong> ${order.orderId}
                    </div>
                    <div class="info-item">
                        <strong>تاريخ الطلب:</strong> ${new Date(order.createdAt).toLocaleString('ar-SA')}
                    </div>
                    <div class="info-item">
                        <strong>طريقة الدفع:</strong> الدفع عند الاستلام
                    </div>
                    <div class="info-item">
                        <strong>سعر التوصيل:</strong> ${order.shipping} دج
                    </div>
                    <div class="info-item">
                        <strong>الحالة الحالية:</strong> 
                        <span class="status-badge status-${order.status}">
                            ${getStatusText(order.status)}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="order-products">
                <h4><i class="fas fa-shopping-bag"></i> المنتجات (${order.products.length})</h4>
                <table class="products-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>المنتج</th>
                            <th>الكمية</th>
                            <th>اللون</th>
                            <th>المقاس</th>
                            <th>السعر</th>
                            <th>المجموع</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.products.map((item, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>
                                    <div class="product-item">
                                        <div class="product-image-mini">
                                            ${item.productId?.mainImage ? 
                                                `<img src="${item.productId.mainImage}" alt="${item.productId.name}" loading="lazy">` :
                                                `<i class="fas fa-box"></i>`
                                            }
                                        </div>
                                        <div class="product-name">${item.productId?.name || 'منتج محذوف'}</div>
                                    </div>
                                </td>
                                <td>${item.quantity}</td>
                                <td>${item.color || '-'}</td>
                                <td>${item.size || '-'}</td>
                                <td>${item.price} دج</td>
                                <td><strong>${(item.price * item.quantity).toFixed(2)} دج</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="order-summary">
                <h4><i class="fas fa-calculator"></i> ملخص الفاتورة</h4>
                <div class="summary-grid">
                    <div class="summary-item">
                        <span>المجموع الفرعي:</span>
                        <span>${order.subtotal.toFixed(2)} دج</span>
                    </div>
                    <div class="summary-item">
                        <span>التوصيل:</span>
                        <span>${order.shipping} دج</span>
                    </div>
                    <div class="summary-item total">
                        <span>المجموع الكلي:</span>
                        <span><strong>${order.total.toFixed(2)} دج</strong></span>
                    </div>
                </div>
            </div>
            
            <div class="order-actions-footer">
                <button class="btn btn-primary" onclick="printOrder('${order._id}')">
                    <i class="fas fa-print"></i> طباعة الفاتورة
                </button>
                <button class="btn btn-secondary" onclick="printShippingForOrder('${order._id}')">
                    <i class="fas fa-truck"></i> طباعة ورقة التوصيل
                </button>
                <button class="btn btn-info" onclick="contactCustomer('${order.customer.phone}')">
                    <i class="fas fa-phone"></i> الاتصال بالعميل
                </button>
            </div>
        </div>
    `;
    
    DOM.orderModal.style.display = 'block';
}

// طباعة الطلب
function printOrder(orderId) {
    const printWindow = window.open('', '_blank');
    const order = state.orders.find(o => o._id === orderId);
    
    if (!order) {
        showAlert('الطلب غير موجود', 'error');
        return;
    }
    
    const printContent = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>فاتورة الطلب #${order.orderId}</title>
            <style>
                body {
                    font-family: 'Cairo', Arial, sans-serif;
                    direction: rtl;
                    margin: 0;
                    padding: 20px;
                    color: #333;
                }
                .invoice-header {
                    text-align: center;
                    border-bottom: 3px solid #2c3e50;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .invoice-header h1 {
                    color: #2c3e50;
                    margin: 0 0 10px 0;
                }
                .invoice-info {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 20px;
                    margin-bottom: 30px;
                }
                .info-section {
                    border: 1px solid #ddd;
                    padding: 15px;
                    border-radius: 8px;
                }
                .info-section h3 {
                    color: #3498db;
                    margin-top: 0;
                    border-bottom: 2px solid #3498db;
                    padding-bottom: 5px;
                }
                .products-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }
                .products-table th {
                    background: #f8f9fa;
                    padding: 10px;
                    border: 1px solid #ddd;
                    text-align: center;
                }
                .products-table td {
                    padding: 8px;
                    border: 1px solid #ddd;
                    text-align: center;
                }
                .summary {
                    margin-top: 30px;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 8px;
                }
                .summary-item {
                    display: flex;
                    justify-content: space-between;
                    margin: 10px 0;
                }
                .summary-item.total {
                    border-top: 2px solid #2c3e50;
                    padding-top: 15px;
                    font-weight: bold;
                    font-size: 1.2em;
                }
                @media print {
                    body {
                        padding: 0;
                    }
                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="invoice-header">
                <h1>فاتورة الطلب #${order.orderId}</h1>
                <p>تاريخ الطلب: ${new Date(order.createdAt).toLocaleString('ar-SA')}</p>
                <p>حالة الطلب: ${getStatusText(order.status)}</p>
            </div>
            
            <div class="invoice-info">
                <div class="info-section">
                    <h3>معلومات العميل</h3>
                    <p><strong>الاسم:</strong> ${order.customer.fullName}</p>
                    <p><strong>الهاتف:</strong> ${order.customer.phone}</p>
                    <p><strong>الولاية:</strong> ${order.customer.wilaya}</p>
                    <p><strong>العنوان:</strong> ${order.customer.address}</p>
                    ${order.customer.email ? `<p><strong>البريد:</strong> ${order.customer.email}</p>` : ''}
                </div>
                
                <div class="info-section">
                    <h3>معلومات المتجر</h3>
                    <p><strong>اسم المتجر:</strong> المتجر الإلكتروني</p>
                    <p><strong>رقم الهاتف:</strong> 0550-000-000</p>
                    <p><strong>طريقة الدفع:</strong> الدفع عند الاستلام</p>
                    <p><strong>سعر التوصيل:</strong> ${order.shipping} دج</p>
                </div>
            </div>
            
            <h3>تفاصيل المنتجات</h3>
            <table class="products-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>المنتج</th>
                        <th>الكمية</th>
                        <th>السعر</th>
                        <th>المجموع</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.products.map((item, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${item.productId?.name || 'منتج محذوف'}</td>
                            <td>${item.quantity}</td>
                            <td>${item.price} دج</td>
                            <td>${(item.price * item.quantity).toFixed(2)} دج</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="summary">
                <div class="summary-item">
                    <span>المجموع الفرعي:</span>
                    <span>${order.subtotal.toFixed(2)} دج</span>
                </div>
                <div class="summary-item">
                    <span>التوصيل:</span>
                    <span>${order.shipping} دج</span>
                </div>
                <div class="summary-item total">
                    <span>المجموع الكلي:</span>
                    <span>${order.total.toFixed(2)} دج</span>
                </div>
            </div>
            
            <div style="margin-top: 40px; text-align: center; padding-top: 20px; border-top: 1px dashed #000;">
                <p>شكراً لثقتك بنا</p>
                <p>للشكاوى والاستفسارات: 0550-000-000</p>
                <div style="margin-top: 30px;">
                    <div style="border-bottom: 1px solid #000; width: 200px; height: 30px; margin: 0 auto;"></div>
                    <p>توقيع العميل</p>
                </div>
            </div>
            
            <div class="no-print" style="margin-top: 20px; text-align: center;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    طباعة الفاتورة
                </button>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
}

// طباعة ورقة التوصيل لطلب محدد
function printShippingForOrder(orderId) {
    const order = state.orders.find(o => o._id === orderId);
    if (!order) {
        showAlert('الطلب غير موجود', 'error');
        return;
    }
    
    DOM.shippingContent.innerHTML = `
        <div class="shipping-header">
            <h3>ورقة توصيل الطلب #${order.orderId}</h3>
            <p>تاريخ الطلب: ${new Date(order.createdAt).toLocaleDateString('ar-SA')}</p>
        </div>
        
        <div class="shipping-info">
            <div class="info-grid">
                <div class="info-item">
                    <h4>معلومات العميل</h4>
                    <p><strong>الاسم:</strong> ${order.customer.fullName}</p>
                    <p><strong>الهاتف:</strong> ${order.customer.phone}</p>
                    <p><strong>الولاية:</strong> ${order.customer.wilaya}</p>
                    <p><strong>العنوان:</strong> ${order.customer.address}</p>
                </div>
                
                <div class="info-item">
                    <h4>معلومات الطلب</h4>
                    <p><strong>رقم الطلب:</strong> ${order.orderId}</p>
                    <p><strong>التاريخ:</strong> ${new Date(order.createdAt).toLocaleDateString('ar-SA')}</p>
                    <p><strong>الوقت:</strong> ${new Date(order.createdAt).toLocaleTimeString('ar-SA')}</p>
                    <p><strong>سعر التوصيل:</strong> ${order.shipping} دج</p>
                </div>
                
                <div class="info-item">
                    <h4>معلومات التوصيل</h4>
                    <p><strong>نوع الشحنة:</strong> طرد</p>
                    <p><strong>وزن مقدر:</strong> 1-2 كجم</p>
                    <p><strong>الحجم:</strong> صغير/متوسط</p>
                    <p><strong>المحتوى:</strong> بضاعة تجارية</p>
                </div>
            </div>
        </div>
        
        <div class="shipping-products">
            <h4>المنتجات المطلوبة</h4>
            <table class="shipping-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>المنتج</th>
                        <th>الكمية</th>
                        <th>ملاحظات</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.products.map((item, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${item.productId?.name || 'منتج محذوف'}</td>
                            <td>${item.quantity}</td>
                            <td>${item.color ? `اللون: ${item.color}` : ''} ${item.size ? `المقاس: ${item.size}` : ''}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="shipping-instructions">
            <h4>تعليمات التوصيل</h4>
            <ol>
                <li>التأكد من هوية المستلم قبل تسليم الطرد</li>
                <li>التحقق من رقم الهاتف قبل التسليم</li>
                <li>تسليم الطرد للعميل شخصياً فقط</li>
                <li>الحصول على توقيع العميل عند الاستلام</li>
                <li>في حالة عدم التمكن من التسليم، التواصل مع العميل مباشرة</li>
            </ol>
        </div>
        
        <div class="shipping-totals">
            <div class="total-item">
                <span>عدد المنتجات:</span>
                <span>${order.products.length}</span>
            </div>
            <div class="total-item">
                <span>إجمالي القيمة:</span>
                <span>${order.total.toFixed(2)} دج</span>
            </div>
        </div>
        
        <div class="shipping-signature">
            <h4>إيصال الاستلام</h4>
            <p>أقر بأنني استلمت الطرد بالكامل وبحالة جيدة</p>
            <div class="signature-line"></div>
            <p>اسم المستلم: _____________________</p>
            <p>التاريخ: _____________________</p>
            <p>التوقيع: _____________________</p>
            <div style="margin-top: 30px;">
                <p><strong>ملاحظات الموصل:</strong></p>
                <div class="notes-area"></div>
            </div>
        </div>
    `;
    
    DOM.shippingModal.style.display = 'block';
}

// طباعة ورقة التوصيل
function printShipping() {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(DOM.shippingContent.innerHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
    }, 500);
}

// طباعة تقرير الشحن
function printShippingReport() {
    const pendingOrders = state.orders.filter(order => order.status === 'pending' || order.status === 'confirmed');
    
    if (pendingOrders.length === 0) {
        showAlert('لا توجد طلبات جاهزة للشحن', 'warning');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    const printContent = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>تقرير الشحن - ${new Date().toLocaleDateString('ar-SA')}</title>
            <style>
                body {
                    font-family: 'Cairo', Arial, sans-serif;
                    direction: rtl;
                    margin: 0;
                    padding: 20px;
                }
                .report-header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 3px solid #2c3e50;
                    padding-bottom: 20px;
                }
                .report-header h1 {
                    color: #2c3e50;
                    margin: 0 0 10px 0;
                }
                .orders-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }
                .orders-table th {
                    background: #f8f9fa;
                    padding: 10px;
                    border: 1px solid #ddd;
                    text-align: center;
                }
                .orders-table td {
                    padding: 8px;
                    border: 1px solid #ddd;
                    text-align: center;
                }
                .summary {
                    margin-top: 30px;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 8px;
                }
                @media print {
                    body {
                        padding: 0;
                    }
                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="report-header">
                <h1>تقرير الشحن</h1>
                <p>تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}</p>
                <p>عدد الطلبات: ${pendingOrders.length}</p>
            </div>
            
            <h3>قائمة الطلبات الجاهزة للشحن</h3>
            <table class="orders-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>رقم الطلب</th>
                        <th>العميل</th>
                        <th>الهاتف</th>
                        <th>الولاية</th>
                        <th>العنوان</th>
                        <th>المبلغ</th>
                        <th>الحالة</th>
                    </tr>
                </thead>
                <tbody>
                    ${pendingOrders.map((order, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${order.orderId}</td>
                            <td>${order.customer.fullName}</td>
                            <td>${order.customer.phone}</td>
                            <td>${order.customer.wilaya}</td>
                            <td>${order.customer.address}</td>
                            <td>${order.total.toFixed(2)} دج</td>
                            <td>${getStatusText(order.status)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="summary">
                <h4>ملخص التقرير</h4>
                <p><strong>إجمالي عدد الطلبات:</strong> ${pendingOrders.length}</p>
                <p><strong>إجمالي المبلغ:</strong> ${pendingOrders.reduce((sum, order) => sum + order.total, 0).toFixed(2)} دج</p>
                <p><strong>الطلبات قيد الانتظار:</strong> ${pendingOrders.filter(o => o.status === 'pending').length}</p>
                <p><strong>الطلبات المؤكدة:</strong> ${pendingOrders.filter(o => o.status === 'confirmed').length}</p>
            </div>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px dashed #000;">
                <div style="border-bottom: 1px solid #000; width: 200px; height: 30px; margin: 0 auto 20px auto;"></div>
                <p style="text-align: center;">توقيع المسؤول عن الشحن</p>
                <p style="text-align: center; margin-top: 30px;">تاريخ الإعداد: ${new Date().toLocaleDateString('ar-SA')}</p>
            </div>
            
            <div class="no-print" style="margin-top: 20px; text-align: center;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    طباعة التقرير
                </button>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
}

// الاتصال بالعميل
function contactCustomer(phoneNumber) {
    if (confirm(`هل تريد الاتصال بالرقم ${phoneNumber}؟`)) {
        window.location.href = `tel:${phoneNumber}`;
    }
}

// تصدير المنتجات
function exportProducts() {
    const data = state.products.map(product => ({
        'اسم المنتج': product.name,
        'الفئة': product.category,
        'السعر': product.price,
        'الكمية': product.stock,
        'الخصم': product.discount,
        'المشاهدات': product.views || 0,
        'تاريخ الإضافة': new Date(product.createdAt).toLocaleDateString('ar-SA')
    }));
    
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, 'المنتجات.csv');
    } else {
        link.href = URL.createObjectURL(blob);
        link.download = 'المنتجات.csv';
        link.click();
    }
}

// تحويل البيانات إلى CSV
function convertToCSV(data) {
    const headers = Object.keys(data[0] || {});
    const rows = data.map(row => 
        headers.map(header => 
            JSON.stringify(row[header] || '')
        ).join(',')
    );
    
    return [headers.join(','), ...rows].join('\n');
}

// فلترة المنتجات
function filterProducts() {
    renderProducts();
}

// فلترة الطلبات
function filterOrders() {
    renderOrders();
}

// تحسينات للهواتف
function setupMobileOptimizations() {
    // إصلاح ارتفاع viewport للهواتف
    function setViewportHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);
    
    // تحسين تجربة اللمس
    document.addEventListener('touchstart', () => {}, { passive: true });
    
    // إضافة تأثيرات للمس
    document.querySelectorAll('.btn, .product-card, .status-btn').forEach(el => {
        el.addEventListener('touchstart', () => {
            el.classList.add('touch-active');
        });
        
        el.addEventListener('touchend', () => {
            setTimeout(() => {
                el.classList.remove('touch-active');
            }, 150);
        });
    });
    
    // منع التكبير في حقول الإدخال على الهواتف
    document.querySelectorAll('input, textarea, select').forEach(el => {
        el.addEventListener('focus', () => {
            setTimeout(() => {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });
    });
}

// عرض تنبيه
function showAlert(message, type) {
    // إزالة التنبيهات السابقة
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <i class="fas fa-${getAlertIcon(type)}"></i>
        <span>${message}</span>
        <button class="alert-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

// الحصول على أيقونة التنبيه
function getAlertIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// التحديث التلقائي
function startAutoRefresh() {
    setInterval(async () => {
        await loadOrders();
        await loadStats();
        updateCurrentDate();
    }, 60000); // كل دقيقة
}

// وظيفة debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// نسخ إلى الحافظة
function copyToClipboard(inputId) {
    const input = document.getElementById(inputId);
    input.select();
    input.setSelectionRange(0, 99999);
    
    try {
        navigator.clipboard.writeText(input.value);
        showAlert('تم نسخ الرابط إلى الحافظة', 'success');
    } catch (err) {
        document.execCommand('copy');
        showAlert('تم نسخ الرابط إلى الحافظة', 'success');
    }
}

// نسخ رابط المنتج
function copyProductLink(productId) {
    const link = `${window.location.origin}/product.html?product=${productId}`;
    navigator.clipboard.writeText(link).then(() => {
        showAlert('تم نسخ رابط المنتج', 'success');
    }).catch(err => {
        const tempInput = document.createElement('input');
        tempInput.value = link;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        showAlert('تم نسخ رابط المنتج', 'success');
    });
}

// تحديث الطلبات
async function refreshOrders() {
    await loadOrders();
    showAlert('تم تحديث الطلبات', 'success');
}

// تبديل عرض القسم
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const content = section.querySelector('.section-content');
    const icon = section.querySelector('.fa-chevron-up');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.className = 'fas fa-chevron-up';
    } else {
        content.style.display = 'none';
        icon.className = 'fas fa-chevron-down';
    }
}

// تشغيل التطبيق
document.addEventListener('DOMContentLoaded', init);