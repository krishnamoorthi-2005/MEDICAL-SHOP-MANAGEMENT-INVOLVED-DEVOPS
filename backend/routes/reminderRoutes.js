import express from 'express';
import authenticate from '../middleware/authMiddleware.js';
import {
  createReminder,
  deleteReminder,
  listMyReminders,
  updateReminderStatus,
} from '../controllers/reminderController.js';

const router = express.Router();

router.get('/my', authenticate, listMyReminders);
router.post('/', authenticate, createReminder);
router.patch('/:id/status', authenticate, updateReminderStatus);
router.delete('/:id', authenticate, deleteReminder);

export default router;