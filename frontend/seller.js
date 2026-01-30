// حالة التطبيق
const state = {
    products: [],
    orders: [],
    colors: [],
    sizes: [],
    features: [],
    images: [],
    stats: {},
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
    statsContainer: document.getElementById('stats-container'),
    
    // البحث
    productSearch: document.getElementById('product-search'),
    orderSearch: document.getElementById('order-search'),
    
    // الإحصائيات
    totalProducts: document.getElementById('total-products'),
    totalOrders: document.getElementById('total-orders'),
    totalSales: document.getElementById('total-sales')
};

// تهيئة التطبيق
async function init() {
    setupEventListeners();
    setupMobileOptimizations();
    await loadStats();
    await loadProducts();
    await loadOrders();
    
    // إضافة تأثيرات اللمس
    document.querySelectorAll('.btn, .nav-item, .product-card').forEach(el => {
        el.classList.add('touch-feedback');
    });
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
    
    // البحث
    DOM.productSearch.addEventListener('input', debounce(filterProducts, 300));
    DOM.orderSearch.addEventListener('input', debounce(filterOrders, 300));
    
    // منع إعادة تحميل الصفحة عند سحب للأسفل على الهواتف
    let startY;
    document.addEventListener('touchstart', e => {
        startY = e.touches[0].clientY;
    }, { passive: true });
    
    document.addEventListener('touchmove', e => {
        if (window.scrollY === 0 && e.touches[0].clientY > startY) {
            e.preventDefault();
        }
    }, { passive: false });
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
                inputElement.focus();
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
                inputElement.focus();
            }
        }
    });
}

