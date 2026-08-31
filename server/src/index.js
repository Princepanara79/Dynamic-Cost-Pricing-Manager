require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const rawMaterialRoutes = require('./routes/rawMaterials');
const componentRoutes = require('./routes/components');
const productRoutes = require('./routes/products');
const clientRoutes = require('./routes/clients');
const clientPriceRoutes = require('./routes/clientPrices');
const salesRoutes = require('./routes/sales');
const dashboardRoutes = require('./routes/dashboard');
const whatIfRoutes = require('./routes/whatIf');
const reportsRoutes = require('./routes/reports');
const settingsRoutes = require('./routes/settings');
const errorHandler = require('./middleware/errorHandler');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

app.use(helmet());

const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : [];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs for auth
  message: { error: 'Too many requests from this IP, please try again later.' }
});

// Apply rate limiter to auth routes
app.use('/api/auth', authLimiter, authRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Dynamic Manufacturing Cost & Pricing Manager API',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/raw-materials', rawMaterialRoutes);
app.use('/api/components', componentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/client-prices', clientPriceRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/what-if', whatIfRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Dynamic Costing Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});
