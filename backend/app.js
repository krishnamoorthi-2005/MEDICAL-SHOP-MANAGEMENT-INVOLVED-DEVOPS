import express from 'express';
import cors from 'cors';

import saleRoutes from './routes/saleRoutes.js';
import medicineRoutes from './routes/medicineRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import reportsRoutes from './routes/reportsRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import userRoutes from './routes/userRoutes.js';
import backupRoutes from './routes/backupRoutes.js';
import callRequestRoutes from './routes/callRequestRoutes.js';
import authRoutes from './routes/authRoutes.js';
import prescriptionRoutes from './routes/prescriptionRoutes.js';
import predictionRoutes from './routes/predictionRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import authenticate from './middleware/authMiddleware.js';
import forecastRoutes from './routes/forecastRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import reminderRoutes from './routes/reminderRoutes.js';

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Serve static files from uploads directory
  app.use('/uploads', express.static('uploads'));

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      message: 'Pharmacy Backend API is running',
      timestamp: new Date().toISOString()
    });
  });

  app.use('/api/auth', authRoutes);

  // Medicine routes with public search endpoint
  app.use('/api/medicines', medicineRoutes); // Search endpoint is public, others require auth in route file
  
  app.use('/api/sales', authenticate, saleRoutes);
  app.use('/api/purchases', authenticate, purchaseRoutes);
  app.use('/api/suppliers', authenticate, supplierRoutes);
  app.use('/api/reports', authenticate, reportsRoutes);
  app.use('/api/audits', authenticate, auditRoutes);
  app.use('/api/users', authenticate, userRoutes);
  app.use('/api/backups', authenticate, backupRoutes);
  app.use('/api/forecast', authenticate, forecastRoutes);
  app.use('/api/call-requests', callRequestRoutes);
  app.use('/api/prescriptions', prescriptionRoutes);
  app.use('/api/prediction', authenticate, predictionRoutes);
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

  // Error handling middleware
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message
    });
  });

  return app;
};

export default createApp;
