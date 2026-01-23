const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: [
        'https://bonprix-bqvx.onrender.com',
        'http://localhost:3000',
        'http://127.0.0.1:5500', // For local testing
        'http://127.0.0.1:5501', // For local testing
        'http://localhost:5000',  // For local testing
        'http://localhost:3000',  // For local testing
        

    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json({ limit: '50mb' })); // زيادة الحد للصور الكبيرة
app.use(express.static('frontend'));

// الاتصال بقاعدة البيانات MongoDB
const connectionString = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ecommerce';
mongoose.connect(connectionString);

// نماذج البيانات
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    discount: { type: Number, default: 0 },
    category: { type: String, required: true },
    images: [{ 
        data: { type: String }, // Base64 image data
        isMain: { type: Boolean, default: false },
        name: { type: String }
    }],
    colors: [{ type: String }],
    sizes: [{ type: String }],
    stock: { type: Number, required: true },
    features: [{ type: String }],
    views: { type: Number, default: 0 },
    slug: { type: String, unique: true }, // رابط المنتج
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema({
    orderId: { type: String, unique: true },
    products: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: { type: Number, required: true },
        color: { type: String },
        size: { type: String },
        price: { type: Number, required: true }
    }],
    customer: {
        fullName: { type: String, required: true },
        phone: { type: String, required: true },
        wilaya: { type: String, required: true },
        address: { type: String, required: true },
        email: { type: String }
    },
    subtotal: { type: Number, required: true },
    shipping: { type: Number, required: true },
    total: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'],
        default: 'pending'
    },
    paymentMethod: { type: String, default: 'cash_on_delivery' },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);

// توليد رابط فريد للمنتج
function generateSlug(name) {
    return name
        .toLowerCase()
        .replace(/[^\w\u0621-\u064A\u0660-\u0669\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

// توليد رقم طلب فريد
function generateOrderId() {
    return 'ORD' + Date.now() + Math.floor(Math.random() * 1000);
}

// أسعار التوصيل حسب الولاية
const shippingPrices = {
    'الجزائر': 400,
    'وهران': 500,
    'قسنطينة': 600,
    'عنابة': 550,
    'بومرداس': 450,
    'تيزي وزو': 500,
    'بجاية': 550,
    'سطيف': 500,
    'باتنة': 600,
    'البليدة': 400,
    'تلمسان': 700,
    'الشلف': 500,
    'غرداية': 800,
    'أدرار': 1200,
    'تمنراست': 1500
};

// جميع ولايات الجزائر
const algerianWilayas = [
    'الجزائر', 'وهران', 'قسنطينة', 'عنابة', 'بومرداس',
    'تيزي وزو', 'بجاية', 'سطيف', 'باتنة', 'البليدة',
    'تلمسان', 'الشلف', 'غرداية', 'أدرار', 'تمنراست',
    'الأغواط', 'أم البواقي', 'البيض', 'بسكرة', 'بشار',
    'البويرة', 'تبسة', 'تندوف', 'تيارت', 'تسمسيلت',
    'الجلفة', 'جيجل', 'سعيدة', 'سكيكدة', 'سيدي بلعباس',
    'عنابة', 'قالمة', 'قسنطينة', 'المدية', 'مستغانم',
    'المسيلة', 'معسكر', 'ورقلة', 'وهران', 'اليزي'
];

// Routes

// جلب جميع المنتجات مع إمكانية التصفية
app.get('/api/products', async (req, res) => {
  try {
      const { category, search, sort = 'newest' } = req.query;
      let query = {};
      
      if (category) query.category = category;
      if (search) {
          query.$or = [
              { name: { $regex: search, $options: 'i' } },
              { description: { $regex: search, $options: 'i' } }
          ];
      }
      
      let sortOption = { createdAt: -1 };
      if (sort === 'price-low') sortOption = { price: 1 };
      if (sort === 'price-high') sortOption = { price: -1 };
      if (sort === 'discount') sortOption = { discount: -1 };
      
      const products = await Product.find(query)
          .sort(sortOption)
          .lean();
          
      // إضافة الصورة الرئيسية أو الأولى لكل منتج
      products.forEach(product => {
          if (product.images && product.images.length > 0) {
              const mainImage = product.images.find(img => img.isMain) || product.images[0];
              product.mainImage = mainImage.data;
              // Keep the first image data for display
              product.firstImage = product.images[0].data;
          }
      });
      
      res.json(products);
  } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: 'خطأ في جلب المنتجات' });
  }
});
// جلب منتج محدد مع زيادة عدد المشاهدات
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'المنتج غير موجود' });
        }
        
        // زيادة عدد المشاهدات
        product.views += 1;
        await product.save();
        
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'خطأ في جلب المنتج' });
    }
});

