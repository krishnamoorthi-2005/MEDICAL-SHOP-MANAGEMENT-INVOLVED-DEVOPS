import express from 'express';
import { getReportsAnalytics, getExpiryLossDetails, getSalesTrend, resetExpiryLoss, generateTestData } from '../controllers/reportsController.js';
import { getDeadStockReport } from '../controllers/reportsController.js';

const router = express.Router();

router.get('/analytics', getReportsAnalytics);
router.get('/sales-trend', getSalesTrend);
// Detailed expiry loss report (alias path for clarity)
router.get('/expiry-loss', getExpiryLossDetails);
router.get('/expiry-details', getExpiryLossDetails);
// Admin utility to reset expiry-loss analytics
router.post('/expiry-loss/reset', resetExpiryLoss);
router.get('/dead-stock', getDeadStockReport);
// Test data generation endpoint (for development)
router.post('/generate-test-data', generateTestData);

export default router;
