// حالة التطبيق
const state = {
    products: [],
    cart: [],
    shippingPrices: {},
    wilayas: [],
    selectedWilaya: '',
    isLoading: false
};

// عناصر DOM
const DOM = {
    // المنتجات
    productsContainer: document.getElementById('products-container'),
    loadingProducts: document.getElementById('loading-products'),
    productSearch: document.getElementById('search-products'),
    sortSelect: document.getElementById('sort-products'),
    
    // السلة
    cartSidebar: document.querySelector('.cart-sidebar'),
    cartItems: document.getElementById('cart-items'),
    emptyCart: document.getElementById('empty-cart'),
    cartSummary: document.getElementById('cart-summary'),
    cartCount: document.querySelector('.cart-count'),
    subtotal: document.getElementById('subtotal'),
    shipping: document.getElementById('shipping'),
    total: document.getElementById('total'),
    checkoutBtn: document.getElementById('checkout-btn'),
    closeCartBtn: document.querySelector('.close-cart'),
    
    // المودال
    checkoutModal: document.getElementById('checkout-modal'),
    checkoutForm: document.getElementById('checkout-form'),
    checkoutSummary: document.getElementById('checkout-summary'),
    
    // عناصر اتمام الطلب
    fullName: document.getElementById('full-name'),
    phone: document.getElementById('phone'),
    email: document.getElementById('email'),
    wilayaSelect: document.getElementById('wilaya'),
    shippingPrice: document.getElementById('shipping-price'),
    address: document.getElementById('address'),
    notes: document.getElementById('notes'),
    
    // الروابط
    cartLink: document.querySelector('.cart-link')
};

// تهيئة التطبيق
async function init() {
    await loadProducts();
    await loadShippingData();
    setupEventListeners();
    loadCartFromStorage();
    updateCartUI();
}

// إعداد المستمعين للأحداث
function setupEventListeners() {
    // البحث والترتيب
    DOM.productSearch.addEventListener('input', filterAndSortProducts);
    DOM.sortSelect.addEventListener('change', filterAndSortProducts);
    
    // السلة
    DOM.cartLink.addEventListener('click', (e) => {
        e.preventDefault();
        DOM.cartSidebar.classList.add('open');
    });
    
    DOM.closeCartBtn.addEventListener('click', () => {
        DOM.cartSidebar.classList.remove('open');
    });
    
    DOM.checkoutBtn.addEventListener('click', () => {
        if (state.cart.length === 0) {
            showAlert('السلة فارغة', 'error');
            return;
        }
        openCheckoutModal();
    });
    
    // اتمام الطلب
    DOM.checkoutForm.addEventListener('submit', handleCheckout);
    DOM.wilayaSelect.addEventListener('change', updateShippingPrice);
    
    // إغلاق المودال
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            DOM.checkoutModal.style.display = 'none';
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === DOM.checkoutModal) {
            DOM.checkoutModal.style.display = 'none';
        }
    });
    
    // تحديث السلة عند تغيير التخزين المحلي
    window.addEventListener('storage', () => {
        loadCartFromStorage();
    });
}

// جلب المنتجات
async function loadProducts() {
    try {
        state.isLoading = true;
        DOM.loadingProducts.style.display = 'block';
        
        const response = await fetch('/api/products');
        if (response.ok) {
            state.products = await response.json();
            renderProducts();
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showAlert('خطأ في تحميل المنتجات', 'error');
    } finally {
        state.isLoading = false;
        DOM.loadingProducts.style.display = 'none';
    }
}

// جلب بيانات التوصيل
async function loadShippingData() {
    try {
        const response = await fetch('/api/shipping');
        if (response.ok) {
            const data = await response.json();
            state.shippingPrices = data.prices;
            state.wilayas = data.wilayas;
            populateWilayaSelect();
        }
    } catch (error) {
        console.error('Error loading shipping data:', error);
    }
}

// تعبئة قائمة الولايات
function populateWilayaSelect() {
    state.wilayas.forEach(wilaya => {
        const option = document.createElement('option');
        option.value = wilaya;
        option.textContent = wilaya;
        DOM.wilayaSelect.appendChild(option);
    });
}

// تصفية وترتيب المنتجات
function filterAndSortProducts() {
    let filtered = [...state.products];
    
    // التصفية حسب البحث
    const searchTerm = DOM.productSearch.value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(product =>
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm) ||
            product.category.toLowerCase().includes(searchTerm)
        );
    }
    
    // الترتيب
    const sortBy = DOM.sortSelect.value;
    switch (sortBy) {
        case 'price-low':
            filtered.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            filtered.sort((a, b) => b.price - a.price);
            break;
        case 'discount':
            filtered.sort((a, b) => (b.discount || 0) - (a.discount || 0));
            break;
        case 'newest':
        default:
            filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    renderProducts(filtered);
}

