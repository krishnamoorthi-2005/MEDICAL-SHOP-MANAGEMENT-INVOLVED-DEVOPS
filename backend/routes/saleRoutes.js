import express from 'express';
import { createSale, getSales, getSale, getTodaySummary } from '../controllers/saleController.js';
import {
	getDashboardAnalytics,
	getFrequentItems,
} from '../controllers/dashboardController.js';

const router = express.Router();

// Sales routes
router.post('/', createSale);
router.get('/', getSales);
router.get('/summary/today', getTodaySummary);
router.get('/analytics/dashboard', getDashboardAnalytics);
router.get('/analytics/frequent-items', getFrequentItems);
router.get('/:id', getSale);

export default router;
