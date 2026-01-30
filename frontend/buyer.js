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

    optimizeImages();
}


// إرسال الطلب - النسخة المعدلة
async function submitOrder(event) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('🔄 بدء عملية تأكيد الطلب...');
    
    // التحقق من صحة النموذج
    if (!validateForm()) {
        console.log('❌ فشل التحقق من النموذج');
        showAlert('يرجى ملء جميع الحقول المطلوبة بشكل صحيح', 'error');
        return;
    }
    
    // التحقق من توفر المنتج
    if (!state.product || state.product.stock === 0) {
        console.log('❌ المنتج غير متوفر');
        showAlert('المنتج غير متوفر حالياً', 'error');
        return;
    }
    
    if (state.quantity > state.product.stock) {
        console.log('❌ الكمية غير متاحة');
        showAlert('الكمية المطلوبة غير متاحة', 'error');
        return;
    }
    
    // إظهار نافذة التحميل
    showPurchaseLoading();
    
    try {
        // تحضير بيانات الطلب
        const orderData = {
            products: [{
                productId: state.product._id,
                quantity: state.quantity,
                color: state.selectedColor,
                size: state.selectedSize,
                price: parseFloat(calculateDiscountedPrice(state.product))
            }],
            customer: {
                fullName: state.formData.fullName.trim(),
                phone: state.formData.phone.trim(),
                email: state.formData.email?.trim() || '',
                wilaya: state.formData.wilaya,
                address: state.formData.address.trim(),
                notes: state.formData.notes.trim(),
                paymentMethod: state.formData.paymentMethod || 'cash_on_delivery'
            },
            shippingPrice: state.shippingPrices[state.formData.wilaya] || 600,
            totalPrice: (parseFloat(calculateDiscountedPrice(state.product)) * state.quantity) + 
                       (state.shippingPrices[state.formData.wilaya] || 600)
        };
        
        console.log('📤 إرسال بيانات الطلب:', orderData);
        
        // إرسال الطلب إلى الخادم
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });
        
        console.log('📥 حالة الاستجابة:', response.status);
        
        const result = await response.json();
        console.log('📥 بيانات الاستجابة:', result);
        
        if (!response.ok) {
            throw new Error(result.details || result.error || 'حدث خطأ أثناء إنشاء الطلب');
        }
        
        // نجاح الطلب
        hidePurchaseLoading();
        
        // 1. إظهار رسالة النجاح
        showAlert(`تم إنشاء طلبك بنجاح! رقم الطلب: ${result.orderNumber || result.orderId}`, 'success');
        
        // 2. مسح السلة (إذا كانت تحتوي على هذا المنتج فقط)
        const currentCart = JSON.parse(localStorage.getItem('cart')) || [];
        const updatedCart = currentCart.filter(item => 
            !(item.productId === state.product._id && 
              item.color === state.selectedColor && 
              item.size === state.selectedSize)
        );
        localStorage.setItem('cart', JSON.stringify(updatedCart));
        
        // 3. حفظ معلومات الطلب للصفحة الرئيسية
        const orderInfo = {
            orderId: result.orderNumber || result.orderId,
            customerName: state.formData.fullName,
            total: orderData.totalPrice,
            wilaya: state.formData.wilaya,
            timestamp: new Date().toISOString(),
            productName: state.product.name,
            quantity: state.quantity
        };
        
        localStorage.setItem('lastOrder', JSON.stringify(orderInfo));
        localStorage.setItem('showOrderSuccess', 'true');
        
        // 4. إعادة تعيين النموذج
        resetFormData();
        
        // 5. إعادة تعيين الكمية
        state.quantity = 1;
        
        // 6. تحديث العداد
        await loadCartFromStorage();
        
        // 7. إعادة توجيه إلى الصفحة الرئيسية بعد 3 ثوانٍ
        setTimeout(() => {
            window.location.href = 'buyer.html?orderSuccess=true&orderId=' + orderInfo.orderId;
        }, 3000);
        
    } catch (error) {
        hidePurchaseLoading();
        console.error('❌ خطأ في إنشاء الطلب:', error);
        showAlert(`خطأ في إنشاء الطلب: ${error.message}`, 'error');
    }
}
function validateForm() {
    console.log('🔍 التحقق من صحة النموذج...');
    console.log('بيانات النموذج:', state.formData);
    
    // تحقق من الحقول المطلوبة
    if (!state.formData.fullName || !state.formData.fullName.trim()) {
        console.log('❌ الاسم فارغ');
        return false;
    }
    
    if (!state.formData.phone || !state.formData.phone.trim()) {
        console.log('❌ الهاتف فارغ');
        return false;
    }
    
    // تحقق من صحة رقم الهاتف (رقم جزائري)
    const phoneRegex = /^[0][5-7][0-9]{8}$/;
    if (!phoneRegex.test(state.formData.phone.trim())) {
        console.log('❌ رقم الهاتف غير صالح');
        return false;
    }
    
    if (!state.formData.wilaya) {
        console.log('❌ الولاية غير محددة');
        return false;
    }
    
    if (!state.formData.address || !state.formData.address.trim()) {
        console.log('❌ العنوان فارغ');
        return false;
    }
    
    console.log('✅ النموذج صالح');
    return true;
}

