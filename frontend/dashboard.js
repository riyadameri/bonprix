// حالة التطبيق
const state = {
    products: [],
    orders: [],
    colors: [],
    sizes: [],
    features: [],
    images: [],
    stats: {},
    currentPage: 1,
    productsPerPage: 12,
    ordersPerPage: 10,
    isEditing: false,
    editingProductId: null,
    notifications: [],
    activeSection: 'products',
    categories: [
        'ملابس', 'إلكترونيات', 'أثاث', 'كتب', 'ألعاب',
        'مواد غذائية', 'أجهزة منزلية', 'رياضة', 'جمال', 'أخرى'
    ]
};

// عناصر DOM الرئيسية
const DOM = {
    // الأقسام
    activeSection: document.getElementById('active-section'),
    
    // الإحصائيات
    totalProducts: document.getElementById('total-products'),
    totalOrders: document.getElementById('total-orders'),
    totalSales: document.getElementById('total-sales'),
    totalCustomers: document.getElementById('total-customers'),
    
    // التاريخ
    currentDate: document.getElementById('current-date'),
    
    // المنتجات
    productsContainer: document.getElementById('products-container'),
    productSearch: document.getElementById('product-search'),
    categoryFilter: document.getElementById('category-filter'),
    stockFilter: document.getElementById('stock-filter'),
    
    // الطلبات
    ordersContainer: document.getElementById('orders-container-responsive'),
    orderSearch: document.getElementById('order-search'),
    statusFilter: document.getElementById('status-filter'),
    dateFilter: document.getElementById('date-filter'),
    
    // النموذج
    addProductForm: document.getElementById('add-product-form'),
    productName: document.getElementById('name'),
    productPrice: document.getElementById('price'),
    originalPrice: document.getElementById('originalPrice'),
    discount: document.getElementById('discount'),
    discountRange: document.getElementById('discount-range'),
    category: document.getElementById('category'),
    stock: document.getElementById('stock'),
    description: document.getElementById('description'),
    
    // الصور
    uploadArea: document.getElementById('upload-area'),
    imageInput: document.getElementById('image-input'),
    imagePreview: document.getElementById('image-preview'),
    
    // العلامات
    colorInput: document.getElementById('color-input'),
    colorsTags: document.getElementById('colors-tags'),
    sizeInput: document.getElementById('size-input'),
    sizesTags: document.getElementById('sizes-tags'),
    featureInput: document.getElementById('feature-input'),
    featuresTags: document.getElementById('features-tags'),
    
    // المودال
    orderModal: document.getElementById('order-modal'),
    orderDetails: document.getElementById('order-details'),
    productModal: document.getElementById('product-modal'),
    productDetails: document.getElementById('product-details'),
    shippingModal: document.getElementById('shipping-modal'),
    shippingContent: document.getElementById('shipping-content'),
    
    // الإشعارات
    notificationBell: document.getElementById('notification-bell'),
    notificationCount: document.getElementById('notification-count'),
    notificationsList: document.getElementById('notifications-list'),
    
    // التحميل
    loader: document.getElementById('loader'),
    
    // الرسائل العائمة
    floatingMessages: document.getElementById('floating-messages')
};

// تهيئة التطبيق
async function initDashboard() {
    updateCurrentDate();
    setupEventListeners();
    setupCategories();
    setupMobileMenu();
    await loadStats();
    await loadProducts();
    await loadOrders();
    await loadNotifications();
    startAutoRefresh();
    animateStats();
}

// تحديث التاريخ
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
    DOM.currentDate.textContent = now.toLocaleDateString('ar-SA', options);
}

// إعداد المستمعين للأحداث
function setupEventListeners() {
    // النموذج
    DOM.addProductForm.addEventListener('submit', handleProductSubmit);
    
    // الخصم
    DOM.discount.addEventListener('input', (e) => {
        DOM.discountRange.value = e.target.value;
    });
    
    DOM.discountRange.addEventListener('input', (e) => {
        DOM.discount.value = e.target.value;
    });
    
    // الصور
    DOM.imageInput.addEventListener('change', handleImageUpload);
    
    DOM.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        DOM.uploadArea.style.borderColor = '#4361ee';
        DOM.uploadArea.style.background = 'rgba(67, 97, 238, 0.1)';
    });
    
    DOM.uploadArea.addEventListener('dragleave', () => {
        DOM.uploadArea.style.borderColor = '#4361ee';
        DOM.uploadArea.style.background = 'rgba(67, 97, 238, 0.05)';
    });
    
    DOM.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        DOM.uploadArea.style.borderColor = '#4361ee';
        DOM.uploadArea.style.background = 'rgba(67, 97, 238, 0.05)';
        
        if (e.dataTransfer.files) {
            handleFiles(e.dataTransfer.files);
        }
    });
    
    // العلامات
    setupTagsInput('colors', DOM.colorInput, DOM.colorsTags);
    setupTagsInput('sizes', DOM.sizeInput, DOM.sizesTags);
    setupTagsInput('features', DOM.featureInput, DOM.featuresTags);
    
    // البحث والتصفية
    DOM.productSearch.addEventListener('input', debounce(filterProducts, 300));
    DOM.categoryFilter.addEventListener('change', filterProducts);
    DOM.stockFilter.addEventListener('change', filterProducts);
    DOM.orderSearch.addEventListener('input', debounce(filterOrders, 300));
    DOM.statusFilter.addEventListener('change', filterOrders);
    DOM.dateFilter.addEventListener('change', filterOrders);
    
    // إغلاق المودال بالنقر خارجها
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeModal(e.target.id);
        }
    });
    
    // إغلاق المودال بالزر Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

// إعداد القوائم المنسدلة للفئات
function setupCategories() {
    const categoryElements = [
        DOM.category,
        DOM.categoryFilter
    ];
    
    categoryElements.forEach(element => {
        if (element) {
            element.innerHTML = '<option value="">اختر الفئة</option>' +
                state.categories.map(cat => 
                    `<option value="${cat}">${cat}</option>`
                ).join('');
        }
    });
}

// إعداد العلامات
function setupTagsInput(type, inputElement, tagsContainer) {
    inputElement.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag(type, inputElement.value.trim());
            inputElement.value = '';
        }
    });
    
    inputElement.addEventListener('keyup', (e) => {
        if (e.key === ',' || e.key === '،') {
            const value = inputElement.value.trim().slice(0, -1);
            if (value) {
                addTag(type, value);
                inputElement.value = '';
            }
        }
    });
}

// إضافة علامة
function addTag(type, value) {
    if (value && !state[type].includes(value)) {
        state[type].push(value);
        renderTags(type, DOM[`${type}Tags`]);
        showMessage(`تمت إضافة ${type === 'colors' ? 'اللون' : type === 'sizes' ? 'المقاس' : 'الميزة'} "${value}"`, 'success');
    }
}