// عرض المنتجات
function renderProducts(products = state.products) {
    DOM.productsContainer.innerHTML = products.map(product => `
        <div class="product-card">
            ${product.discount > 0 ? 
                `<span class="discount-badge">${product.discount}% خصم</span>` : ''
            }
            ${product.stock === 0 ? 
                `<span class="out-of-stock-badge">نفذت الكمية</span>` : ''
            }
<div class="product-image" onclick="viewProductPage('${product.slug || product._id}')">
    ${product.mainImage ? 
        `<img src="${product.mainImage}" alt="${product.name}" loading="lazy">` :
        product.images && product.images.length > 0 ?
            `<img src="${product.images[0].data}" alt="${product.name}" loading="lazy">` :
            `<img src="/api/placeholder/200/200" alt="لا توجد صورة" loading="lazy" style="background: #f5f5f5; object-fit: cover;">`
    }
</div>
            <div class="product-info">
                <h3 class="product-title" onclick="viewProductPage('${product.slug || product._id}')">
                    ${product.name}
                </h3>
                <p class="product-description">${product.description.substring(0, 60)}...</p>
                <div class="product-price">
                    ${product.discount > 0 ? `
                        <span class="original-price">
                            ${product.originalPrice || product.price} دج
                        </span>
                    ` : ''}
                    <span class="current-price">
                        ${calculateDiscountedPrice(product)} دج
                    </span>
                </div>
                <div class="product-meta">
                    <span class="product-stock ${getStockClass(product.stock)}">
                        ${getStockText(product.stock)}
                    </span>
                    <span class="product-views">
                        <i class="fas fa-eye"></i> ${product.views || 0}
                    </span>
                </div>
                <div class="product-actions">
                    <button class="btn btn-outline btn-view-details" onclick="viewProductPage('${product.slug || product._id}')">
                        <i class="fas fa-eye"></i> التفاصيل
                    </button>
                    <button class="btn btn-primary" onclick="addToCart('${product._id}')" 
                            ${product.stock === 0 ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i> إضافة للسلة
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// الحصول على فئة المخزون
function getStockClass(stock) {
    if (stock === 0) return 'out-of-stock';
    if (stock <= 10) return 'low-stock';
    return 'in-stock';
}

// الحصول على نص المخزون
function getStockText(stock) {
    if (stock === 0) return 'نفذت الكمية';
    if (stock <= 10) return 'كمية محدودة';
    return 'متوفر';
}

// حساب السعر بعد الخصم
function calculateDiscountedPrice(product) {
    if (product.discount > 0) {
        const price = product.originalPrice || product.price;
        return (price * (100 - product.discount) / 100).toFixed(2);
    }
    return product.price.toFixed(2);
}

// الانتقال إلى صفحة المنتج
function viewProductPage(productId) {
    window.location.href = `product.html?product=${productId}`;
}

// إضافة إلى السلة
function addToCart(productId, quantity = 1, color = null, size = null) {
    const product = state.products.find(p => p._id === productId);
    if (!product) return;
    
    if (product.stock < quantity) {
        showAlert('الكمية المطلوبة غير متاحة', 'error');
        return;
    }
    
    const existingItem = state.cart.find(item => 
        item.productId === productId && 
        item.color === color && 
        item.size === size
    );
    
    if (existingItem) {
        if (existingItem.quantity + quantity > product.stock) {
            showAlert('لا يمكن إضافة المزيد، الكمية غير متاحة', 'error');
            return;
        }
        existingItem.quantity += quantity;
    } else {
        state.cart.push({
            productId,
            product: product,
            quantity,
            color,
            size,
            price: calculateDiscountedPrice(product)
        });
    }
    
    saveCartToStorage();
    updateCartUI();
    showAlert('تمت الإضافة إلى السلة', 'success');
    
    // فتح السلة إذا كانت مغلقة
    if (!DOM.cartSidebar.classList.contains('open')) {
        DOM.cartSidebar.classList.add('open');
    }
}

// تحديث واجهة السلة
function updateCartUI() {
    // تحديث العداد
    const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    DOM.cartCount.textContent = totalItems;
    
    // عرض/إخفاء السلة الفارغة
    if (state.cart.length === 0) {
        DOM.emptyCart.style.display = 'block';
        DOM.cartSummary.style.display = 'none';
    } else {
        DOM.emptyCart.style.display = 'none';
        DOM.cartSummary.style.display = 'block';
        
        // تحديث العناصر
        DOM.cartItems.innerHTML = state.cart.map((item, index) => `
            <div class="cart-item">
                <div class="cart-item-image">
                    ${item.product.mainImage ? 
                        `<img src="${item.product.mainImage}" alt="${item.product.name}">` :
                        `<i class="fas fa-box"></i>`
                    }
                </div>
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.product.name}</div>
                    ${item.color ? `<div class="cart-item-meta">اللون: ${item.color}</div>` : ''}
                    ${item.size ? `<div class="cart-item-meta">المقاس: ${item.size}</div>` : ''}
                    <div class="cart-item-price">${item.price} دج للواحدة</div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn" onclick="updateQuantity(${index}, ${item.quantity - 1})">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateQuantity(${index}, ${item.quantity + 1})">+</button>
                    </div>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
        
        // تحديث المجموع
        const subtotal = state.cart.reduce((sum, item) => 
            sum + (parseFloat(item.price) * item.quantity), 0
        );
        
        const shipping = state.selectedWilaya ? 
            (state.shippingPrices[state.selectedWilaya] || 600) : 0;
        const total = subtotal + shipping;
        
        DOM.subtotal.textContent = subtotal.toFixed(2) + ' دج';
        DOM.shipping.textContent = shipping + ' دج';
        DOM.total.textContent = total.toFixed(2) + ' دج';
    }
}