// عرض العلامات
function renderTags(type, container) {
    container.innerHTML = state[type].map((tag, index) => `
        <div class="tag">
            ${tag}
            <span class="tag-remove" onclick="removeTag('${type}', ${index})">×</span>
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
        
        if (state.images.length >= 10) {
            showAlert('يمكنك رفع 10 صور كحد أقصى', 'warning');
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
    
    DOM.imageInput.value = '';
}

// عرض معاينة الصور
function renderImagePreview() {
    if (state.images.length === 0) {
        DOM.imagePreview.innerHTML = '';
        return;
    }
    
    DOM.imagePreview.innerHTML = state.images.map((image, index) => `
        <div class="preview-item">
            <img src="${image.data}" alt="Preview ${index + 1}" loading="lazy">
            <div class="preview-actions">
                <button class="preview-btn set-main" onclick="setAsMain(${index})">
                    <i class="fas ${image.isMain ? 'fa-check' : 'fa-star'}"></i>
                </button>
                <button class="preview-btn remove" onclick="removeImage(${index})">
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
    if (state.images.length > 0 && !state.images.some(img => img.isMain)) {
        state.images[0].isMain = true;
    }
    renderImagePreview();
}

// جلب الإحصائيات
async function loadStats() {
    try {
        const response = await fetch('/api/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
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
    DOM.totalProducts.textContent = state.stats.totalProducts || 0;
    DOM.totalOrders.textContent = state.stats.totalOrders || 0;
    DOM.totalSales.textContent = (state.stats.totalSales || 0).toFixed(2);
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
            
            // الانتقال إلى قسم المنتجات
            showSection('products-section', document.querySelector('.nav-item:nth-child(1)'));
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
}

// جلب المنتجات
async function loadProducts() {
    try {
        showLoading('products-container');
        
        const response = await fetch('/api/products', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            state.products = await response.json();
            renderProducts();
        } else {
            showEmptyState('products-container', 'لا توجد منتجات', 'ابدأ بإضافة أول منتج');
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showAlert('خطأ في تحميل المنتجات', 'error');
        showEmptyState('products-container', 'خطأ في التحميل', 'حاول مرة أخرى');
    }
}

// عرض المنتجات
function renderProducts() {
    const searchTerm = DOM.productSearch.value.toLowerCase();
    
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
    
    if (filteredProducts.length === 0) {
        showEmptyState('products-container', 
            'لا توجد منتجات', 
            searchTerm ? 'جرب تغيير كلمة البحث' : 'ابدأ بإضافة أول منتج'
        );
        return;
    }
    
    DOM.productsContainer.innerHTML = filteredProducts.map(product => `
        <div class="product-card" data-id="${product._id}">
            <div class="product-image" onclick="viewProductDetails('${product._id}')">
                ${getProductImage(product)}
                <div class="product-badges">
                    ${product.discount > 0 ? `
                        <div class="badge discount">
                            <i class="fas fa-percentage"></i>
                            ${product.discount}%
                        </div>
                    ` : ''}
                    <div class="badge stock ${getStockClass(product.stock)}">
                        <i class="fas fa-box"></i>
                        ${product.stock} وحدة
                    </div>
                </div>
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-description">${product.description.substring(0, 60)}${product.description.length > 60 ? '...' : ''}</p>
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
                    <span class="category-tag">${product.category}</span>
                    <span class="stock-status ${getStockClass(product.stock)}">
                        <i class="fas ${getStockIcon(product.stock)}"></i>
                        ${getStockText(product.stock)}
                    </span>
                </div>
                <div class="product-actions">
                    <button class="btn btn-primary btn-sm" onclick="editProduct('${product._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteProduct('${product._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-success btn-sm" onclick="copyProductLink('${product.slug || product._id}')">
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
        return `<i class="fas fa-box" style="font-size: 3rem; color: rgba(255,255,255,0.8);"></i>`;
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

// الحصول على فئة الكمية
function getStockClass(stock) {
    if (stock === 0) return 'out-stock';
    if (stock <= 10) return 'low-stock';
    return 'in-stock';
}

// الحصول على أيقونة الكمية
function getStockIcon(stock) {
    if (stock === 0) return 'fa-times-circle';
    if (stock <= 10) return 'fa-exclamation-circle';
    return 'fa-check-circle';
}

// الحصول على نص الكمية
function getStockText(stock) {
    if (stock === 0) return 'نفذ';
    if (stock <= 10) return 'قليل';
    return 'متوفر';
}

// عرض تفاصيل المنتج
async function viewProductDetails(productId) {
    try {
        const response = await fetch(`/api/products/${productId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const product = await response.json();
            
            DOM.productFullDetails.innerHTML = `
                <div style="display: grid; gap: 25px;">
                    <div>
                        <h3 style="font-size: 1.3rem; margin-bottom: 10px; color: var(--dark);">${product.name}</h3>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <span class="category-tag">${product.category}</span>
                            <span class="stock-status ${getStockClass(product.stock)}">
                                <i class="fas ${getStockIcon(product.stock)}"></i>
                                ${product.stock} وحدة
                            </span>
                            <span style="background: rgba(67, 97, 238, 0.1); color: var(--primary); padding: 6px 12px; border-radius: 20px; font-size: 0.9rem; font-weight: 600;">
                                <i class="fas fa-eye"></i> ${product.views || 0}
                            </span>
                        </div>
                    </div>
                    
                    ${product.images && product.images.length > 0 ? `
                        <div style="border-radius: 15px; overflow: hidden; background: #f8fafc; padding: 20px;">
                            <div style="position: relative; height: 250px; margin-bottom: 15px;">
                                <img src="${product.images.find(img => img.isMain)?.data || product.images[0].data}" 
                                     alt="${product.name}"
                                     style="width: 100%; height: 100%; object-fit: contain;">
                            </div>
                            <div style="display: flex; gap: 10px; overflow-x: auto; padding: 10px 0;">
                                ${product.images.map((img, index) => `
                                    <img src="${img.data}" 
                                         alt="صورة ${index + 1}"
                                         style="width: 80px; height: 80px; object-fit: cover; border-radius: 10px; cursor: pointer; border: 2px solid ${img.isMain ? 'var(--primary)' : 'transparent'}"
                                         onclick="changeDetailImage(this, '${img.data}')">
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div style="display: grid; gap: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #f8fafc, #e2e8f0); padding: 20px; border-radius: 15px;">
                            <div>
                                ${product.discount > 0 ? `
                                    <div style="font-size: 0.9rem; color: var(--gray); text-decoration: line-through; margin-bottom: 5px;">
                                        ${(product.originalPrice || product.price).toFixed(2)} دج
                                    </div>
                                ` : ''}
                                <div style="font-size: 1.8rem; font-weight: 700; color: var(--primary);">
                                    ${calculateDiscountedPrice(product)} دج
                                </div>
                                ${product.discount > 0 ? `
                                    <div style="background: var(--danger); color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.9rem; display: inline-block; margin-top: 5px;">
                                        خصم ${product.discount}%
                                    </div>
                                ` : ''}
                            </div>
                            <button class="btn btn-primary" onclick="copyProductLink('${product.slug || product._id}')">
                                <i class="fas fa-link"></i> نسخ الرابط
                            </button>
                        </div>
                        
                        <div>
                            <h4 style="font-size: 1.1rem; margin-bottom: 15px; color: var(--dark);">وصف المنتج</h4>
                            <p style="line-height: 1.8; color: var(--gray);">${product.description}</p>
                        </div>
                        
                        ${product.features && product.features.length > 0 ? `
                            <div>
                                <h4 style="font-size: 1.1rem; margin-bottom: 15px; color: var(--dark);">المميزات</h4>
                                <ul style="list-style: none; display: grid; gap: 10px;">
                                    ${product.features.map(feature => `
                                        <li style="display: flex; align-items: center; gap: 10px; padding: 12px; background: #f8fafc; border-radius: 10px;">
                                            <i class="fas fa-check" style="color: var(--success);"></i>
                                            <span>${feature}</span>
                                        </li>
                                    `).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        
                        ${(product.colors && product.colors.length > 0) || (product.sizes && product.sizes.length > 0) ? `
                            <div style="display: grid; grid-template-columns: ${product.colors && product.sizes ? '1fr 1fr' : '1fr'}; gap: 20px;">
                                ${product.colors && product.colors.length > 0 ? `
                                    <div>
                                        <h4 style="font-size: 1.1rem; margin-bottom: 15px; color: var(--dark);">الألوان</h4>
                                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                            ${product.colors.map(color => `
                                                <span style="background: rgba(67, 97, 238, 0.1); color: var(--primary); padding: 8px 16px; border-radius: 20px; font-size: 0.9rem;">
                                                    ${color}
                                                </span>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                ${product.sizes && product.sizes.length > 0 ? `
                                    <div>
                                        <h4 style="font-size: 1.1rem; margin-bottom: 15px; color: var(--dark);">المقاسات</h4>
                                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                            ${product.sizes.map(size => `
                                                <span style="background: rgba(76, 201, 240, 0.1); color: var(--secondary); padding: 8px 16px; border-radius: 20px; font-size: 0.9rem;">
                                                    ${size}
                                                </span>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            
            showModal('product-detail-modal');
        }
    } catch (error) {
        console.error('Error loading product details:', error);
        showAlert('خطأ في تحميل تفاصيل المنتج', 'error');
    }
}

// تغيير الصورة في التفاصيل
function changeDetailImage(element, imageData) {
    const mainImg = element.closest('.modal-body').querySelector('img[style*="object-fit: contain"]');
    if (mainImg) {
        mainImg.src = imageData;
        mainImg.style.opacity = '0';
        setTimeout(() => {
            mainImg.style.opacity = '1';
            mainImg.style.transition = 'opacity 0.3s';
        }, 10);
    }
    
    // تحديث الحدود
    element.closest('.modal-body').querySelectorAll('img[style*="border:"]').forEach(img => {
        img.style.border = '2px solid transparent';
    });
    element.style.border = '2px solid var(--primary)';
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
    submitBtn.className = 'btn btn-primary btn-block';
    
    // الانتقال إلى قسم إضافة المنتج
    showSection('add-product-section', document.querySelector('.nav-item:nth-child(3)'));
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
            
            // الانتقال إلى قسم المنتجات
            showSection('products-section', document.querySelector('.nav-item:nth-child(1)'));
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
        showLoading('orders-container');
        
        const response = await fetch('/api/orders', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            state.orders = await response.json();
            renderOrders();
        } else {
            showEmptyState('orders-container', 'لا توجد طلبات', 'لم يتم استلام أي طلبات بعد');
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        showAlert('خطأ في تحميل الطلبات', 'error');
        showEmptyState('orders-container', 'خطأ في التحميل', 'حاول مرة أخرى');
    }
}

// عرض الطلبات
function renderOrders() {
    const searchTerm = DOM.orderSearch.value.toLowerCase();
    
    let filteredOrders = [...state.orders];
    
    // التصفية حسب البحث
    if (searchTerm) {
        filteredOrders = filteredOrders.filter(order => 
            order.orderId.toLowerCase().includes(searchTerm) ||
            order.customer.fullName.toLowerCase().includes(searchTerm) ||
            order.customer.phone.includes(searchTerm) ||
            order.customer.wilaya.toLowerCase().includes(searchTerm)
        );
    }
    
    if (filteredOrders.length === 0) {
        showEmptyState('orders-container', 
            'لا توجد طلبات', 
            searchTerm ? 'جرب تغيير كلمة البحث' : 'لم يتم استلام أي طلبات بعد'
        );
        return;
    }
    
    DOM.ordersContainer.innerHTML = `
        <div style="display: grid; gap: 15px;">
            ${filteredOrders.map(order => `
                <div class="product-card" style="padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                        <div>
                            <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--dark); margin-bottom: 5px;">
                                طلب #${order.orderId}
                            </h3>
                            <div style="font-size: 0.9rem; color: var(--gray);">
                                ${new Date(order.createdAt).toLocaleDateString('ar-SA')}
                            </div>
                        </div>
                        <span class="status-badge status-${order.status}" style="padding: 6px 15px; border-radius: 20px; font-size: 0.8rem; font-weight: 600;">
                            ${getStatusText(order.status)}
                        </span>
                    </div>
                    
                    <div style="display: grid; gap: 10px; margin-bottom: 15px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <i class="fas fa-user" style="color: var(--primary);"></i>
                            <span>${order.customer.fullName}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <i class="fas fa-phone" style="color: var(--primary);"></i>
                            <a href="tel:${order.customer.phone}" style="color: var(--primary); text-decoration: none;">
                                ${order.customer.phone}
                            </a>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <i class="fas fa-map-marker-alt" style="color: var(--primary);"></i>
                            <span>${order.customer.wilaya}</span>
                        </div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-top: 15px; border-top: 1px solid var(--gray-light);">
                        <div>
                            <div style="font-size: 0.9rem; color: var(--gray);">عدد المنتجات</div>
                            <div style="font-size: 1.1rem; font-weight: 700;">${order.products.length}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 0.9rem; color: var(--gray);">المجموع</div>
                            <div style="font-size: 1.1rem; font-weight: 700; color: var(--primary);">
                                ${order.total.toFixed(2)} دج
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                        <button class="btn btn-primary btn-sm" onclick="viewOrderDetails('${order._id}')">
                            <i class="fas fa-eye"></i> التفاصيل
                        </button>
                        <button class="btn btn-success btn-sm" onclick="updateOrderStatus('${order._id}', '${getNextStatus(order.status)}')">
                            <i class="fas fa-check"></i> ${getNextStatusText(order.status)}
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// الحصول على الحالة التالية
function getNextStatus(currentStatus) {
    const statusFlow = {
        'pending': 'confirmed',
        'confirmed': 'shipped',
        'shipped': 'delivered',
        'delivered': 'delivered',
        'cancelled': 'cancelled'
    };
    return statusFlow[currentStatus] || 'confirmed';
}

// الحصول على نص الحالة التالية
function getNextStatusText(currentStatus) {
    const statusTexts = {
        'pending': 'تأكيد',
        'confirmed': 'شحن',
        'shipped': 'تسليم',
        'delivered': 'تم التسليم',
        'cancelled': 'ملغي'
    };
    return statusTexts[currentStatus] || 'تأكيد';
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
        <div style="display: grid; gap: 25px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h3 style="font-size: 1.3rem; font-weight: 700; color: var(--dark); margin-bottom: 5px;">
                        طلب #${order.orderId}
                    </h3>
                    <div style="font-size: 0.9rem; color: var(--gray);">
                        ${new Date(order.createdAt).toLocaleString('ar-SA')}
                    </div>
                </div>
                <span class="status-badge status-${order.status}" style="padding: 8px 20px; border-radius: 20px; font-size: 0.9rem; font-weight: 600;">
                    ${getStatusText(order.status)}
                </span>
            </div>
            
            <div style="display: grid; gap: 20px;">
                <div style="background: #f8fafc; padding: 20px; border-radius: 15px;">
                    <h4 style="font-size: 1.1rem; margin-bottom: 15px; color: var(--dark);">
                        <i class="fas fa-user" style="margin-left: 10px;"></i>
                        معلومات العميل
                    </h4>
                    <div style="display: grid; gap: 10px;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="font-weight: 600;">الاسم:</span>
                            <span>${order.customer.fullName}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="font-weight: 600;">الهاتف:</span>
                            <a href="tel:${order.customer.phone}" style="color: var(--primary); text-decoration: none;">
                                ${order.customer.phone}
                            </a>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="font-weight: 600;">الولاية:</span>
                            <span>${order.customer.wilaya}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="font-weight: 600;">العنوان:</span>
                            <span>${order.customer.address}</span>
                        </div>
                    </div>
                </div>
                
                <div style="background: #f8fafc; padding: 20px; border-radius: 15px;">
                    <h4 style="font-size: 1.1rem; margin-bottom: 15px; color: var(--dark);">
                        <i class="fas fa-shopping-bag" style="margin-left: 10px;"></i>
                        المنتجات (${order.products.length})
                    </h4>
                    <div style="display: grid; gap: 15px;">
                        ${order.products.map((item, index) => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: white; border-radius: 10px;">
                                <div style="display: flex; align-items: center; gap: 15px;">
                                    <span style="font-weight: 700; color: var(--gray);">${index + 1}</span>
                                    <div>
                                        <div style="font-weight: 600; margin-bottom: 5px;">${item.productId?.name || 'منتج محذوف'}</div>
                                        <div style="font-size: 0.9rem; color: var(--gray);">
                                            ${item.color ? `اللون: ${item.color}` : ''} ${item.size ? `المقاس: ${item.size}` : ''}
                                        </div>
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-weight: 600;">${item.price} دج</div>
                                    <div style="font-size: 0.9rem; color: var(--gray);">
                                        × ${item.quantity}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div style="background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: white; padding: 25px; border-radius: 15px;">
                    <h4 style="font-size: 1.1rem; margin-bottom: 20px;">
                        <i class="fas fa-calculator" style="margin-left: 10px;"></i>
                        ملخص الفاتورة
                    </h4>
                    <div style="display: grid; gap: 15px;">
                        <div style="display: flex; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.2);">
                            <span>المجموع الفرعي:</span>
                            <span>${order.subtotal.toFixed(2)} دج</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.2);">
                            <span>التوصيل:</span>
                            <span>${order.shipping} دج</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 1.2rem; font-weight: 700; padding-top: 10px;">
                            <span>المجموع الكلي:</span>
                            <span>${order.total.toFixed(2)} دج</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 10px;">
                <button class="btn btn-primary" onclick="printOrder('${order._id}')">
                    <i class="fas fa-print"></i> طباعة
                </button>
                <button class="btn btn-success" onclick="contactCustomer('${order.customer.phone}')">
                    <i class="fas fa-phone"></i> الاتصال
                </button>
            </div>
        </div>
    `;
    
    showModal('order-modal');
}

// طباعة الطلب
function printOrder(orderId) {
    const order = state.orders.find(o => o._id === orderId);
    if (!order) {
        showAlert('الطلب غير موجود', 'error');
        return;
    }
    
    const printWindow = window.open('', '_blank');
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
async function exportProducts() {
    try {
        const response = await fetch('/api/products/export', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'المنتجات.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showAlert('تم تصدير المنتجات بنجاح', 'success');
        } else {
            showAlert('خطأ في تصدير المنتجات', 'error');
        }
    } catch (error) {
        showAlert('خطأ في تصدير المنتجات', 'error');
    }
}

// فلترة المنتجات
function filterProducts() {
    renderProducts();
}

// فلترة الطلبات
function filterOrders() {
    renderOrders();
}

// إظهار قسم
function showSection(sectionId, navItem) {
    // إخفاء جميع الأقسام
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // إزالة النشطة من جميع عناصر التنقل
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // إظهار القسم المطلوب
    document.getElementById(sectionId).classList.add('active');
    
    // تفعيل عنصر التنقل
    if (navItem) {
        navItem.classList.add('active');
    }
    
    // التمرير إلى الأعلى
    document.querySelector('.main-content').scrollTop = 0;
}

// إظهار المودال
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// إغلاق المودال
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

// إظهار حالة التحميل
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>جاري التحميل...</p>
        </div>
    `;
}

// إظهار حالة فارغة
function showEmptyState(containerId, title, message) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-inbox"></i>
            <h3>${title}</h3>
            <p>${message}</p>
        </div>
    `;
}

// عرض تنبيه
function showAlert(message, type) {
    // إزالة التنبيهات السابقة
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${type}`;
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
    
    // إضافة Service Worker للتطبيق
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').then(registration => {
                console.log('ServiceWorker registration successful');
            }).catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
        });
    }
    
    // إضافة تطبيقات محمولة
    if (window.matchMedia('(display-mode: standalone)').matches) {
        document.body.classList.add('standalone');
    }
    
    // منع التكبير في حقول الإدخال على الهواتف
    document.querySelectorAll('input, textarea, select').forEach(el => {
        el.addEventListener('focus', () => {
            setTimeout(() => {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });
    });
    
    // تحسين شريط اللمس
    document.addEventListener('touchstart', () => {}, { passive: true });
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

// تشغيل التطبيق
document.addEventListener('DOMContentLoaded', init);

// منع إغلاق الصفحة عند التحديث
window.addEventListener('beforeunload', (e) => {
    if (state.images.length > 0) {
        e.preventDefault();
        e.returnValue = 'لديك صور غير محفوظة. هل تريد حقاً مغادرة الصفحة؟';
        return 'لديك صور غير محفوظة. هل تريد حقاً مغادرة الصفحة؟';
    }
});