// حالة التطبيق
const state = {
    product: null,
    relatedProducts: [],
    selectedColor: null,
    selectedSize: null,
    quantity: 1,
    cart: [],
    shippingWilayas: [],
    shippingPrices: {},
    formData: {
        fullName: '',
        phone: '',
        email: '',
        wilaya: '',
        address: '',
        paymentMethod: 'cash_on_delivery',
        notes: ''
    }
};

// عناصر DOM
const DOM = {
    productDetailPage: document.getElementById('product-detail-page'),
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    cartCount: document.querySelector('.cart-count'),
    purchaseLoading: document.getElementById('purchase-loading')
};

// تهيئة التطبيق
async function init() {
    await loadCartFromStorage();
    await loadShippingData();
    await loadProduct();
    setupEventListeners();
}

// تحميل بيانات الشحن
async function loadShippingData() {
    try {
        const response = await fetch('/api/shipping');
        if (response.ok) {
            const data = await response.json();
            state.shippingWilayas = data.wilayas || [];
            state.shippingPrices = data.prices || {};
        }
    } catch (error) {
        console.error('Error loading shipping data:', error);
    }
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
            // تحديد خيارات افتراضية
            if (state.product.colors && state.product.colors.length > 0) {
                state.selectedColor = state.product.colors[0];
            }
            if (state.product.sizes && state.product.sizes.length > 0) {
                state.selectedSize = state.product.sizes[0];
            }
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

// عرض المنتج مع نموذج الشراء
function renderProduct() {
    if (!state.product) return;
    
    DOM.loading.style.display = 'none';
    DOM.productDetailPage.style.display = 'block';
    
    const productPrice = calculateDiscountedPrice(state.product);
    const shippingPrice = state.formData.wilaya ? (state.shippingPrices[state.formData.wilaya] || 600) : 0;
    const totalPrice = (productPrice * state.quantity) + shippingPrice;
    
    DOM.productDetailPage.innerHTML = `
        <!-- ترويسة المنتج -->
        <div class="product-header">
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
        
        <!-- المحتوى الرئيسي -->
        <div class="product-content">
            <!-- الجزء الأيسر: معلومات المنتج -->
            <div>
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
                <div class="price-section">
                    <div class="price">
                        ${state.product.discount > 0 ? `
                            <span class="original-price">
                                ${state.product.originalPrice || state.product.price} دج
                            </span>
                        ` : ''}
                        <span class="current-price">
                            ${productPrice} دج
                        </span>
                        ${state.product.discount > 0 ? `
                            <span class="discount-badge">${state.product.discount}% خصم</span>
                        ` : ''}
                    </div>
                </div>
                
                <!-- الخيارات -->
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
                
                <!-- الكمية -->
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
                
                <!-- الأزرار الأساسية -->
                <div class="buy-options">
                    <button class="btn btn-primary buy-now-btn" onclick="showCheckoutForm()" 
                            ${state.product.stock === 0 ? 'disabled' : ''}>
                        <i class="fas fa-bolt"></i>
                        ${state.product.stock === 0 ? 'نفذت الكمية' : 'اشتري الآن'}
                    </button>
                    <button class="btn btn-secondary" onclick="addToCart()" 
                            ${state.product.stock === 0 ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i>
                        أضف للسلة
                    </button>
                </div>
                
                <!-- الوصف والمميزات -->
                <div class="description-section">
                    <h3>وصف المنتج</h3>
                    <p>${state.product.description || 'لا يوجد وصف للمنتج'}</p>
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
            </div>
            
            <!-- الجزء الأيمن: نموذج الشراء -->
            <div>
                <!-- ترويسة الشراء -->
                <div class="purchase-header">
                    <h2><i class="fas fa-shopping-bag"></i> اكمل عملية الشراء</h2>
                    <p>املأ بياناتك لاستكمال الطلب</p>
                </div>
                
                <!-- ملخص الطلب -->
                <div class="order-summary">
                    <h3><i class="fas fa-receipt"></i> ملخص طلبك</h3>
                    <div class="order-items">
                        <div class="order-item">
                            <div class="order-item-image">
                                ${state.product.images && state.product.images.length > 0 ? 
                                    `<img src="${state.product.images[0].data}" alt="${state.product.name}">` :
                                    `<i class="fas fa-box" style="color: #ccc; font-size: 2rem;"></i>`
                                }
                            </div>
                            <div class="order-item-details">
                                <div class="order-item-name">${state.product.name}</div>
                                <div class="order-item-meta">
                                    ${state.selectedColor ? `<span>اللون: ${state.selectedColor}</span>` : ''}
                                    ${state.selectedSize ? `<span>المقاس: ${state.selectedSize}</span>` : ''}
                                    <span>الكمية: ${state.quantity}</span>
                                </div>
                                <div class="order-item-price">${productPrice} دج × ${state.quantity}</div>
                            </div>
                        </div>
                    </div>
                    <div class="order-total">
                        <span>الإجمالي:</span>
                        <span>${totalPrice.toFixed(2)} دج</span>
                    </div>
                </div>
                
                <!-- نموذج الشراء -->
                <div class="checkout-form">
                    <form id="checkoutForm" onsubmit="submitOrder(event)">
                        <!-- معلومات العميل -->
                        <div class="form-section">
                            <h3><i class="fas fa-user"></i> معلومات العميل</h3>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="fullName">الاسم الكامل</label>
                                    <input type="text" id="fullName" name="fullName" 
                                           required placeholder="أدخل اسمك الكامل"
                                           value="${state.formData.fullName}"
                                           oninput="updateFormData('fullName', this.value)">
                                    <span class="input-hint">مطلوب للتواصل معك</span>
                                </div>
                                
                                <div class="form-group">
                                    <label for="phone">رقم الهاتف</label>
                                    <input type="tel" id="phone" name="phone" 
                                           required placeholder="أدخل رقم هاتفك"
                                           pattern="[0][5-7][0-9]{8}"
                                           value="${state.formData.phone}"
                                           oninput="updateFormData('phone', this.value)">
                                    <span class="input-hint">رقم هاتف جزائري (مثال: 0551234567)</span>
                                </div>
                                
                                <div class="form-group">
                                    <label for="email">البريد الإلكتروني (اختياري)</label>
                                    <input type="email" id="email" name="email" 
                                           placeholder="email@example.com"
                                           value="${state.formData.email}"
                                           oninput="updateFormData('email', this.value)">
                                </div>
                                
                                <div class="form-group full-width">
                                    <label for="address">العنوان التفصيلي</label>
                                    <textarea id="address" name="address" 
                                              required placeholder="الحي، الشارع، رقم المنزل، أي معلومات إضافية"
                                              rows="3"
                                              oninput="updateFormData('address', this.value)">${state.formData.address}</textarea>
                                </div>
                            </div>
                        </div>
                        
                        <!-- الولاية والشحن -->
                        <div class="form-section">
                            <h3><i class="fas fa-truck"></i> معلومات التوصيل</h3>
                            <div class="form-group">
                                <label for="wilaya">الولاية</label>
                                <select id="wilaya" name="wilaya" required
                                        onchange="updateWilaya(this.value)">
                                    <option value="">اختر ولايتك</option>
                                    ${state.shippingWilayas.map(wilaya => `
                                        <option value="${wilaya}" ${state.formData.wilaya === wilaya ? 'selected' : ''}>
                                            ${wilaya} ${state.shippingPrices[wilaya] ? `(${state.shippingPrices[wilaya]} دج)` : ''}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            
                            <div class="shipping-info">
                                <div class="shipping-price">
                                    <strong>تكلفة التوصيل:</strong>
                                    <span id="shippingCost">${shippingPrice} دج</span>
                                </div>
                                <p class="shipping-note">
                                    <i class="fas fa-info-circle"></i>
                                    مدة التوصيل: 2-5 أيام عمل بعد تأكيد الطلب
                                </p>
                            </div>
                        </div>
                        
                        <!-- طريقة الدفع -->
                        <div class="form-section">
                            <h3><i class="fas fa-credit-card"></i> طريقة الدفع</h3>
                            <div class="payment-methods">
                                <div class="payment-option">
                                    <input type="radio" id="cash_on_delivery" name="paymentMethod" 
                                           value="cash_on_delivery" 
                                           ${state.formData.paymentMethod === 'cash_on_delivery' ? 'checked' : ''}
                                           onchange="updateFormData('paymentMethod', this.value)">
                                    <label for="cash_on_delivery">
                                        <i class="fas fa-money-bill-wave"></i>
                                        الدفع عند الاستلام
                                    </label>
                                </div>
                                
                                <div class="payment-option">
                                    <input type="radio" id="bank_transfer" name="paymentMethod" 
                                           value="bank_transfer"
                                           ${state.formData.paymentMethod === 'bank_transfer' ? 'checked' : ''}
                                           onchange="updateFormData('paymentMethod', this.value)">
                                    <label for="bank_transfer">
                                        <i class="fas fa-university"></i>
                                        التحويل البنكي
                                    </label>
                                </div>
                            </div>
                            
                            <div id="bankDetails" style="display: ${state.formData.paymentMethod === 'bank_transfer' ? 'block' : 'none'}; 
                                 margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: var(--radius);">
                                <h4><i class="fas fa-info-circle"></i> معلومات التحويل البنكي:</h4>
                                <p><strong>اسم البنك:</strong> القرض الشعبي الجزائري CPA</p>
                                <p><strong>رقم الحساب:</strong> 123-456-789-00</p>
                                <p><strong>اسم الحساب:</strong> المتجر الإلكتروني</p>
                                <p class="input-hint">يرجى إرفاق إيصال التحويل مع الطلب</p>
                            </div>
                        </div>
                        
                        <!-- ملاحظات إضافية -->
                        <div class="form-section">
                            <h3><i class="fas fa-sticky-note"></i> ملاحظات إضافية</h3>
                            <div class="form-group">
                                <textarea id="notes" name="notes" 
                                          placeholder="هل لديك أي طلبات خاصة أو ملاحظات؟ (اختياري)"
                                          rows="3"
                                          oninput="updateFormData('notes', this.value)">${state.formData.notes}</textarea>
                            </div>
                        </div>
                        
                        <!-- الإجمالي النهائي -->
                        <div class="order-total" style="border: none; padding: 0; margin: 25px 0;">
                            <span>الإجمالي النهائي:</span>
                            <span style="color: var(--success-green); font-size: 1.4rem;">
                                ${totalPrice.toFixed(2)} دج
                            </span>
                        </div>
                        
                        <!-- ملاحظة الحقول المطلوبة -->
                        <p class="required-note">
                            <i class="fas fa-asterisk"></i> الحقول المميزة بعلامة (*) مطلوبة
                        </p>
                        
                        <!-- أزرار الإجراءات -->
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary btn-block">
                                <i class="fas fa-check-circle"></i>
                                تأكيد الطلب والدفع
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="addToCart()">
                                <i class="fas fa-cart-plus"></i>
                                إضافة للسلة فقط
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        
        <!-- المنتجات المشابهة -->
        ${state.relatedProducts.length > 0 ? `
            <div class="related-products">
                <h3>منتجات مشابهة</h3>
                <div class="related-grid">
                    ${state.relatedProducts.map(product => `
                        <a href="product.html?product=${product.slug || product._id}" class="related-item">
                            <div class="related-image">
                                ${product.images && product.images.length > 0 ? 
                                    `<img src="${product.images[0].data}" alt="${product.name}">` :
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
    `;
}

// تحديث نموذج البيانات
function updateFormData(field, value) {
    state.formData[field] = value;
    if (field === 'paymentMethod') {
        const bankDetails = document.getElementById('bankDetails');
        if (bankDetails) {
            bankDetails.style.display = value === 'bank_transfer' ? 'block' : 'none';
        }
    }
}

// تحديث الولاية وحساب التوصيل
function updateWilaya(wilaya) {
    state.formData.wilaya = wilaya;
    const shippingCost = state.shippingPrices[wilaya] || 600;
    
    // تحديث عرض سعر الشحن
    const shippingCostElement = document.getElementById('shippingCost');
    if (shippingCostElement) {
        shippingCostElement.textContent = shippingCost + ' دج';
    }
    
    // إعادة عرض المنتج لتحديث الإجمالي
    if (state.product) {
        renderProduct();
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
        renderProduct();
    }
}

// تحديث حقل الكمية
function updateQuantity(value) {
    const quantity = parseInt(value) || 1;
    if (quantity >= 1 && quantity <= state.product.stock) {
        state.quantity = quantity;
        updateQuantityInput();
        renderProduct();
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
    if (!state.product || state.product.stock === 0) {
        showAlert('المنتج غير متوفر حالياً', 'error');
        return;
    }
    
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
            images: state.product.images
        },
        quantity: state.quantity,
        color: state.selectedColor,
        size: state.selectedSize,
        price: calculateDiscountedPrice(state.product)
    };
    
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
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
    
    localStorage.setItem('cart', JSON.stringify(cart));
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

// إرسال الطلب
async function submitOrder(event) {
    event.preventDefault();
    
    console.log('Submitting order with data:', {
        products: [{
            productId: state.product._id,
            quantity: state.quantity,
            color: state.selectedColor,
            size: state.selectedSize,
            price: calculateDiscountedPrice(state.product)
        }],
        customer: {
            fullName: state.formData.fullName,
            phone: state.formData.phone,
            email: state.formData.email || '',
            wilaya: state.formData.wilaya,
            address: state.formData.address,
            notes: state.formData.notes
        }
    });
    
    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
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
                    notes: state.formData.notes.trim()
                }
            })
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        const result = await response.json();
        console.log('Response data:', result);
        
        if (!response.ok) {
            throw new Error(result.error || result.details || 'خطأ في إنشاء الطلب');
        }
        
        // Success handling...
        
    } catch (error) {
        console.error('Full error details:', error);
        showAlert(`خطأ في إنشاء الطلب: ${error.message}`, 'error');
    }
}
// التحقق من صحة النموذج
function validateForm() {
    const phoneRegex = /^[0][5-7][0-9]{8}$/;
    
    if (!state.formData.fullName.trim()) return false;
    if (!phoneRegex.test(state.formData.phone)) return false;
    if (!state.formData.wilaya) return false;
    if (!state.formData.address.trim()) return false;
    
    return true;
}

// إعادة تعيين بيانات النموذج
function resetFormData() {
    state.formData = {
        fullName: '',
        phone: '',
        email: '',
        wilaya: '',
        address: '',
        paymentMethod: 'cash_on_delivery',
        notes: ''
    };
}

// إظهار نافذة التحميل أثناء الشراء
function showPurchaseLoading() {
    if (DOM.purchaseLoading) {
        DOM.purchaseLoading.classList.add('active');
        const progressFill = DOM.purchaseLoading.querySelector('.progress-fill');
        if (progressFill) {
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                progressFill.style.width = progress + '%';
                if (progress >= 90) clearInterval(interval);
            }, 300);
        }
    }
}

// إخفاء نافذة التحميل
function hidePurchaseLoading() {
    if (DOM.purchaseLoading) {
        const progressFill = DOM.purchaseLoading.querySelector('.progress-fill');
        if (progressFill) {
            progressFill.style.width = '100%';
            setTimeout(() => {
                DOM.purchaseLoading.classList.remove('active');
                progressFill.style.width = '0%';
            }, 500);
        }
    }
}

// عرض نموذج الشراء (للأزرار الأخرى)
// عرض نموذج الشراء (للأزرار الأخرى)
function showCheckoutForm() {
    // التمرير إلى نموذج الشراء في الصفحة الأساسية
    const checkoutSection = document.querySelector('.purchase-header');
    if (checkoutSection) {
        checkoutSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start' 
        });
        
        // إضافة تأثير للفت الانتباه
        checkoutSection.style.boxShadow = '0 0 0 3px rgba(52, 152, 219, 0.3)';
        setTimeout(() => {
            checkoutSection.style.boxShadow = '';
        }, 1500);
    }
}

// المشاركة على Facebook
function shareOnFacebook(e) {
    e.preventDefault();
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(state.product.name);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${title}`, '_blank');
}

// المشاركة على Twitter
function shareOnTwitter(e) {
    e.preventDefault();
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`تفقد ${state.product.name} في المتجر الإلكتروني`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
}

// المشاركة على WhatsApp
function shareOnWhatsApp(e) {
    e.preventDefault();
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`تفقد ${state.product.name} في المتجر الإلكتروني:\n${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
}

// نسخ رابط المنتج
function copyProductLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        showAlert('تم نسخ رابط المنتج إلى الحافظة', 'success');
    }).catch(err => {
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
    window.addEventListener('storage', (e) => {
        if (e.key === 'cart') {
            loadCartFromStorage();
        }
    });
    
    if (state.product) {
        document.title = `${state.product.name} - المتجر الإلكتروني`;
    }
    
    // تحسين تجربة اللمس
    document.addEventListener('touchstart', () => {}, { passive: true });
}

// عرض تنبيه
function showAlert(message, type) {
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

// تهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', init);

// تحسينات للهواتف
function optimizeForMobile() {
    if (window.innerWidth <= 768) {
        document.body.style.paddingBottom = '20px';
    }
}

window.addEventListener('load', optimizeForMobile);
window.addEventListener('resize', optimizeForMobile);

// إصلاح ارتفاع viewport
function setViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

setViewportHeight();
window.addEventListener('resize', setViewportHeight);
window.addEventListener('orientationchange', setViewportHeight);