// عرض رسالة النجاح المطورة
function showSuccessMessage(result) {
    // إنشاء عنصر رسالة النجاح
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message-overlay active';
    successDiv.innerHTML = `
        <div class="success-message-box">
            <div class="success-icon">
                <i class="fas fa-check"></i>
            </div>
            <h3>تم تأكيد طلبك بنجاح!</h3>
            <p>شكراً لثقتك بنا. تم استلام طلبك وسنتواصل معك قريباً لتأكيد التفاصيل.</p>
            
            <div class="success-details">
                <div class="detail-item">
                    <strong>رقم الطلب:</strong>
                    <span>${result.orderNumber || result.orderId}</span>
                </div>
                <div class="detail-item">
                    <strong>المجموع:</strong>
                    <span>${result.total} دج</span>
                </div>
                <div class="detail-item">
                    <strong>طريقة الدفع:</strong>
                    <span>${state.formData.paymentMethod === 'cash_on_delivery' ? 'الدفع عند الاستلام' : 'التحويل البنكي'}</span>
                </div>
            </div>
            
            <div class="success-actions">
                <button class="btn btn-success" onclick="redirectToHome()">
                    <i class="fas fa-home"></i> العودة للرئيسية
                </button>
                <button class="btn btn-outline" onclick="printOrder()">
                    <i class="fas fa-print"></i> طباعة الفاتورة
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(successDiv);
    
    // إضافة تأثير الكونفيتي
    createConfetti();
}

// إعادة التوجيه للصفحة الرئيسية
function redirectToHome() {
    // إخفاء رسالة النجاح
    const successDiv = document.querySelector('.success-message-overlay');
    if (successDiv) {
        successDiv.remove();
    }
    
    // إعادة التوجيه مع معلمة النجاح
    window.location.href = 'buyer.html?orderSuccess=true&orderId=' + 
                         (JSON.parse(localStorage.getItem('lastOrder'))?.orderId || '');
}

// طباعة الفاتورة
function printOrder(orderId) {
    const orderInfo = JSON.parse(localStorage.getItem('lastOrder')) || {};
    const printContent = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>فاتورة طلب #${orderId}</title>
            <style>
                body { 
                    font-family: 'Cairo', 'Arial', sans-serif; 
                    padding: 20px; 
                    max-width: 800px;
                    margin: 0 auto;
                }
                .invoice-header { 
                    text-align: center; 
                    margin-bottom: 30px;
                    border-bottom: 2px solid #3498db;
                    padding-bottom: 20px;
                }
                .invoice-header h1 { 
                    color: #2c3e50; 
                    margin: 0;
                }
                .invoice-details { 
                    margin: 30px 0; 
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                }
                .detail-row { 
                    display: flex; 
                    justify-content: space-between; 
                    margin: 12px 0;
                    padding-bottom: 8px;
                    border-bottom: 1px dashed #ddd;
                }
                .detail-row:last-child {
                    border-bottom: none;
                }
                .total { 
                    font-size: 1.3em; 
                    font-weight: bold; 
                    color: #27ae60;
                    background: #e8f6f3;
                    padding: 15px;
                    border-radius: 5px;
                }
                .footer { 
                    margin-top: 40px; 
                    text-align: center; 
                    color: #666;
                    font-size: 0.9em;
                }
                @media print {
                    body { padding: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="invoice-header">
                <h1>فاتورة طلب</h1>
                <p>بون بري - المتجر الإلكتروني</p>
                <p>${new Date().toLocaleDateString('ar-SA', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })}</p>
            </div>
            
            <div class="invoice-details">
                <div class="detail-row">
                    <strong>رقم الطلب:</strong>
                    <span>${orderId}</span>
                </div>
                <div class="detail-row">
                    <strong>اسم العميل:</strong>
                    <span>${orderInfo.customerName || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <strong>رقم الهاتف:</strong>
                    <span>${orderInfo.phone || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <strong>الولاية:</strong>
                    <span>${orderInfo.wilaya || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <strong>طريقة الدفع:</strong>
                    <span>الدفع عند الاستلام</span>
                </div>
                <div class="detail-row total">
                    <strong>المجموع الكلي:</strong>
                    <span>${orderInfo.total || '0'} دج</span>
                </div>
            </div>
            
            <div class="footer">
                <p>شكراً لثقتك بنا وشرائك من بون بري</p>
                <p>للاستفسار: 0550-000-000</p>
                <p>جميع الأسعار تشمل الضريبة</p>
            </div>
            
            <div class="no-print" style="text-align: center; margin-top: 30px;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    طباعة الفاتورة
                </button>
                <button onclick="window.close()" style="padding: 10px 20px; background: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">
                    إغلاق النافذة
                </button>
            </div>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
}


// إنشاء تأثير الكونفيتي
function createConfetti() {
    const colors = ['#2ecc71', '#3498db', '#e74c3c', '#f1c40f', '#9b59b6'];
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 2 + 's';
        document.body.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), 2000);
    }
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
    e.stopPropagation();
    
    console.log('🔍 زر تأكيد الطلب تم النقر عليه!');
    console.log('📦 حالة السلة:', state.cart);
    console.log('📝 حالة النموذج:', {
        fullName: DOM.fullName.value,
        phone: DOM.phone.value,
        wilaya: DOM.wilayaSelect.value,
        address: DOM.address.value
    });

    console.log('🔄 بدء عملية تأكيد الطلب من السلة...');
    
    // التحقق من وجود منتجات في السلة
    if (state.cart.length === 0) {
        console.log('❌ السلة فارغة');
        showAlert('السلة فارغة', 'error');
        return;
    }
    
    // التحقق من صحة النموذج
    const formData = {
        fullName: DOM.fullName.value.trim(),
        phone: DOM.phone.value.trim(),
        email: DOM.email.value?.trim() || '',
        wilaya: DOM.wilayaSelect.value,
        address: DOM.address.value.trim(),
        notes: DOM.notes.value.trim(),
        paymentMethod: 'cash_on_delivery' // افتراضياً الدفع عند الاستلام
    };
    
    console.log('📋 بيانات النموذج:', formData);
    
    // التحقق من الحقول المطلوبة
    if (!formData.fullName || !formData.phone || !formData.wilaya || !formData.address) {
        console.log('❌ حقول مطلوبة مفقودة');
        showAlert('يرجى ملء جميع الحقول المطلوبة (*)', 'error');
        return;
    }
    
    // التحقق من صحة رقم الهاتف
    const phoneRegex = /^[0][5-7][0-9]{8}$/;
    if (!phoneRegex.test(formData.phone)) {
        console.log('❌ رقم هاتف غير صالح');
        showAlert('يرجى إدخال رقم هاتف جزائري صحيح (مثال: 0551234567)', 'error');
        return;
    }
    
    // إظهار نافذة التحميل
    DOM.checkoutModal.style.display = 'none';
    showAlert('جاري إنشاء طلبك...', 'info');
    
    try {
        // تحضير بيانات الطلب
        const orderData = {
            products: state.cart.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                color: item.color || null,
                size: item.size || null,
                price: parseFloat(item.price)
            })),
            customer: formData
        };
        
        console.log('📤 إرسال بيانات الطلب من السلة:', orderData);
        
        // إرسال الطلب إلى الخادم
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });
        
        console.log('📥 حالة الاستجابة:', response.status);
        
        const result = await response.json();
        console.log('📥 بيانات الاستجابة:', result);
        
        if (!response.ok) {
            throw new Error(result.details || result.error || 'حدث خطأ أثناء إنشاء الطلب');
        }
        
        // نجاح الطلب
        console.log('✅ تم إنشاء الطلب بنجاح:', result.orderId);
        
        // 1. إغلاق السلة والمودال
        DOM.cartSidebar.classList.remove('open');
        
        // 2. مسح السلة
        state.cart = [];
        localStorage.setItem('cart', JSON.stringify([]));
        updateCartUI();
        
        // 3. حفظ معلومات الطلب للصفحة الرئيسية
        const orderInfo = {
            orderId: result.orderNumber || result.orderId,
            customerName: formData.fullName,
            total: result.total || calculateOrderTotal(),
            wilaya: formData.wilaya,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('lastOrder', JSON.stringify(orderInfo));
        localStorage.setItem('showOrderSuccess', 'true');
        
        // 4. إعادة تعيين النموذج
        DOM.checkoutForm.reset();
        state.selectedWilaya = '';
        
        // 5. عرض رسالة النجاح
        setTimeout(() => {
            showOrderSuccess(result.message, result.orderId);
        }, 500);
        
        // 6. إعادة توجيه إلى الصفحة الرئيسية بعد 3 ثوانٍ
        setTimeout(() => {
            window.location.href = 'buyer.html?orderSuccess=true&orderId=' + (result.orderNumber || result.orderId);
        }, 3000);
        
    } catch (error) {
        console.error('❌ خطأ في إنشاء الطلب:', error);
        showAlert(`خطأ في إنشاء الطلب: ${error.message}`, 'error');
        
        // إعادة فتح المودال في حالة الخطأ
        DOM.checkoutModal.style.display = 'block';
    }
}

function calculateOrderTotal() {
    const subtotal = state.cart.reduce((sum, item) => 
        sum + (parseFloat(item.price) * item.quantity), 0
    );
    const shipping = state.selectedWilaya ? 
        (state.shippingPrices[state.selectedWilaya] || 600) : 0;
    return subtotal + shipping;
}

// عرض رسالة نجاح الطلب
function showOrderSuccess(message, orderId) {
    const successDiv = document.createElement('div');
    successDiv.className = 'order-success-overlay active';
    successDiv.innerHTML = `
        <div class="order-success-modal">
            <div class="success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <h3>تم تأكيد طلبك بنجاح!</h3>
            <p>${message}</p>
            
            <div class="order-details">
                <div class="detail-item">
                    <strong>رقم الطلب:</strong>
                    <span>${orderId}</span>
                </div>
                <div class="detail-item">
                    <strong>طريقة الدفع:</strong>
                    <span>الدفع عند الاستلام</span>
                </div>
                <div class="detail-item">
                    <strong>حالة الطلب:</strong>
                    <span class="status-pending">قيد الانتظار</span>
                </div>
            </div>
            
            <div class="success-actions">
                <button class="btn btn-success" onclick="closeSuccessModal(this)">
                    <i class="fas fa-home"></i> العودة للتسوق
                </button>
                <button class="btn btn-outline" onclick="printOrder('${orderId}')">
                    <i class="fas fa-print"></i> طباعة الفاتورة
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(successDiv);
    
    // إضافة تأثير الكونفيتي
    createConfetti();
}