// تحديث الكمية
function updateQuantity(index, newQuantity) {
    if (newQuantity < 1) {
        removeFromCart(index);
        return;
    }
    
    const item = state.cart[index];
    if (newQuantity > item.product.stock) {
        showAlert('الكمية غير متاحة', 'error');
        return;
    }
    
    item.quantity = newQuantity;
    saveCartToStorage();
    updateCartUI();
}

// إزالة من السلة
function removeFromCart(index) {
    state.cart.splice(index, 1);
    saveCartToStorage();
    updateCartUI();
    showAlert('تمت الإزالة من السلة', 'success');
}

// حفظ السلة في التخزين المحلي
function saveCartToStorage() {
    try {
        const cartData = state.cart.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            color: item.color,
            size: item.size
        }));
        localStorage.setItem('cart', JSON.stringify(cartData));
    } catch (error) {
        console.error('Error saving cart:', error);
    }
}

// تحميل السلة من التخزين المحلي
function loadCartFromStorage() {
    try {
        const savedCart = JSON.parse(localStorage.getItem('cart')) || [];
        state.cart = savedCart.map(savedItem => {
            const product = state.products.find(p => p._id === savedItem.productId);
            if (product) {
                return {
                    ...savedItem,
                    product,
                    price: calculateDiscountedPrice(product)
                };
            }
            return null;
        }).filter(item => item !== null);
        
        updateCartUI();
    } catch (error) {
        console.error('Error loading cart:', error);
    }
}

// فتح نافذة اتمام الطلب
function openCheckoutModal() {
    // تعبئة ملخص الطلب
    const subtotal = state.cart.reduce((sum, item) => 
        sum + (parseFloat(item.price) * item.quantity), 0
    );
    
    DOM.checkoutSummary.innerHTML = `
        <div class="checkout-items">
            ${state.cart.map(item => `
                <div class="checkout-item">
                    <span>${item.product.name} (${item.quantity}x)</span>
                    <span>${(parseFloat(item.price) * item.quantity).toFixed(2)} دج</span>
                </div>
            `).join('')}
        </div>
        <div class="checkout-totals">
            <div class="summary-item">
                <span>المجموع الفرعي:</span>
                <span>${subtotal.toFixed(2)} دج</span>
            </div>
            <div class="summary-item">
                <span>التوصيل:</span>
                <span id="checkout-shipping">0 دج</span>
            </div>
            <div class="summary-item total">
                <span>المجموع الكلي:</span>
                <span id="checkout-total">${subtotal.toFixed(2)} دج</span>
            </div>
        </div>
    `;
    
    // إعادة تعيين النموذج
    DOM.checkoutForm.reset();
    state.selectedWilaya = '';
    updateShippingPrice();
    
    DOM.checkoutModal.style.display = 'block';
}

// إغلاق نافذة اتمام الطلب
function closeCheckoutModal() {
    DOM.checkoutModal.style.display = 'none';
}

// تحديث سعر التوصيل
function updateShippingPrice() {
    state.selectedWilaya = DOM.wilayaSelect.value;
    const shippingPrice = state.selectedWilaya ? 
        (state.shippingPrices[state.selectedWilaya] || 600) : 0;
    
    DOM.shippingPrice.value = shippingPrice + ' دج';
    
    // تحديث المجموع في ملخص الطلب
    const subtotal = state.cart.reduce((sum, item) => 
        sum + (parseFloat(item.price) * item.quantity), 0
    );
    const total = subtotal + shippingPrice;
    
    const checkoutShipping = document.getElementById('checkout-shipping');
    const checkoutTotal = document.getElementById('checkout-total');
    
    if (checkoutShipping) {
        checkoutShipping.textContent = shippingPrice + ' دج';
    }
    if (checkoutTotal) {
        checkoutTotal.textContent = total.toFixed(2) + ' دج';
    }
}