// إزالة علامة
function removeTag(type, index) {
    const removed = state[type].splice(index, 1)[0];
    renderTags(type, DOM[`${type}Tags`]);
    showMessage(`تمت إزالة ${type === 'colors' ? 'اللون' : type === 'sizes' ? 'المقاس' : 'الميزة'} "${removed}"`, 'warning');
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

// وظائف مساعدة للعلامات
function addColor(color) {
    addTag('colors', color);
}

function addSize(size) {
    addTag('sizes', size);
}

// معالجة الصور
function handleImageUpload(e) {
    const files = Array.from(e.target.files);
    handleFiles(files);
}

function handleFiles(files) {
    files.forEach(file => {
        if (!file.type.match('image.*')) {
            showMessage('يُسمح برفع الصور فقط', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showMessage('حجم الصورة يجب أن يكون أقل من 5MB', 'error');
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
            showMessage('تم رفع الصورة بنجاح', 'success');
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
        <div class="preview-item" data-index="${index}">
            <img src="${image.data}" alt="Preview ${index + 1}" loading="lazy">
            <div class="preview-actions">
                <button class="btn-set-main" onclick="setAsMain(${index})" 
                        ${image.isMain ? 'disabled' : ''}
                        title="${image.isMain ? 'الصورة الرئيسية' : 'تعيين كصورة رئيسية'}">
                    <i class="fas ${image.isMain ? 'fa-check-circle' : 'fa-star'}"></i>
                    ${image.isMain ? 'رئيسية' : 'رئيسية'}
                </button>
                <button class="btn-remove" onclick="removeImage(${index})" title="حذف الصورة">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// تعيين صورة رئيسية
function setAsMain(index) {
    state.images.forEach((img, i) => {
        img.isMain = i === index;
    });
    renderImagePreview();
    showMessage('تم تعيين الصورة كرئيسية', 'success');
}

// إزالة صورة
function removeImage(index) {
    const removed = state.images.splice(index, 1)[0];
    if (state.images.length > 0 && removed.isMain) {
        state.images[0].isMain = true;
    }
    renderImagePreview();
    showMessage('تم حذف الصورة', 'warning');
}

// تحميل الإحصائيات
async function loadStats() {
    try {
        showLoader();
        const response = await fetch('/api/stats');
        if (response.ok) {
            state.stats = await response.json();
            updateStatsUI();
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        showMessage('خطأ في تحميل الإحصائيات', 'error');
    } finally {
        hideLoader();
    }
}

// تحديث واجهة الإحصائيات
function updateStatsUI() {
    DOM.totalProducts.textContent = state.stats.totalProducts || 0;
    DOM.totalOrders.textContent = state.stats.totalOrders || 0;
    DOM.totalSales.textContent = (state.stats.totalSales || 0).toFixed(2) + ' دج';
    DOM.totalCustomers.textContent = state.stats.totalCustomers || 0;
    
    // تحديث بادج الطلبات
    const ordersBadge = document.getElementById('orders-badge');
    if (ordersBadge) {
        ordersBadge.textContent = state.stats.totalOrders || 0;
    }
}

// تحميل المنتجات
async function loadProducts() {
    try {
        showLoader();
        const response = await fetch('/api/products');
        if (response.ok) {
            state.products = await response.json();
            renderProducts();
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showMessage('خطأ في تحميل المنتجات', 'error');
    } finally {
        hideLoader();
    }
}

// عرض المنتجات مع تأثيرات متقدمة
function renderProducts() {
    const searchTerm = DOM.productSearch.value.toLowerCase();
    const category = DOM.categoryFilter.value;
    const stockFilter = DOM.stockFilter.value;
    
    let filteredProducts = [...state.products];
    
    // التصفية
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(product =>
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm) ||
            product.category.toLowerCase().includes(searchTerm)
        );
    }
    
    if (category) {
        filteredProducts = filteredProducts.filter(product => product.category === category);
    }
    
    if (stockFilter === 'in-stock') {
        filteredProducts = filteredProducts.filter(product => product.stock > 0);
    } else if (stockFilter === 'out-of-stock') {
        filteredProducts = filteredProducts.filter(product => product.stock === 0);
    } else if (stockFilter === 'low-stock') {
        filteredProducts = filteredProducts.filter(product => product.stock > 0 && product.stock <= 10);
    }
    
    if (filteredProducts.length === 0) {
        DOM.productsContainer.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-box-open" style="font-size: 3rem; color: #cbd5e0; margin-bottom: 20px;"></i>
                <h3 style="color: #4a5568; margin-bottom: 10px;">لا توجد منتجات</h3>
                <p style="color: #718096;">${searchTerm || category || stockFilter ? 'جرب تغيير عوامل التصفية' : 'ابدأ بإضافة أول منتج'}</p>
                <button class="btn-primary" onclick="switchSection('add-product')" style="margin-top: 20px;">
                    <i class="fas fa-plus"></i> إضافة منتج جديد
                </button>
            </div>
        `;
        return;
    }
    
    // عرض المنتجات مع تأثيرات
    DOM.productsContainer.innerHTML = filteredProducts.map((product, index) => {
        const mainImage = getProductImage(product);
        const discountPrice = calculateDiscountedPrice(product);
        
        return `
            <div class="product-card animate__animated animate__fadeInUp" 
                 style="animation-delay: ${index * 50}ms">
                <div class="product-image">
                    ${mainImage}
                    <div class="product-badges">
                        ${product.discount > 0 ? `
                            <span class="product-badge discount">
                                <i class="fas fa-percentage"></i> ${product.discount}%
                            </span>
                        ` : ''}
                        <span class="product-badge views">
                            <i class="fas fa-eye"></i> ${product.views || 0}
                        </span>
                    </div>
                </div>
                <div class="product-content">
                    <h3 class="product-title" onclick="viewProductDetails('${product._id || product.id}')">
                        ${product.name}
                    </h3>
                    <p class="product-description">${product.description.substring(0, 100)}${product.description.length > 100 ? '...' : ''}</p>
                    
                    <div class="product-price">
                        ${product.discount > 0 ? `
                            <span class="original-price">${(product.originalPrice || product.price).toFixed(2)} دج</span>
                        ` : ''}
                        <span class="current-price">${discountPrice} دج</span>
                        ${product.discount > 0 ? `
                            <span class="discount-percent">${product.discount}% خصم</span>
                        ` : ''}
                    </div>
                    
                    <div class="product-meta">
                        <span class="product-category">${product.category}</span>
                        <span class="product-stock ${getStockClass(product.stock)}">
                            ${product.stock} وحدة
                        </span>
                    </div>
                    
                    ${product.colors && product.colors.length > 0 ? `
                        <div class="product-tags">
                            ${product.colors.slice(0, 3).map(color => 
                                `<span class="product-tag">${color}</span>`
                            ).join('')}
                            ${product.colors.length > 3 ? 
                                `<span class="product-tag">+${product.colors.length - 3}</span>` : ''
                            }
                        </div>
                    ` : ''}
                    
                    <div class="product-actions">
                        <button class="product-btn edit" onclick="editProduct('${product._id || product.id}')" title="تعديل">
                            <i class="fas fa-edit"></i>
                            <span class="btn-text">تعديل</span>
                        </button>
                        <button class="product-btn delete" onclick="deleteProduct('${product._id || product.id}')" title="حذف">
                            <i class="fas fa-trash"></i>
                            <span class="btn-text">حذف</span>
                        </button>
                        <button class="product-btn view" onclick="viewProductDetails('${product._id || product.id}')" title="عرض التفاصيل">
                            <i class="fas fa-eye"></i>
                            <span class="btn-text">عرض</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// الحصول على صورة المنتج
function getProductImage(product) {
    if (product.mainImage) {
        return `<img src="${product.mainImage}" alt="${product.name}" loading="lazy">`;
    } else if (product.images && product.images.length > 0) {
        const mainImage = product.images.find(img => img.isMain) || product.images[0];
        return `<img src="${mainImage.data}" alt="${product.name}" loading="lazy">`;
    } else if (product.image) {
        return `<img src="${product.image}" alt="${product.name}" loading="lazy">`;
    } else {
        return `
            <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);">
                <i class="fas fa-box" style="font-size: 3rem; color: #a0aec0;"></i>
            </div>
        `;
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
    if (stock === 0) return 'out-of-stock';
    if (stock <= 10) return 'low-stock';
    return 'in-stock';
}

// فلترة المنتجات
function filterProducts() {
    renderProducts();
}

// معالجة تقديم النموذج
async function handleProductSubmit(e) {
    e.preventDefault();
    
    if (state.images.length === 0) {
        showMessage('الرجاء إضافة صورة واحدة على الأقل للمنتج', 'error');
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
    
    // التحقق من البيانات
    if (!productData.name || productData.name.length < 3) {
        showMessage('اسم المنتج يجب أن يكون 3 أحرف على الأقل', 'error');
        return;
    }
    
    if (productData.price <= 0) {
        showMessage('السعر يجب أن يكون أكبر من صفر', 'error');
        return;
    }
    
    if (productData.stock < 0) {
        showMessage('الكمية يجب أن تكون 0 أو أكثر', 'error');
        return;
    }
    
    try {
        showLoader();
        const method = state.isEditing ? 'PUT' : 'POST';
        const url = state.isEditing ? `/api/products/${state.editingProductId}` : '/api/products';
        
        const response = await fetch(url, {
            method,
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || 'demo-token'}`
            },
            body: JSON.stringify(productData)
        });
        
        if (response.ok) {
            const product = await response.json();
            showMessage(
                state.isEditing ? 'تم تحديث المنتج بنجاح' : 'تم إضافة المنتج بنجاح',
                'success'
            );
            
            resetForm();
            await loadProducts();
            await loadStats();
            
            if (!state.isEditing) {
                switchSection('products');
                // إضافة تأثير للمنتج الجديد
                const newProductCard = document.querySelector(`[data-id="${product._id || product.id}"]`);
                if (newProductCard) {
                    newProductCard.classList.add('animate__pulse');
                    setTimeout(() => {
                        newProductCard.classList.remove('animate__pulse');
                    }, 1000);
                }
            }
        } else {
            const error = await response.json();
            showMessage(`خطأ: ${error.error || 'فشل حفظ المنتج'}`, 'error');
        }
    } catch (error) {
        console.error('Error saving product:', error);
        showMessage('خطأ في الاتصال بالخادم', 'error');
    } finally {
        hideLoader();
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
    
    // إعادة زر الحفظ
    const submitBtn = DOM.addProductForm.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-save"></i> حفظ المنتج';
    submitBtn.className = 'btn-primary';
}

// تعديل منتج
function editProduct(productId) {
    const product = state.products.find(p => (p._id || p.id) === productId);
    if (!product) {
        showMessage('المنتج غير موجود', 'error');
        return;
    }
    
    // ملء النموذج
    DOM.productName.value = product.name;
    DOM.productPrice.value = product.price;
    DOM.originalPrice.value = product.originalPrice || '';
    DOM.discount.value = product.discount || 0;
    DOM.discountRange.value = product.discount || 0;
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
    
    // تغيير النص
    const submitBtn = DOM.addProductForm.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-save"></i> تحديث المنتج';
    
    // الانتقال للقسم
    switchSection('add-product');
    
    // إضافة تأثير
    document.getElementById('add-product-section').classList.add('animate__pulse');
    setTimeout(() => {
        document.getElementById('add-product-section').classList.remove('animate__pulse');
    }, 1000);
}

// حذف منتج
async function deleteProduct(productId) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    
    try {
        showLoader();
        const response = await fetch(`/api/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || 'demo-token'}`
            }
        });
        
        if (response.ok) {
            showMessage('تم حذف المنتج بنجاح', 'success');
            await loadProducts();
            await loadStats();
        } else {
            const error = await response.json();
            showMessage(`خطأ: ${error.error || 'فشل حذف المنتج'}`, 'error');
        }
    } catch (error) {
        showMessage('خطأ في حذف المنتج', 'error');
    } finally {
        hideLoader();
    }
}

// تحميل الطلبات
async function loadOrders() {
    try {
        showLoader();
        const response = await fetch('/api/orders');
        if (response.ok) {
            state.orders = await response.json();
            renderOrders();
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        showMessage('خطأ في تحميل الطلبات', 'error');
    } finally {
        hideLoader();
    }
}

// عرض الطلبات بتصميم متجاوب
function renderOrders() {
    const searchTerm = DOM.orderSearch.value.toLowerCase();
    const statusFilter = DOM.statusFilter.value;
    const dateFilter = DOM.dateFilter.value;
    
    let filteredOrders = state.orders;
    
    // التصفية
    if (searchTerm) {
        filteredOrders = filteredOrders.filter(order => 
            (order.orderId && order.orderId.toLowerCase().includes(searchTerm)) ||
            (order.customer?.fullName && order.customer.fullName.toLowerCase().includes(searchTerm)) ||
            (order.customer?.phone && order.customer.phone.includes(searchTerm))
        );
    }
    
    if (statusFilter) {
        filteredOrders = filteredOrders.filter(order => order.status === statusFilter);
    }
    
    if (dateFilter) {
        const filterDate = new Date(dateFilter);
        filteredOrders = filteredOrders.filter(order => {
            const orderDate = new Date(order.createdAt || order.date);
            return orderDate.toDateString() === filterDate.toDateString();
        });
    }
    
    if (filteredOrders.length === 0) {
        DOM.ordersContainer.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 60px 20px; background: white; border-radius: var(--radius-lg);">
                <i class="fas fa-shopping-cart" style="font-size: 3rem; color: #cbd5e0; margin-bottom: 20px;"></i>
                <h3 style="color: #4a5568; margin-bottom: 10px;">لا توجد طلبات</h3>
                <p style="color: #718096;">${searchTerm || statusFilter || dateFilter ? 'جرب تغيير عوامل التصفية' : 'لم يتم استلام أي طلبات بعد'}</p>
            </div>
        `;
        return;
    }
    
    // عرض الطلبات مع تأثيرات
    DOM.ordersContainer.innerHTML = filteredOrders.map((order, index) => {
        const orderDate = new Date(order.createdAt || order.date);
        const statusClass = `status-${order.status}`;
        const statusText = getStatusText(order.status);
        
        return `
            <div class="order-card animate__animated animate__fadeIn" 
                 style="animation-delay: ${index * 50}ms">
                <div class="order-header">
                    <div class="order-id">طلب #${order.orderId || order.id}</div>
                    <div class="order-date">
                        <i class="fas fa-calendar-alt"></i>
                        ${orderDate.toLocaleDateString('ar-SA')}
                    </div>
                </div>
                
                <div class="order-customer">
                    <div class="customer-name">
                        <i class="fas fa-user"></i>
                        ${order.customer?.fullName || 'عميل'}
                    </div>
                    <div class="customer-details">
                        <span>
                            <i class="fas fa-phone"></i>
                            ${order.customer?.phone || 'لا يوجد'}
                        </span>
                        <span>
                            <i class="fas fa-map-marker-alt"></i>
                            ${order.customer?.wilaya || 'غير محدد'}
                        </span>
                    </div>
                </div>
                
                <div class="order-products">
                    <div class="products-count">
                        <i class="fas fa-box"></i>
                        ${order.products?.length || 0} منتجات
                    </div>
                    ${order.products && order.products.length > 0 ? `
                        <div class="products-list">
                            ${order.products.slice(0, 2).map(item => `
                                <div class="product-mini">
                                    <div class="product-image-mini">
                                        ${getProductImage(item.productId || item)}
                                    </div>
                                    <div class="product-name-mini">
                                        ${item.productId?.name || item.name || 'منتج'}
                                    </div>
                                    <div class="product-quantity">
                                        ${item.quantity}x
                                    </div>
                                </div>
                            `).join('')}
                            ${order.products.length > 2 ? `
                                <div class="product-mini" style="background: rgba(67, 97, 238, 0.1); color: var(--primary-color);">
                                    <i class="fas fa-plus"></i>
                                    +${order.products.length - 2} منتجات أخرى
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
                
                <div class="order-footer">
                    <div class="order-total">
                        ${order.total?.toFixed(2) || '0.00'} دج
                    </div>
                    
                    <div class="order-status-buttons">
                        <button class="status-btn ${statusClass} ${order.status === 'pending' ? 'active' : ''}" 
                                onclick="updateOrderStatus('${order._id || order.id}', 'pending')"
                                title="قيد الانتظار">
                            <i class="fas fa-clock"></i>
                            <span class="status-text">قيد الانتظار</span>
                        </button>
                        <button class="status-btn ${statusClass} ${order.status === 'confirmed' ? 'active' : ''}" 
                                onclick="updateOrderStatus('${order._id || order.id}', 'confirmed')"
                                title="مؤكد">
                            <i class="fas fa-check-circle"></i>
                            <span class="status-text">مؤكد</span>
                        </button>
                        <button class="status-btn ${statusClass} ${order.status === 'shipped' ? 'active' : ''}" 
                                onclick="updateOrderStatus('${order._id || order.id}', 'shipped')"
                                title="مرسل">
                            <i class="fas fa-shipping-fast"></i>
                            <span class="status-text">مرسل</span>
                        </button>
                        <button class="status-btn ${statusClass} ${order.status === 'delivered' ? 'active' : ''}" 
                                onclick="updateOrderStatus('${order._id || order.id}', 'delivered')"
                                title="مستلم">
                            <i class="fas fa-box-open"></i>
                            <span class="status-text">مستلم</span>
                        </button>
                        <button class="status-btn ${statusClass} ${order.status === 'cancelled' ? 'active' : ''}" 
                                onclick="updateOrderStatus('${order._id || order.id}', 'cancelled')"
                                title="ملغي">
                            <i class="fas fa-times-circle"></i>
                            <span class="status-text">ملغي</span>
                        </button>
                    </div>
                    
                    <div class="order-actions">
                        <button class="order-action-btn view" 
                                onclick="viewOrderDetails('${order._id || order.id}')"
                                title="عرض التفاصيل">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="order-action-btn print" 
                                onclick="printShippingForOrder('${order._id || order.id}')"
                                title="طباعة التوصيل">
                            <i class="fas fa-print"></i>
                        </button>
                        <button class="order-action-btn call" 
                                onclick="contactCustomer('${order.customer?.phone}')"
                                title="الاتصال بالعميل">
                            <i class="fas fa-phone"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// الحصول على نص الحالة
function getStatusText(status) {
    const statusMap = {
        'pending': 'قيد الانتظار',
        'confirmed': 'مؤكد',
        'shipped': 'مرسل',
        'delivered': 'مستلم',
        'cancelled': 'ملغي'
    };
    return statusMap[status] || status;
}

// فلترة الطلبات
function filterOrders() {
    renderOrders();
}

// تحديث حالة الطلب
async function updateOrderStatus(orderId, status) {
    try {
        showLoader();
        const response = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || 'demo-token'}`
            },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            showMessage(`تم تغيير حالة الطلب إلى "${getStatusText(status)}"`, 'success');
            
            // إضافة إشعار
            addNotification(`تم تحديث حالة طلب #${orderId}`, `تم تغيير حالة الطلب إلى "${getStatusText(status)}"`);
            
            await loadOrders();
            
            // تأثير بصري
            const orderCard = document.querySelector(`.order-card:has(.order-id:contains("${orderId}"))`);
            if (orderCard) {
                orderCard.classList.add('animate__pulse');
                setTimeout(() => {
                    orderCard.classList.remove('animate__pulse');
                }, 1000);
            }
        } else {
            const error = await response.json();
            showMessage(`خطأ: ${error.error || 'فشل تحديث حالة الطلب'}`, 'error');
        }
    } catch (error) {
        showMessage('خطأ في تحديث حالة الطلب', 'error');
    } finally {
        hideLoader();
    }
}

// عرض تفاصيل الطلب
async function viewOrderDetails(orderId) {
    try {
        showLoader();
        const order = state.orders.find(o => (o._id || o.id) === orderId);
        if (!order) {
            showMessage('الطلب غير موجود', 'error');
            return;
        }
        
        DOM.orderDetails.innerHTML = `
            <div class="order-details">
                <div class="detail-header">
                    <h2>طلب #${order.orderId || order.id}</h2>
                    <div class="detail-status ${order.status}">
                        ${getStatusText(order.status)}
                    </div>
                </div>
                
                <div class="detail-grid">
                    <div class="detail-section">
                        <h3><i class="fas fa-user"></i> معلومات العميل</h3>
                        <div class="detail-content">
                            <p><strong>الاسم:</strong> ${order.customer?.fullName || 'غير محدد'}</p>
                            <p><strong>الهاتف:</strong> ${order.customer?.phone || 'غير محدد'}</p>
                            <p><strong>الولاية:</strong> ${order.customer?.wilaya || 'غير محدد'}</p>
                            <p><strong>العنوان:</strong> ${order.customer?.address || 'غير محدد'}</p>
                            ${order.customer?.email ? `<p><strong>البريد:</strong> ${order.customer.email}</p>` : ''}
                            ${order.customer?.notes ? `<p><strong>ملاحظات:</strong> ${order.customer.notes}</p>` : ''}
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3><i class="fas fa-receipt"></i> معلومات الطلب</h3>
                        <div class="detail-content">
                            <p><strong>رقم الطلب:</strong> ${order.orderId || order.id}</p>
                            <p><strong>التاريخ:</strong> ${new Date(order.createdAt || order.date).toLocaleString('ar-SA')}</p>
                            <p><strong>طريقة الدفع:</strong> الدفع عند الاستلام</p>
                            <p><strong>سعر التوصيل:</strong> ${order.shipping || 0} دج</p>
                            <p><strong>الحالة:</strong> ${getStatusText(order.status)}</p>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3><i class="fas fa-shopping-bag"></i> المنتجات (${order.products?.length || 0})</h3>
                    <div class="products-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>المنتج</th>
                                    <th>الكمية</th>
                                    <th>السعر</th>
                                    <th>المجموع</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${order.products ? order.products.map(item => `
                                    <tr>
                                        <td>
                                            <div class="product-info">
                                                <div class="product-image-small">
                                                    ${getProductImage(item.productId || item)}
                                                </div>
                                                <div class="product-name">
                                                    ${item.productId?.name || item.name || 'منتج'}
                                                    ${item.color ? `<small>اللون: ${item.color}</small>` : ''}
                                                    ${item.size ? `<small>المقاس: ${item.size}</small>` : ''}
                                                </div>
                                            </div>
                                        </td>
                                        <td>${item.quantity}</td>
                                        <td>${item.price} دج</td>
                                        <td><strong>${(item.price * item.quantity).toFixed(2)} دج</strong></td>
                                    </tr>
                                `).join('') : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3><i class="fas fa-calculator"></i> ملخص الفاتورة</h3>
                    <div class="summary">
                        <div class="summary-item">
                            <span>المجموع الفرعي:</span>
                            <span>${order.subtotal?.toFixed(2) || '0.00'} دج</span>
                        </div>
                        <div class="summary-item">
                            <span>التوصيل:</span>
                            <span>${order.shipping || 0} دج</span>
                        </div>
                        <div class="summary-item total">
                            <span>المجموع الكلي:</span>
                            <span>${order.total?.toFixed(2) || '0.00'} دج</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-actions">
                    <button class="btn-primary" onclick="printOrder('${orderId}')">
                        <i class="fas fa-print"></i> طباعة الفاتورة
                    </button>
                    <button class="btn-secondary" onclick="printShippingForOrder('${orderId}')">
                        <i class="fas fa-truck"></i> طباعة التوصيل
                    </button>
                    <button class="btn-secondary" onclick="contactCustomer('${order.customer?.phone}')">
                        <i class="fas fa-phone"></i> الاتصال بالعميل
                    </button>
                </div>
            </div>
        `;
        
        openModal('order-modal');
    } catch (error) {
        showMessage('خطأ في تحميل تفاصيل الطلب', 'error');
    } finally {
        hideLoader();
    }
}

// عرض تفاصيل المنتج
async function viewProductDetails(productId) {
    try {
        showLoader();
        const product = state.products.find(p => (p._id || p.id) === productId);
        if (!product) {
            showMessage('المنتج غير موجود', 'error');
            return;
        }
        
        DOM.productDetails.innerHTML = `
            <div class="product-details-modal">
                <div class="product-detail-header">
                    <div class="product-main-image">
                        ${getProductImage(product)}
                    </div>
                    <div class="product-info-summary">
                        <h2>${product.name}</h2>
                        <div class="product-meta">
                            <span class="category">${product.category}</span>
                            <span class="views"><i class="fas fa-eye"></i> ${product.views || 0} مشاهدة</span>
                            <span class="stock ${getStockClass(product.stock)}">
                                <i class="fas fa-box"></i> ${product.stock} وحدة
                            </span>
                        </div>
                        
                        <div class="product-price-detail">
                            ${product.discount > 0 ? `
                                <div class="original-price">${(product.originalPrice || product.price).toFixed(2)} دج</div>
                                <div class="current-price">${calculateDiscountedPrice(product)} دج</div>
                                <div class="discount-badge">${product.discount}% خصم</div>
                            ` : `
                                <div class="current-price">${product.price.toFixed(2)} دج</div>
                            `}
                        </div>
                        
                        <div class="product-actions-modal">
                            <button class="btn-primary" onclick="editProduct('${productId}')">
                                <i class="fas fa-edit"></i> تعديل المنتج
                            </button>
                            <button class="btn-secondary" onclick="copyProductLink('${product.slug || productId}')">
                                <i class="fas fa-link"></i> نسخ الرابط
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="product-detail-content">
                    <div class="detail-section">
                        <h3>وصف المنتج</h3>
                        <p>${product.description}</p>
                    </div>
                    
                    ${product.features && product.features.length > 0 ? `
                        <div class="detail-section">
                            <h3>مميزات المنتج</h3>
                            <ul class="features-list">
                                ${product.features.map(feature => `
                                    <li><i class="fas fa-check"></i> ${feature}</li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${product.colors && product.colors.length > 0 ? `
                        <div class="detail-section">
                            <h3>الألوان المتاحة</h3>
                            <div class="colors-list">
                                ${product.colors.map(color => `
                                    <span class="color-item" style="background: ${getColorValue(color)}">
                                        ${color}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${product.sizes && product.sizes.length > 0 ? `
                        <div class="detail-section">
                            <h3>المقاسات المتاحة</h3>
                            <div class="sizes-list">
                                ${product.sizes.map(size => `
                                    <span class="size-item">${size}</span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="product-stats">
                        <div class="stat">
                            <i class="fas fa-calendar"></i>
                            <div>
                                <span>تاريخ الإضافة</span>
                                <strong>${new Date(product.createdAt || Date.now()).toLocaleDateString('ar-SA')}</strong>
                            </div>
                        </div>
                        <div class="stat">
                            <i class="fas fa-sync-alt"></i>
                            <div>
                                <span>آخر تحديث</span>
                                <strong>${new Date(product.updatedAt || product.createdAt || Date.now()).toLocaleDateString('ar-SA')}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        openModal('product-modal');
    } catch (error) {
        showMessage('خطأ في تحميل تفاصيل المنتج', 'error');
    } finally {
        hideLoader();
    }
}

// الحصول على قيمة اللون
function getColorValue(color) {
    const colorMap = {
        'أحمر': '#ff0000',
        'أزرق': '#0000ff',
        'أخضر': '#00ff00',
        'أصفر': '#ffff00',
        'أسود': '#000000',
        'أبيض': '#ffffff',
        'رمادي': '#808080',
        'بني': '#a52a2a',
        'وردي': '#ffc0cb',
        'برتقالي': '#ffa500'
    };
    return colorMap[color] || '#e2e8f0';
}

// طباعة الطلب
function printOrder(orderId) {
    const printWindow = window.open('', '_blank');
    const order = state.orders.find(o => (o._id || o.id) === orderId);
    
    if (!order) {
        showMessage('الطلب غير موجود', 'error');
        return;
    }
    
    const printContent = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>فاتورة الطلب #${order.orderId || order.id}</title>
            <style>
                body {
                    font-family: 'Cairo', Arial, sans-serif;
                    direction: rtl;
                    margin: 0;
                    padding: 20px;
                    color: #333;
                    background: white;
                }
                .invoice {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 30px;
                    border: 2px solid #333;
                    border-radius: 10px;
                }
                .header {
                    text-align: center;
                    border-bottom: 3px solid #4361ee;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .header h1 {
                    color: #4361ee;
                    margin: 0 0 10px 0;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-bottom: 30px;
                }
                .info-box {
                    border: 1px solid #ddd;
                    padding: 15px;
                    border-radius: 8px;
                }
                .info-box h3 {
                    color: #4361ee;
                    margin-top: 0;
                    border-bottom: 2px solid #4361ee;
                    padding-bottom: 5px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }
                th {
                    background: #f8f9fa;
                    padding: 10px;
                    border: 1px solid #ddd;
                    text-align: center;
                }
                td {
                    padding: 8px;
                    border: 1px solid #ddd;
                    text-align: center;
                }
                .total {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    margin-top: 30px;
                }
                .total-row {
                    display: flex;
                    justify-content: space-between;
                    margin: 10px 0;
                    font-size: 1.1em;
                }
                .total-row.grand {
                    border-top: 2px solid #333;
                    padding-top: 15px;
                    font-weight: bold;
                    font-size: 1.3em;
                }
                @media print {
                    body { padding: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="invoice">
                <div class="header">
                    <h1>فاتورة الطلب #${order.orderId || order.id}</h1>
                    <p>تاريخ الطلب: ${new Date(order.createdAt || order.date).toLocaleString('ar-SA')}</p>
                    <p>حالة الطلب: ${getStatusText(order.status)}</p>
                </div>
                
                <div class="info-grid">
                    <div class="info-box">
                        <h3>معلومات العميل</h3>
                        <p><strong>الاسم:</strong> ${order.customer?.fullName || 'غير محدد'}</p>
                        <p><strong>الهاتف:</strong> ${order.customer?.phone || 'غير محدد'}</p>
                        <p><strong>الولاية:</strong> ${order.customer?.wilaya || 'غير محدد'}</p>
                        <p><strong>العنوان:</strong> ${order.customer?.address || 'غير محدد'}</p>
                    </div>
                    
                    <div class="info-box">
                        <h3>معلومات المتجر</h3>
                        <p><strong>اسم المتجر:</strong> المتجر الإلكتروني</p>
                        <p><strong>رقم الهاتف:</strong> 0550-000-000</p>
                        <p><strong>طريقة الدفع:</strong> الدفع عند الاستلام</p>
                        <p><strong>سعر التوصيل:</strong> ${order.shipping || 0} دج</p>
                    </div>
                </div>
                
                <h3>تفاصيل المنتجات</h3>
                <table>
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
                        ${order.products ? order.products.map((item, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${item.productId?.name || item.name || 'منتج'}</td>
                                <td>${item.quantity}</td>
                                <td>${item.price} دج</td>
                                <td>${(item.price * item.quantity).toFixed(2)} دج</td>
                            </tr>
                        `).join('') : ''}
                    </tbody>
                </table>
                
                <div class="total">
                    <div class="total-row">
                        <span>المجموع الفرعي:</span>
                        <span>${order.subtotal?.toFixed(2) || '0.00'} دج</span>
                    </div>
                    <div class="total-row">
                        <span>التوصيل:</span>
                        <span>${order.shipping || 0} دج</span>
                    </div>
                    <div class="total-row grand">
                        <span>المجموع الكلي:</span>
                        <span>${order.total?.toFixed(2) || '0.00'} دج</span>
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
                    <button onclick="window.print()" 
                            style="padding: 10px 20px; background: #4361ee; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        طباعة الفاتورة
                    </button>
                </div>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
}

// طباعة ورقة التوصيل
function printShippingForOrder(orderId) {
    const order = state.orders.find(o => (o._id || o.id) === orderId);
    if (!order) {
        showMessage('الطلب غير موجود', 'error');
        return;
    }
    
    DOM.shippingContent.innerHTML = `
        <div class="shipping-document">
            <div class="shipping-header">
                <div class="logo">
                    <i class="fas fa-truck"></i>
                    <h2>ورقة التوصيل</h2>
                </div>
                <div class="order-info">
                    <p><strong>رقم الطلب:</strong> ${order.orderId || order.id}</p>
                    <p><strong>التاريخ:</strong> ${new Date(order.createdAt || order.date).toLocaleDateString('ar-SA')}</p>
                </div>
            </div>
            
            <div class="shipping-grid">
                <div class="shipping-section">
                    <h3><i class="fas fa-user"></i> معلومات العميل</h3>
                    <div class="shipping-info">
                        <p><strong>الاسم:</strong> ${order.customer?.fullName || 'غير محدد'}</p>
                        <p><strong>الهاتف:</strong> ${order.customer?.phone || 'غير محدد'}</p>
                        <p><strong>الولاية:</strong> ${order.customer?.wilaya || 'غير محدد'}</p>
                        <p><strong>العنوان:</strong> ${order.customer?.address || 'غير محدد'}</p>
                    </div>
                </div>
                
                <div class="shipping-section">
                    <h3><i class="fas fa-box"></i> معلومات الشحنة</h3>
                    <div class="shipping-info">
                        <p><strong>عدد القطع:</strong> ${order.products?.length || 0}</p>
                        <p><strong>الوزن:</strong> تقريبي</p>
                        <p><strong>النوع:</strong> بضاعة تجارية</p>
                        <p><strong>قيمة الشحنة:</strong> ${order.total?.toFixed(2) || '0.00'} دج</p>
                    </div>
                </div>
            </div>
            
            <div class="shipping-section">
                <h3><i class="fas fa-list"></i> محتويات الشحنة</h3>
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
                        ${order.products ? order.products.map((item, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${item.productId?.name || item.name || 'منتج'}</td>
                                <td>${item.quantity}</td>
                                <td>
                                    ${item.color ? `اللون: ${item.color}` : ''}
                                    ${item.size ? `المقاس: ${item.size}` : ''}
                                </td>
                            </tr>
                        `).join('') : ''}
                    </tbody>
                </table>
            </div>
            
            <div class="shipping-instructions">
                <h3><i class="fas fa-info-circle"></i> تعليمات التوصيل</h3>
                <ol>
                    <li>التأكد من هوية المستلم قبل التسليم</li>
                    <li>التحقق من رقم الهاتف قبل التسليم</li>
                    <li>تسليم الطرد للعميل شخصياً فقط</li>
                    <li>الحصول على توقيع العميل عند الاستلام</li>
                    <li>في حالة عدم التمكن من التسليم، التواصل مع العميل مباشرة</li>
                </ol>
            </div>
            
            <div class="shipping-signature">
                <div class="signature-line">
                    <p>أقر بأنني استلمت الطرد بالكامل وبحالة جيدة</p>
                    <div class="signature-box">
                        <div class="signature-field">
                            <span>اسم المستلم:</span>
                            <div class="line"></div>
                        </div>
                        <div class="signature-field">
                            <span>التاريخ:</span>
                            <div class="line"></div>
                        </div>
                        <div class="signature-field">
                            <span>التوقيع:</span>
                            <div class="line"></div>
                        </div>
                    </div>
                </div>
                
                <div class="notes">
                    <p><strong>ملاحظات الموصل:</strong></p>
                    <div class="notes-box"></div>
                </div>
            </div>
        </div>
    `;
    
    openModal('shipping-modal');
}

// طباعة ورقة التوصيل
function printShipping() {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>ورقة التوصيل</title>
            <style>
                body {
                    font-family: 'Cairo', Arial, sans-serif;
                    direction: rtl;
                    margin: 0;
                    padding: 20px;
                    background: white;
                }
                ${DOM.shippingContent.innerHTML}
                @media print {
                    body { padding: 0; }
                    button { display: none; }
                }
            </style>
        </head>
        <body>
            ${DOM.shippingContent.innerHTML}
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="window.print()" 
                        style="padding: 10px 20px; background: #4361ee; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    طباعة ورقة التوصيل
                </button>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
}

// طباعة تقرير الشحن
function printShippingReport() {
    const pendingOrders = state.orders.filter(order => 
        order.status === 'pending' || order.status === 'confirmed'
    );
    
    if (pendingOrders.length === 0) {
        showMessage('لا توجد طلبات جاهزة للشحن', 'warning');
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
                .report {
                    max-width: 1000px;
                    margin: 0 auto;
                }
                .header {
                    text-align: center;
                    border-bottom: 3px solid #4361ee;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .header h1 {
                    color: #4361ee;
                    margin: 0 0 10px 0;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }
                th {
                    background: #f8f9fa;
                    padding: 10px;
                    border: 1px solid #ddd;
                    text-align: center;
                }
                td {
                    padding: 8px;
                    border: 1px solid #ddd;
                    text-align: center;
                }
                .summary {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    margin-top: 30px;
                }
                @media print {
                    body { padding: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="report">
                <div class="header">
                    <h1>تقرير الشحن</h1>
                    <p>تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}</p>
                    <p>عدد الطلبات: ${pendingOrders.length}</p>
                </div>
                
                <h3>قائمة الطلبات الجاهزة للشحن</h3>
                <table>
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
                                <td>${order.orderId || order.id}</td>
                                <td>${order.customer?.fullName || 'غير محدد'}</td>
                                <td>${order.customer?.phone || 'غير محدد'}</td>
                                <td>${order.customer?.wilaya || 'غير محدد'}</td>
                                <td>${order.customer?.address || 'غير محدد'}</td>
                                <td>${order.total?.toFixed(2) || '0.00'} دج</td>
                                <td>${getStatusText(order.status)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="summary">
                    <h4>ملخص التقرير</h4>
                    <p><strong>إجمالي عدد الطلبات:</strong> ${pendingOrders.length}</p>
                    <p><strong>إجمالي المبلغ:</strong> ${pendingOrders.reduce((sum, order) => sum + (order.total || 0), 0).toFixed(2)} دج</p>
                    <p><strong>الطلبات قيد الانتظار:</strong> ${pendingOrders.filter(o => o.status === 'pending').length}</p>
                    <p><strong>الطلبات المؤكدة:</strong> ${pendingOrders.filter(o => o.status === 'confirmed').length}</p>
                </div>
                
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px dashed #000;">
                    <div style="border-bottom: 1px solid #000; width: 200px; height: 30px; margin: 0 auto 20px auto;"></div>
                    <p style="text-align: center;">توقيع المسؤول عن الشحن</p>
                    <p style="text-align: center; margin-top: 30px;">تاريخ الإعداد: ${new Date().toLocaleDateString('ar-SA')}</p>
                </div>
                
                <div class="no-print" style="margin-top: 20px; text-align: center;">
                    <button onclick="window.print()" 
                            style="padding: 10px 20px; background: #4361ee; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        طباعة التقرير
                    </button>
                </div>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
}

// تصدير البيانات
async function exportData() {
    try {
        const data = {
            products: state.products,
            orders: state.orders,
            stats: state.stats,
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showMessage('تم تصدير البيانات بنجاح', 'success');
    } catch (error) {
        showMessage('خطأ في تصدير البيانات', 'error');
    }
}

// الاتصال بالعميل
function contactCustomer(phoneNumber) {
    if (phoneNumber) {
        if (confirm(`هل تريد الاتصال بالرقم ${phoneNumber}؟`)) {
            window.location.href = `tel:${phoneNumber}`;
        }
    } else {
        showMessage('لا يوجد رقم هاتف للعميل', 'warning');
    }
}

// نسخ رابط المنتج
function copyProductLink(slug) {
    const link = `${window.location.origin}/product.html?product=${slug}`;
    navigator.clipboard.writeText(link).then(() => {
        showMessage('تم نسخ رابط المنتج إلى الحافظة', 'success');
    }).catch(err => {
        const tempInput = document.createElement('input');
        tempInput.value = link;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        showMessage('تم نسخ رابط المنتج', 'success');
    });
}

// تبديل الأقسام
function switchSection(sectionId) {
    // إخفاء كل الأقسام
    document.querySelectorAll('.section-content').forEach(section => {
        section.classList.remove('active');
        section.classList.remove('animate__fadeIn');
    });
    
    // إزالة النشاط من القائمة
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // إظهار القسم المطلوب
    const section = document.getElementById(`${sectionId}-section`);
    if (section) {
        section.classList.add('active');
        section.classList.add('animate__fadeIn');
        
        // تحديث القائمة الجانبية
        const menuItem = document.querySelector(`.menu-item[onclick*="${sectionId}"]`);
        if (menuItem) {
            menuItem.classList.add('active');
        }
        
        state.activeSection = sectionId;
        
        // إغلاق القائمة الجانبية على الهواتف
        if (window.innerWidth <= 768) {
            document.querySelector('.sidebar').classList.remove('active');
        }
        
        // إضافة تأثير
        section.style.animation = 'none';
        setTimeout(() => {
            section.style.animation = '';
        }, 10);
    }
}

// إدارة القائمة الجانبية على الهواتف
function setupMobileMenu() {
    function toggleSidebar() {
        document.querySelector('.sidebar').classList.toggle('active');
    }
    
    // تعيين الحدث للأزرار
    const menuToggle = document.querySelector('.menu-toggle');
    if (menuToggle) {
        menuToggle.onclick = toggleSidebar;
    }
    
    // إغلاق القائمة بالنقر خارجها
    document.addEventListener('click', (e) => {
        const sidebar = document.querySelector('.sidebar');
        const menuToggle = document.querySelector('.menu-toggle');
        
        if (sidebar && sidebar.classList.contains('active') &&
            !sidebar.contains(e.target) &&
            !menuToggle.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });
}

// تحميل الإشعارات
async function loadNotifications() {
    try {
        const response = await fetch('/api/notifications');
        if (response.ok) {
            state.notifications = await response.json();
            renderNotifications();
        } else {
            // بيانات افتراضية للإشعارات
            state.notifications = [
                {
                    id: 1,
                    title: 'طلب جديد',
                    message: 'تم استلام طلب جديد #ORD12345',
                    time: 'قبل 5 دقائق',
                    read: false,
                    type: 'order'
                },
                {
                    id: 2,
                    title: 'منتج نفد',
                    message: 'الكمية نفدت من المنتج "قميص رجالي"',
                    time: 'قبل ساعة',
                    read: false,
                    type: 'product'
                },
                {
                    id: 3,
                    title: 'تحديث النظام',
                    message: 'تم تحديث النظام إلى الإصدار 2.1.0',
                    time: 'قبل يوم',
                    read: true,
                    type: 'system'
                }
            ];
            renderNotifications();
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
        // بيانات افتراضية في حالة الخطأ
        state.notifications = [];
        renderNotifications();
    }
}

// عرض الإشعارات
function renderNotifications() {
    const unreadCount = state.notifications.filter(n => !n.read).length;
    DOM.notificationCount.textContent = unreadCount;
    
    DOM.notificationsList.innerHTML = state.notifications.map(notification => `
        <div class="notification-item ${notification.read ? '' : 'unread'}">
            <div class="notification-title">
                <i class="fas ${getNotificationIcon(notification.type)}"></i>
                ${notification.title}
            </div>
            <div class="notification-message">
                ${notification.message}
            </div>
            <div class="notification-time">
                <i class="far fa-clock"></i>
                ${notification.time}
            </div>
        </div>
    `).join('');
}

// الحصول على أيقونة الإشعار
function getNotificationIcon(type) {
    const icons = {
        'order': 'fa-shopping-cart',
        'product': 'fa-box',
        'system': 'fa-cog',
        'warning': 'fa-exclamation-triangle',
        'success': 'fa-check-circle'
    };
    return icons[type] || 'fa-bell';
}

// تبديل عرض الإشعارات
function toggleNotifications() {
    const dropdown = document.getElementById('notifications-dropdown');
    dropdown.classList.toggle('show');
}

// تعليم الإشعارات كمقروءة
function markAllAsRead() {
    state.notifications.forEach(n => n.read = true);
    renderNotifications();
    showMessage('تم تعليم جميع الإشعارات كمقروءة', 'success');
}

// إضافة إشعار جديد
function addNotification(title, message, type = 'system') {
    const notification = {
        id: Date.now(),
        title,
        message,
        time: 'الآن',
        read: false,
        type
    };
    
    state.notifications.unshift(notification);
    renderNotifications();
    
    // تأثير صوتي
    playNotificationSound();
}

// تشغيل صوت الإشعار
function playNotificationSound() {
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
        audio.volume = 0.3;
        audio.play();
    } catch (e) {
        // تجاهل الخطأ إذا لم يكن الصوت مدعوماً
    }
}

// إدارة المودال
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // إضافة تأثير
        modal.style.animation = 'none';
        setTimeout(() => {
            modal.style.animation = '';
        }, 10);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = 'auto';
}

// عرض الرسائل
function showMessage(message, type = 'info') {
    const messageId = Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.className = `floating-message ${type}`;
    messageDiv.id = `message-${messageId}`;
    
    const icons = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };
    
    messageDiv.innerHTML = `
        <i class="fas ${icons[type] || 'fa-info-circle'}"></i>
        <div class="floating-message-content">
            <h4>${type === 'success' ? 'نجاح' : type === 'error' ? 'خطأ' : type === 'warning' ? 'تحذير' : 'معلومة'}</h4>
            <p>${message}</p>
        </div>
        <button class="floating-message-close" onclick="removeMessage('${messageId}')">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    DOM.floatingMessages.appendChild(messageDiv);
    
    // إزالة الرسالة بعد 5 ثواني
    setTimeout(() => {
        removeMessage(messageId);
    }, 5000);
}

function removeMessage(messageId) {
    const message = document.getElementById(`message-${messageId}`);
    if (message) {
        message.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 300);
    }
}

// إدارة التحميل
function showLoader() {
    DOM.loader.style.display = 'flex';
    setTimeout(() => {
        DOM.loader.style.opacity = '1';
    }, 10);
}

function hideLoader() {
    DOM.loader.style.opacity = '0';
    setTimeout(() => {
        DOM.loader.style.display = 'none';
    }, 300);
}

// التحديث التلقائي
function startAutoRefresh() {
    setInterval(async () => {
        await loadOrders();
        await loadStats();
        updateCurrentDate();
        
        // تحديث العداد إذا كان هناك طلبات جديدة
        const previousOrdersCount = state.orders.length;
        const newOrdersCount = state.orders.length; // سيتم تحديثه في loadOrders
        
        if (newOrdersCount > previousOrdersCount) {
            addNotification('طلبات جديدة', `لديك ${newOrdersCount - previousOrdersCount} طلب جديد`, 'order');
        }
    }, 60000); // كل دقيقة
}

// تحديث كل شيء
async function refreshAll() {
    showLoader();
    await Promise.all([
        loadProducts(),
        loadOrders(),
        loadStats(),
        loadNotifications()
    ]);
    hideLoader();
    showMessage('تم تحديث البيانات', 'success');
}

// تحديث الطلبات فقط
async function refreshOrders() {
    await loadOrders();
    showMessage('تم تحديث الطلبات', 'success');
}

// تأثيرات الإحصائيات
function animateStats() {
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('animate__pulse');
            setTimeout(() => {
                card.classList.remove('animate__pulse');
            }, 1000);
        }, index * 200);
    });
}

// تسجيل الخروج
function logout() {
    if (confirm('هل تريد تسجيل الخروج؟')) {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
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

// دعم السحب والإفلات للهواتف
function setupDragAndDrop() {
    let touchStartY = 0;
    
    document.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    });
    
    document.addEventListener('touchmove', (e) => {
        const touchY = e.touches[0].clientY;
        const diff = touchStartY - touchY;
        
        // سحب لأسفل لتحديث الصفحة
        if (diff > 50 && window.scrollY === 0) {
            refreshAll();
            touchStartY = touchY;
        }
    });
}

// تهيئة السحب والإفلات
setupDragAndDrop();

// تهيئة الحاوية عند التحميل
window.addEventListener('load', () => {
    // تأخير بسيط لضمان تحميل كل شيء
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});