// جلب منتج بواسطة الرابط الفريد
app.get('/api/products/slug/:slug', async (req, res) => {
    try {
        const product = await Product.findOne({ slug: req.params.slug });
        if (!product) {
            return res.status(404).json({ error: 'المنتج غير موجود' });
        }
        
        // زيادة عدد المشاهدات
        product.views += 1;
        await product.save();
        
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'خطأ في جلب المنتج' });
    }
});

// إضافة منتج جديد
app.post('/api/products', async (req, res) => {
    try {
        const productData = req.body;
        
        // توليد رابط فريد
        productData.slug = generateSlug(productData.name);
        
        // التحقق من أن الرابط فريد
        const existingProduct = await Product.findOne({ slug: productData.slug });
        if (existingProduct) {
            productData.slug = productData.slug + '-' + Date.now();
        }
        
        const product = new Product(productData);
        await product.save();
        
        res.status(201).json(product);
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(400).json({ error: 'خطأ في إضافة المنتج', details: error.message });
    }
});

// تحديث منتج
app.put('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: Date.now() },
            { new: true }
        );
        res.json(product);
    } catch (error) {
        res.status(400).json({ error: 'خطأ في تحديث المنتج' });
    }
});

// حذف منتج
app.delete('/api/products/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'تم حذف المنتج بنجاح' });
    } catch (error) {
        res.status(500).json({ error: 'خطأ في حذف المنتج' });
    }
});

// إنشاء طلب جديد
app.post('/api/orders', async (req, res) => {
    try {
        const { products, customer } = req.body;
        
        // حساب المجموع
        let subtotal = 0;
        const orderProducts = [];
        
        for (const item of products) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(400).json({ error: `المنتج ${item.productId} غير موجود` });
            }
            
            if (product.stock < item.quantity) {
                return res.status(400).json({ error: `الكمية غير متاحة للمنتج ${product.name}` });
            }
            
            const itemTotal = product.price * item.quantity;
            subtotal += itemTotal;
            
            orderProducts.push({
                productId: item.productId,
                quantity: item.quantity,
                color: item.color,
                size: item.size,
                price: product.price
            });
        }
        
        // حساب سعر التوصيل
        const shipping = shippingPrices[customer.wilaya] || 600;
        const total = subtotal + shipping;
        
        // إنشاء الطلب
        const order = new Order({
            orderId: generateOrderId(),
            products: orderProducts,
            customer,
            subtotal,
            shipping,
            total
        });
        
        await order.save();
        
        // تحديث المخزون
        for (const item of products) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { stock: -item.quantity }
            });
        }
        
        res.status(201).json({
            message: 'تم استلام طلبك بنجاح! سنتصل بك للتأكيد في أقرب وقت ممكن.',
            orderId: order.orderId,
            order
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: 'خطأ في إنشاء الطلب' });
    }
});

// جلب جميع الطلبات
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('products.productId')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'خطأ في جلب الطلبات' });
    }
});

// تحديث حالة الطلب
app.put('/api/orders/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { 
                status,
                updatedAt: Date.now()
            },
            { new: true }
        ).populate('products.productId');
        
        res.json(order);
    } catch (error) {
        res.status(400).json({ error: 'خطأ في تحديث حالة الطلب' });
    }
});

// جلب ولايات الجزائر وأسعار التوصيل
app.get('/api/shipping', (req, res) => {
    res.json({
        wilayas: algerianWilayas,
        prices: shippingPrices
    });
});

// جلب إحصائيات المتجر
app.get('/api/stats', async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();
        const totalSales = await Order.aggregate([
            { $match: { status: 'delivered' } },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);
        
        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('products.productId');
        
        res.json({
            totalProducts,
            totalOrders,
            totalSales: totalSales[0]?.total || 0,
            recentOrders
        });
    } catch (error) {
        res.status(500).json({ error: 'خطأ في جلب الإحصائيات' });
    }
});

// Placeholder image endpoint
app.get('/api/placeholder/:width/:height', (req, res) => {
  const { width, height } = req.params;
  const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
          <rect width="${width}" height="${height}" fill="#f0f0f0"/>
          <text x="50%" y="50%" font-family="Arial" font-size="14" fill="#999" text-anchor="middle" dy=".3em">لا توجد صورة</text>
      </svg>
  `;
  res.set('Content-Type', 'image/svg+xml');
  res.send(svg);
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`✅ الخادم يعمل على المنفذ ${PORT}`);
    console.log(`🌐 رابط البائع: http://localhost:${PORT}/seller.html`);
    console.log(`🌐 رابط البائع: http://localhost:${PORT}/dashboard.html`);
    console.log(`🛒 رابط المشتري: http://localhost:${PORT}/buyer.html`);
    console.log(`📱 رابط المتجر: http://localhost:${PORT}/product.html`);
});