// معالجة اتمام الطلب
async function handleCheckout(e) {
    e.preventDefault();
    
    if (state.cart.length === 0) {
        showAlert('السلة فارغة', 'error');
        return;
    }
    
    if (!state.selectedWilaya) {
        showAlert('الرجاء اختيار الولاية', 'error');
        return;
    }
    
    const orderData = {
        products: state.cart.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            color: item.color,
            size: item.size
        })),
        customer: {
            fullName: DOM.fullName.value,
            phone: DOM.phone.value,
            email: DOM.email.value || '',
            wilaya: state.selectedWilaya,
            address: DOM.address.value,
            notes: DOM.notes.value || ''
        }
    };
    
    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // إظهار رسالة النجاح
            DOM.checkoutModal.style.display = 'none';
            DOM.cartSidebar.classList.remove('open');
            
            // إفراغ السلة
            state.cart = [];
            saveCartToStorage();
            updateCartUI();
            
            // عرض رسالة النجاح
            showOrderSuccess(result.message, result.orderId);
            
        } else {
            const error = await response.json();
            showAlert(`خطأ: ${error.error}`, 'error');
        }
    } catch (error) {
        showAlert('خطأ في إرسال الطلب', 'error');
    }
}

// عرض رسالة نجاح الطلب
function showOrderSuccess(message, orderId) {
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success';
    successDiv.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <div>
            <strong>تم استلام طلبك بنجاح!</strong>
            <p>${message}</p>
            <p><strong>رقم الطلب:</strong> ${orderId}</p>
            <p>سنقوم بالاتصال بك على الرقم المقدم للتأكيد في أقرب وقت ممكن.</p>
            <button class="btn btn-primary" onclick="this.parentElement.parentElement.remove()">
                موافق
            </button>
        </div>
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        if (successDiv.parentElement) {
            successDiv.remove();
        }
    }, 10000);
}

// عرض تنبيه
function showAlert(message, type) {
    // إزالة التنبيهات السابقة
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 3000);
}

// فلترة حسب الفئة
function filterByCategory(category) {
    DOM.productSearch.value = category;
    filterAndSortProducts();
    
    // تمرير إلى قسم المنتجات
    document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
}

// تشغيل التطبيق
document.addEventListener('DOMContentLoaded', init);
document.addEventListener('DOMContentLoaded', () => {
    // إصلاح ارتفاع viewport للهواتف
    function setViewportHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);
    
    // منع التكبير في حقول الإدخال على الهواتف
    document.querySelectorAll('input, textarea, select').forEach(el => {
        el.addEventListener('focus', () => {
            el.style.fontSize = '16px'; // إصلاح لمشكلة التكبير التلقائي في iOS
        });
    });
    
    // تحسين تجربة اللمس
    document.addEventListener('touchstart', () => {}, { passive: true });
    
    // إضافة loading state للأزرار
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            if (this.classList.contains('btn-primary') || this.classList.contains('btn-secondary')) {
                const originalHTML = this.innerHTML;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحميل...';
                this.disabled = true;
                
                // استعادة الحالة الأصلية بعد ثانية (للتجربة فقط)
                setTimeout(() => {
                    this.innerHTML = originalHTML;
                    this.disabled = false;
                }, 1000);
            }
        });
    });
    
    // تحسين أداء الصور
    const lazyLoadImages = () => {
        const images = document.querySelectorAll('img[loading="lazy"]');
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.src;
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    };
    
    if ('IntersectionObserver' in window) {
        lazyLoadImages();
    }
    
    // إضافة تأثيرات للمس
    document.querySelectorAll('.category-card, .product-card, .btn').forEach(el => {
        el.addEventListener('touchstart', () => {
            el.classList.add('touch-active');
        });
        
        el.addEventListener('touchend', () => {
            setTimeout(() => {
                el.classList.remove('touch-active');
            }, 150);
        });
    });
});

// تحسين عرض المنتجات للهواتف
function optimizeForMobile() {
    const productsGrid = document.querySelector('.products-grid');
    const searchBox = document.querySelector('.search-box');
    const sortSelect = document.querySelector('#sort-products');
    
    if (window.innerWidth <= 768) {
        // إضافة padding إضافي للهواتف
        document.body.style.paddingBottom = '20px';
        
        // تحسين عرض البحث
        if (searchBox) {
            searchBox.style.width = '100%';
        }
        
        // تحسين عرض منتج واحد لكل صف للهواتف الصغيرة
        if (productsGrid && window.innerWidth <= 480) {
            productsGrid.style.gridTemplateColumns = '1fr';
        }
    }
}

// تشغيل التحسينات عند التحميل وعند تغيير الحجم
window.addEventListener('load', optimizeForMobile);
window.addEventListener('resize', optimizeForMobile);
