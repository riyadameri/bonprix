// حالة التطبيق
const state = {
    product: null,
    relatedProducts: [],
    selectedColor: null,
    selectedSize: null,
    quantity: 1,
    cart: []
};

// عناصر DOM
const DOM = {
    productDetailPage: document.getElementById('product-detail-page'),
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    cartCount: document.querySelector('.cart-count')
};

// تهيئة التطبيق
async function init() {
    await loadCartFromStorage();
    await loadProduct();
    setupEventListeners();
}

// تحميل المنتج من الرابط
async function loadProduct() {
    const urlParams = new URLSearchParams(window.location.search);
    const productParam = urlParams.get('product');
    
    if (!productParam) {
        showError();
        return;
    }
    
    try {
        // محاولة جلب المنتج بواسطة الرابط الفريد أولاً
        let response = await fetch(`/api/products/slug/${productParam}`);
        
        // إذا لم يُوجد، جرب باستخدام الـ ID
        if (!response.ok) {
            response = await fetch(`/api/products/${productParam}`);
        }
        
        if (response.ok) {
            state.product = await response.json();
            await loadRelatedProducts();
            renderProduct();
        } else {
            showError();
        }
    } catch (error) {
        console.error('Error loading product:', error);
        showError();
    }
}

// تحميل منتجات ذات صلة
async function loadRelatedProducts() {
    if (!state.product) return;
    
    try {
        const response = await fetch(`/api/products?category=${state.product.category}&limit=4`);
        if (response.ok) {
            const products = await response.json();
            // استبعاد المنتج الحالي
            state.relatedProducts = products.filter(p => p._id !== state.product._id).slice(0, 4);
        }
    } catch (error) {
        console.error('Error loading related products:', error);
    }
}

