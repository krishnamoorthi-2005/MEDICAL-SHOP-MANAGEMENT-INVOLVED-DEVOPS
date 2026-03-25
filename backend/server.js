import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import helmet from 'helmet';
import connectDB from './config/database.js';
import authenticate from './middleware/authMiddleware.js';
import saleRoutes from './routes/saleRoutes.js';
import medicineRoutes from './routes/medicineRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import reportsRoutes from './routes/reportsRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import userRoutes from './routes/userRoutes.js';
import backupRoutes from './routes/backupRoutes.js';
import authRoutes from './routes/authRoutes.js';
import forecastRoutes from './routes/forecastRoutes.js';
import predictionRoutes from './routes/predictionRoutes.js';
import prescriptionRoutes from './routes/prescriptionRoutes.js';
import callRequestRoutes from './routes/callRequestRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import reminderRoutes from './routes/reminderRoutes.js';
import { startStockScheduler } from './services/stockScheduler.js';
import { startReminderScheduler } from './services/reminderScheduler.js';
import { initializeWhatsAppClient } from './services/whatsappNotification.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// Gzip compression — reduces response size by ~70%
app.use(compression());

// Rate limiting — prevent abuse and protect under load
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,                  // 500 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,                   // Strict limit on login/signup
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,                  // 2 searches/sec per IP
  message: { success: false, message: 'Search rate limit exceeded.' },
});

app.use(globalLimiter);

// Middleware
// Enhanced CORS configuration - explicitly allow localhost:8080 and 8081
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:3000', 'http://127.0.0.1:8080', 'http://127.0.0.1:8081'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '2mb' }));   // Prevent huge payload attacks
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Connect to MongoDB
try {
  await connectDB();
} catch (error) {
  console.error('Failed to connect to MongoDB:', error);
  process.exit(1);
}

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Pharmacy Backend API is running with MongoDB',
    database: 'MongoDB (Mongoose)',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);

// Medicine routes with search rate limit
app.use('/api/medicines/search', searchLimiter);
app.use('/api/medicines', medicineRoutes);

// Protected routes (require JWT)
app.use('/api/sales', authenticate, saleRoutes);
app.use('/api/purchases', authenticate, purchaseRoutes);
app.use('/api/suppliers', authenticate, supplierRoutes);
app.use('/api/reports', authenticate, reportsRoutes);
app.use('/api/audits', authenticate, auditRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/backups', authenticate, backupRoutes);
app.use('/api/forecast', authenticate, forecastRoutes);
app.use('/api/prediction', authenticate, predictionRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/call-requests', callRequestRoutes);
app.use('/api/customers', authenticate, customerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reminders', reminderRoutes);

app.get('/api', (req, res) => {
  res.json({ 
    message: 'Pharmacy Management System API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      sales: '/api/sales',
      salesSummary: '/api/sales/summary/today',
      medicines: '/api/medicines',
      medicineSearch: '/api/medicines/search?q=medicine'
    }
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ 
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
  });
});

app.listen(PORT, async () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoint: http://localhost:${PORT}/api`);
  console.log(`💚 Health check: http://localhost:${PORT}/api/health`);

  // Initialize WhatsApp client
  if (process.env.WHATSAPP_NOTIFICATIONS_ENABLED === 'true') {
    try {
      console.log('📱 Initializing WhatsApp client...');
      await initializeWhatsAppClient();
      console.log('✅ WhatsApp client initialized. Please scan QR code at /api/notifications/qr if needed');
    } catch (err) {
      console.error('⚠️  WhatsApp initialization error:', err.message);
    }
  }

  // Start daily stock notification scheduler
  startStockScheduler();
  startReminderScheduler();
});