function closeSuccessModal(button) {
    const overlay = button.closest('.order-success-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// عرض تنبيه
function showAlert(message, type) {
    console.log(`💬 عرض تنبيه: ${type} - ${message}`);
    
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
        <button class="alert-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // إضافة CSS للزر
    const closeBtn = alertDiv.querySelector('.alert-close');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: inherit;
        font-size: 1rem;
        cursor: pointer;
        margin-right: auto;
        padding: 0 8px;
    `;
    
    // إزالة التنبيه تلقائياً بعد 5 ثوانٍ
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
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

// إضافة في نهاية ملف buyer.js أو في init()

function setupMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const navOverlay = document.createElement('div');
    
    navOverlay.className = 'nav-overlay';
    document.body.appendChild(navOverlay);
    
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            navOverlay.classList.toggle('active');
        });
        
        navOverlay.addEventListener('click', () => {
            navLinks.classList.remove('active');
            navOverlay.classList.remove('active');
        });
    }
    
    // إغلاق القائمة عند النقر على رابط
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            navOverlay.classList.remove('active');
        });
    });
}

// استدعاء الدالة في init()
async function init() {
    checkForOrderSuccess(); // إضافة هذا السطر

    await loadProducts();
    await loadShippingData();
    setupEventListeners();
    setupMobileMenu(); // إضافة هذا السطر
    loadCartFromStorage();
    updateCartUI();
}
function checkForOrderSuccess() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderSuccess = urlParams.get('orderSuccess');
    const orderId = urlParams.get('orderId');
    
    if (orderSuccess === 'true' || localStorage.getItem('showOrderSuccess') === 'true') {
        showOrderSuccessMessage(orderId);
        localStorage.removeItem('showOrderSuccess');
        
        // تحديث URL لإزالة المعلمة
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
}
function showOrderSuccessMessage(orderId) {
    // استخدام orderId من URL أو من localStorage
    const savedOrder = JSON.parse(localStorage.getItem('lastOrder')) || {};
    const finalOrderId = orderId || savedOrder.orderId;
    
    if (!finalOrderId) return;
    
    const successBanner = document.getElementById('orderSuccessBanner');
    if (!successBanner) return;
    
    successBanner.innerHTML = `
        <div class="order-success-banner">
            <i class="fas fa-check-circle"></i>
            <h3>تم تأكيد طلبك بنجاح!</h3>
            <p>رقم طلبك: <strong>${finalOrderId}</strong></p>
            <p>سنقوم بالاتصال بك على الرقم المقدم للتأكيد في أقرب وقت ممكن.</p>
            <div style="margin-top: 15px;">
                <a href="javascript:void(0)" onclick="closeSuccessBanner()" class="btn btn-light" 
                   style="background: white; color: #27ae60; margin: 0 5px;">
                    <i class="fas fa-times"></i> إغلاق
                </a>
                <a href="javascript:void(0)" onclick="viewOrder('${finalOrderId}')" class="btn btn-light" 
                   style="background: white; color: #3498db; margin: 0 5px;">
                    <i class="fas fa-eye"></i> عرض التفاصيل
                </a>
            </div>
        </div>
    `;
    
    successBanner.style.display = 'block';
    
    // إخفاء تلقائي بعد 10 ثوانٍ
    setTimeout(() => {
        if (successBanner.style.display !== 'none') {
            successBanner.style.display = 'none';
            localStorage.removeItem('lastOrder');
        }
    }, 10000);
}

// إغلاق بانر النجاح
function closeSuccessBanner() {
    const successBanner = document.getElementById('orderSuccessBanner');
    if (successBanner) {
        successBanner.style.display = 'none';
        localStorage.removeItem('lastOrder');
    }
}

// عرض تفاصيل الطلب
function viewOrder(orderId) {
    // هنا يمكنك إضافة منطق لعرض تفاصيل الطلب
    alert(`تفاصيل الطلب ${orderId}\n\nسيتم إضافة صفحة تفاصيل الطلبات قريباً.`);
}

// تحسين ظهور الصور
function optimizeImages() {
    const images = document.querySelectorAll('.product-image img');
    images.forEach(img => {
        // إضافة مؤشر تحميل
        if (!img.complete) {
            img.style.opacity = '0';
            img.addEventListener('load', () => {
                img.style.opacity = '1';
                img.style.transition = 'opacity 0.3s ease';
            });
        }
        
        // التعامل مع أخطاء الصور
        img.addEventListener('error', () => {
            img.src = '/api/placeholder/200/200';
            img.alt = 'صورة غير متوفرة';
        });
    });
}

// استدعاء optimizeImages بعد تحميل المنتجات

// تشغيل التحسينات عند التحميل وعند تغيير الحجم
window.addEventListener('load', optimizeForMobile);
window.addEventListener('resize', optimizeForMobile);