// عرض المنتج
function renderProduct() {
    if (!state.product) return;
    
    DOM.loading.style.display = 'none';
    DOM.productDetailPage.style.display = 'block';
    
    DOM.productDetailPage.innerHTML = `
        <div class="product-header">
            <div>
                <h1 class="product-title">${state.product.name}</h1>
                <div class="product-meta">
                    <span class="category">${state.product.category}</span>
                    <span class="views"><i class="fas fa-eye"></i> ${state.product.views || 0} مشاهدة</span>
                    <span class="stock-status ${getStockClass(state.product.stock)}">
                        <i class="fas fa-box"></i>
                        ${getStockText(state.product.stock)}
                    </span>
                </div>
                <div class="share-bar">
                    <a href="#" class="share-btn share-facebook" onclick="shareOnFacebook(event)">
                        <i class="fab fa-facebook-f"></i>
                    </a>
                    <a href="#" class="share-btn share-twitter" onclick="shareOnTwitter(event)">
                        <i class="fab fa-twitter"></i>
                    </a>
                    <a href="#" class="share-btn share-whatsapp" onclick="shareOnWhatsApp(event)">
                        <i class="fab fa-whatsapp"></i>
                    </a>
                    <button class="share-btn share-link" onclick="copyProductLink()">
                        <i class="fas fa-link"></i>
                    </button>
                </div>
            </div>
        </div>
        
        <div class="product-content">
            <!-- معرض الصور -->
            <div class="image-gallery">
                <div class="main-image" id="main-image">
                    ${state.product.images && state.product.images.length > 0 ? 
                        `<img src="${state.product.images.find(img => img.isMain)?.data || state.product.images[0].data}" 
                              alt="${state.product.name}" id="main-product-image">` :
                        `<div class="no-image">
                            <i class="fas fa-image"></i>
                            <p>لا توجد صور للمنتج</p>
                        </div>`
                    }
                </div>
                ${state.product.images && state.product.images.length > 1 ? `
                    <div class="thumbnails">
                        ${state.product.images.map((img, index) => `
                            <div class="thumbnail ${img.isMain ? 'active' : ''}" 
                                 onclick="changeMainImage('${img.data}', this)">
                                <img src="${img.data}" alt="Thumbnail ${index + 1}">
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            
            <!-- معلومات المنتج -->
            <div class="product-info">
                <div class="price-section">
                    <div class="price">
                        ${state.product.discount > 0 ? `
                            <span class="original-price">
                                ${state.product.originalPrice || state.product.price} دج
                            </span>
                        ` : ''}
                        <span class="current-price">
                            ${calculateDiscountedPrice(state.product)} دج
                        </span>
                        ${state.product.discount > 0 ? `
                            <span class="discount-badge">${state.product.discount}% خصم</span>
                        ` : ''}
                    </div>
                </div>
                
                ${state.product.colors && state.product.colors.length > 0 ? `
                    <div class="options-section">
                        <h3 class="options-title">اختر اللون</h3>
                        <div class="options-list" id="color-options">
                            ${state.product.colors.map(color => `
                                <div class="option-item color-option ${state.selectedColor === color ? 'selected' : ''}"
                                     onclick="selectColor('${color}')">
                                    ${color}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${state.product.sizes && state.product.sizes.length > 0 ? `
                    <div class="options-section">
                        <h3 class="options-title">اختر المقاس</h3>
                        <div class="options-list" id="size-options">
                            ${state.product.sizes.map(size => `
                                <div class="option-item size-option ${state.selectedSize === size ? 'selected' : ''}"
                                     onclick="selectSize('${size}')">
                                    ${size}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="quantity-selector">
                    <label>الكمية:</label>
                    <button class="quantity-btn" onclick="changeQuantity(-1)">-</button>
                    <input type="number" class="quantity-input" 
                           value="${state.quantity}" 
                           min="1" 
                           max="${state.product.stock}"
                           onchange="updateQuantity(this.value)">
                    <button class="quantity-btn" onclick="changeQuantity(1)">+</button>
                    <span>${state.product.stock} وحدة متاحة</span>
                </div>
                
                <div class="action-buttons">
                    <button class="btn btn-primary btn-block" onclick="addToCart()" 
                            ${state.product.stock === 0 ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i>
                        ${state.product.stock === 0 ? 'نفذت الكمية' : 'أضف إلى السلة'}
                    </button>
                    <button class="btn btn-secondary btn-block" onclick="goToStore()">
                        <i class="fas fa-store"></i> العودة للمتجر
                    </button>
                </div>
                
                <div class="description-section">
                    <h3>وصف المنتج</h3>
                    <p>${state.product.description}</p>
                </div>
                
                ${state.product.features && state.product.features.length > 0 ? `
                    <div class="features-section">
                        <h3>مميزات المنتج</h3>
                        <ul class="features-list">
                            ${state.product.features.map(feature => `
                                <li><i class="fas fa-check"></i> ${feature}</li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${state.relatedProducts.length > 0 ? `
                    <div class="related-products">
                        <h3>منتجات مشابهة</h3>
                        <div class="related-grid">
                            ${state.relatedProducts.map(product => `
                                <a href="product.html?product=${product.slug || product._id}" class="related-item">
                                    <div class="related-image">
                                        ${product.mainImage ? 
                                            `<img src="${product.mainImage}" alt="${product.name}">` :
                                            `<i class="fas fa-box" style="color: #ccc;"></i>`
                                        }
                                    </div>
                                    <div class="related-title">${product.name.substring(0, 30)}${product.name.length > 30 ? '...' : ''}</div>
                                    <div class="related-price">${calculateDiscountedPrice(product)} دج</div>
                                </a>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// حساب السعر بعد الخصم
function calculateDiscountedPrice(product) {
    if (product.discount > 0) {
        const price = product.originalPrice || product.price;
        return (price * (100 - product.discount) / 100).toFixed(2);
    }
    return product.price.toFixed(2);
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

// تغيير الصورة الرئيسية
function changeMainImage(imageData, element) {
    const mainImage = document.getElementById('main-product-image');
    if (mainImage) {
        mainImage.src = imageData;
    }
    
    // تحديث حالة الصور المصغرة
    document.querySelectorAll('.thumbnail').forEach(thumb => {
        thumb.classList.remove('active');
    });
    element.classList.add('active');
}

// تحديد اللون
function selectColor(color) {
    state.selectedColor = color;
    document.querySelectorAll('.color-option').forEach(option => {
        option.classList.toggle('selected', option.textContent === color);
    });
}

// تحديد المقاس
function selectSize(size) {
    state.selectedSize = size;
    document.querySelectorAll('.size-option').forEach(option => {
        option.classList.toggle('selected', option.textContent === size);
    });
}

// تغيير الكمية
function changeQuantity(change) {
    const newQuantity = state.quantity + change;
    if (newQuantity >= 1 && newQuantity <= state.product.stock) {
        state.quantity = newQuantity;
        updateQuantityInput();
    }
}

// تحديث حقل الكمية
function updateQuantity(value) {
    const quantity = parseInt(value) || 1;
    if (quantity >= 1 && quantity <= state.product.stock) {
        state.quantity = quantity;
        updateQuantityInput();
    }
}

function updateQuantityInput() {
    const input = document.querySelector('.quantity-input');
    if (input) {
        input.value = state.quantity;
    }
}

// إضافة إلى السلة
async function addToCart() {
    if (!state.product || state.product.stock === 0) return;
    
    if (state.quantity > state.product.stock) {
        showAlert('الكمية المطلوبة غير متاحة', 'error');
        return;
    }
    
    const cartItem = {
        productId: state.product._id,
        product: {
            _id: state.product._id,
            name: state.product.name,
            price: calculateDiscountedPrice(state.product),
            mainImage: state.product.images?.[0]?.data
        },
        quantity: state.quantity,
        color: state.selectedColor,
        size: state.selectedSize,
        price: calculateDiscountedPrice(state.product)
    };
    
    // تحميل السلة من localStorage
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // التحقق إذا كان المنتج موجود بالفعل
    const existingIndex = cart.findIndex(item => 
        item.productId === cartItem.productId &&
        item.color === cartItem.color &&
        item.size === cartItem.size
    );
    
    if (existingIndex !== -1) {
        cart[existingIndex].quantity += cartItem.quantity;
    } else {
        cart.push(cartItem);
    }
    
    // حفظ السلة
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // تحديث العداد
    await loadCartFromStorage();
    
    showAlert('تمت إضافة المنتج إلى السلة بنجاح', 'success');
}

// تحميل السلة من التخزين المحلي
async function loadCartFromStorage() {
    try {
        const savedCart = JSON.parse(localStorage.getItem('cart')) || [];
        state.cart = savedCart;
        updateCartCount();
    } catch (error) {
        console.error('Error loading cart:', error);
    }
}

// تحديث عداد السلة
function updateCartCount() {
    const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    DOM.cartCount.textContent = totalItems;
}

// العودة للمتجر
function goToStore() {
    window.location.href = 'buyer.html';
}

// المشاركة على Facebook
function shareOnFacebook(e) {
    e.preventDefault();
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(state.product.name);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${title}`, '_blank', 'width=600,height=400');
}

// المشاركة على Twitter
function shareOnTwitter(e) {
    e.preventDefault();
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`تفقد ${state.product.name} في المتجر الإلكتروني`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'width=600,height=400');
}

// المشاركة على WhatsApp
function shareOnWhatsApp(e) {
    e.preventDefault();
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`تفقد ${state.product.name} في المتجر الإلكتروني:\n${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'width=600,height=600');
}

// نسخ رابط المنتج
function copyProductLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        showAlert('تم نسخ رابط المنتج إلى الحافظة', 'success');
    }).catch(err => {
        // Fallback
        const tempInput = document.createElement('input');
        tempInput.value = window.location.href;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        showAlert('تم نسخ رابط المنتج إلى الحافظة', 'success');
    });
}

// عرض الخطأ
function showError() {
    DOM.loading.style.display = 'none';
    DOM.error.style.display = 'block';
}

// إعداد المستمعين للأحداث
function setupEventListeners() {
    // تحديث عداد السلة عند إضافة منتجات
    window.addEventListener('storage', (e) => {
        if (e.key === 'cart') {
            loadCartFromStorage();
        }
    });
    
    // تحديث العنوان مع اسم المنتج
    if (state.product) {
        document.title = `${state.product.name} - المتجر الإلكتروني`;
    }
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
