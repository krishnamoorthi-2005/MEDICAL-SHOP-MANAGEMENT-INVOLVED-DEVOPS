
import mongoose from 'mongoose';
import StockAudit from '../models/StockAudit.js';
import StockAuditItem from '../models/StockAuditItem.js';
import Medicine from '../models/Medicine.js';
import Batch from '../models/Batch.js';
import StockMovement from '../models/StockMovement.js';
import Supplier from '../models/Supplier.js';
import { checkTransactionSupport } from '../utils/mongoTransactions.js';

// Helper to optionally use session in query
const withSession = (query, session) => {
  return session ? query.session(session) : query;
};

const getDefaultSupplier = async (session) => {
  let supplier = await withSession(Supplier.findOne({ name: 'Default Supplier' }), session);
  if (!supplier) {
    supplier = await Supplier.create(
      [
        {
          name: 'Default Supplier',
          contactPerson: 'Admin',
          phone: '0000000000',
          email: 'default@supplier.com',
          address: 'Default Address'
        }
      ],
      session ? { session } : {}
    );
    supplier = Array.isArray(supplier) ? supplier[0] : supplier;
  }
  return supplier;
};

const sumMedicineStockFromLedger = async (medicineId, session) => {
  const medObjectId = typeof medicineId === 'string' ? new mongoose.Types.ObjectId(medicineId) : medicineId;
  const agg = withSession(
    StockMovement.aggregate([
      { $match: { medicineId: medObjectId } },
      { $group: { _id: null, qty: { $sum: '$quantity' } } }
    ]),
    session
  );

  const result = await agg;
  return result?.[0]?.qty ?? 0;
};

const sumBatchStockFromLedger = async (batchId, session) => {
  const batchObjectId = typeof batchId === 'string' ? new mongoose.Types.ObjectId(batchId) : batchId;
  const agg = withSession(
    StockMovement.aggregate([
      { $match: { batchId: batchObjectId } },
      { $group: { _id: null, qty: { $sum: '$quantity' } } }
    ]),
    session
  );

  const result = await agg;
  return result?.[0]?.qty ?? 0;
};

const applyAuditAdjustment = async ({
  session,
  auditId,
  medicineId,
  batchId,
  quantity,
  reason,
  performedByUserId
}) => {
  if (quantity === 0) return;

  // If we have a concrete batch, apply directly via ledger.
  if (batchId) {
    const batch = await withSession(Batch.findById(batchId), session);
    if (!batch) throw new Error('Batch not found for audit adjustment');

    const currentQty = await sumBatchStockFromLedger(batchId, session);
    if (quantity < 0 && currentQty + quantity < 0) {
      throw new Error('Insufficient stock in batch to apply audit adjustment');
    }

    const previousStock = currentQty;
    const newStock = previousStock + quantity;

    await StockMovement.recordMovement({
      medicineId,
      batchId: batch._id,
      type: 'AUDIT_ADJUSTMENT',
      quantity,
      previousStock,
      newStock,
      referenceType: 'audit',
      referenceId: auditId,
      reason,
      unitPrice: batch.purchasePrice || 0,
      purchasePrice: batch.purchasePrice || 0,
      userId: performedByUserId,
    });

    return;
  }

  const batches = await withSession(Batch.find({ medicineId }).sort({ expiryDate: 1 }), session);

  // Reduce stock (FEFO)
  if (quantity < 0) {
    let remaining = Math.abs(quantity);

    for (const batch of batches) {
      if (remaining <= 0) break;

      const currentQty = await sumBatchStockFromLedger(batch._id, session);
      if (currentQty <= 0) continue;

      const deduct = Math.min(currentQty, remaining);
      const previousStock = currentQty;
      const newStock = previousStock - deduct;

      await StockMovement.recordMovement({
        medicineId,
        batchId: batch._id,
        type: 'AUDIT_ADJUSTMENT',
        quantity: -deduct,
        previousStock,
        newStock,
        referenceType: 'audit',
        referenceId: auditId,
        reason,
        unitPrice: batch.purchasePrice || 0,
        purchasePrice: batch.purchasePrice || 0,
        userId: performedByUserId,
      });

      remaining -= deduct;
    }

    if (remaining > 0) {
      throw new Error(`Insufficient stock to apply audit adjustment. Short by ${remaining} units.`);
    }

    return;
  }

  // Increase stock: create or use a batch but do not change quantityAvailable
  const existingTarget = [...batches].sort(
    (a, b) => (b.expiryDate?.getTime?.() || 0) - (a.expiryDate?.getTime?.() || 0),
  )[0];

  let targetBatch = existingTarget;
  if (!targetBatch) {
    const supplier = await getDefaultSupplier(session);
    const farFuture = new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000);

    const created = await Batch.create(
      [
        {
          medicineId,
          batchNumber: `AUDIT-${auditId.toString().slice(-6)}-${Date.now()}`,
          expiryDate: farFuture,
          quantityAvailable: 0,
          purchasePrice: 0,
          mrp: 0,
          supplierId: supplier._id,
          receivedDate: new Date()
        }
      ],
      session ? { session } : {}
    );
    targetBatch = Array.isArray(created) ? created[0] : created;
  }

  const currentQty = await sumBatchStockFromLedger(targetBatch._id, session);
  const previousStock = currentQty;
  const newStock = previousStock + quantity;

  await StockMovement.recordMovement({
    medicineId,
    batchId: targetBatch._id,
    type: 'AUDIT_ADJUSTMENT',
    quantity,
    previousStock,
    newStock,
    referenceType: 'audit',
    referenceId: auditId,
    reason,
    unitPrice: targetBatch.purchasePrice || 0,
    purchasePrice: targetBatch.purchasePrice || 0,
    userId: performedByUserId,
  });
};

export const startAudit = async (req, res) => {
  const supportsTransactions = await checkTransactionSupport();
  const session = supportsTransactions ? await mongoose.startSession() : null;
  
  try {
    const { type, category, rack, performedBy, performedByUserId } = req.body || {};

    const existingInProgress = await StockAudit.findOne({ status: 'in_progress' }).sort({ startedAt: -1 }).lean();
    if (existingInProgress) {
      return res.status(409).json({
        success: false,
        message: 'An audit session is already in progress. Resume or cancel it before starting a new one.',
        data: { auditId: existingInProgress._id }
      });
    }

    if (!type || !['full', 'category', 'rack'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Valid audit type is required' });
    }
    if (type === 'category' && !category) {
      return res.status(400).json({ success: false, message: 'Category is required for category audit' });
    }
    if (type === 'rack' && !rack) {
      return res.status(400).json({ success: false, message: 'Rack is required for rack audit' });
    }

    let audit;
    let items;
    let createdItems;

    const executeAudit = async () => {
      audit = await StockAudit.create(
        [
          {
            type,
            category: type === 'category' ? category : undefined,
            rack: type === 'rack' ? rack : undefined,
            status: 'in_progress',
            performedBy: performedBy || 'system',
            performedByUserId: performedByUserId || undefined,
            startedAt: new Date()
          }
        ],
        session ? { session } : {}
      );
      audit = Array.isArray(audit) ? audit[0] : audit;

      const query = { discontinued: { $ne: true } };
      if (type === 'category') query.category = category;

      // Rack-wise is optional and depends on rackLocation field
      if (type === 'rack') query.rackLocation = rack;

      const medicines = await withSession(Medicine.find(query).sort({ name: 1 }), session);

      items = [];
      for (const med of medicines) {
        const batches = await withSession(Batch.find({ medicineId: med._id }).sort({ expiryDate: 1 }), session);

        if (!batches || batches.length === 0) {
          const systemQty = await sumMedicineStockFromLedger(med._id, session);
          items.push({
            auditId: audit._id,
            medicineId: med._id,
            medicineName: med.name,
            category: med.category,
            rack: med.rackLocation,
            systemQty,
            physicalQty: systemQty,
            difference: 0,
            note: ''
          });
          continue;
        }

        for (const batch of batches) {
          const systemQty = await sumBatchStockFromLedger(batch._id, session);
          items.push({
            auditId: audit._id,
            medicineId: med._id,
            batchId: batch._id,
            batchNumber: batch.batchNumber,
            medicineName: med.name,
            category: med.category,
            rack: med.rackLocation,
            systemQty,
            physicalQty: systemQty,
            difference: 0,
            note: ''
          });
        }
      }

      if (items.length > 0) {
        createdItems = await StockAuditItem.insertMany(items, session ? { session } : {});
      } else {
        createdItems = [];
      }

      await withSession(
        StockAudit.updateOne(
          { _id: audit._id },
          { $set: { itemsAudited: items.length } }
        ),
        session
      );
    };

    if (supportsTransactions && session) {
      await session.withTransaction(executeAudit);
    } else {
      await executeAudit();
    }

    return res.json({
      success: true,
      data: {
        audit: {
          id: audit._id,
          type: audit.type,
          category: audit.category,
          rack: audit.rack,
          status: audit.status,
          itemsAudited: items.length,
          startedAt: audit.startedAt,
          performedBy: audit.performedBy
        },
        items: (createdItems || []).map((i) => ({
          itemId: i._id,
          medicineId: i.medicineId,
          batchId: i.batchId,
          batchNumber: i.batchNumber,
          medicineName: i.medicineName,
          category: i.category,
          rack: i.rack,
          systemQty: i.systemQty,
          physicalQty: i.physicalQty,
          difference: i.difference,
          note: i.note || ''
        }))
      }
    });
  } catch (error) {
    console.error('❌ Start audit error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to start audit' });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

export const completeAudit = async (req, res) => {
  const supportsTransactions = await checkTransactionSupport();
  const session = supportsTransactions ? await mongoose.startSession() : null;
  
  try {
    const { auditId } = req.params;
    const { items, performedBy, performedByUserId } = req.body || {};

    if (!auditId) {
      return res.status(400).json({ success: false, message: 'auditId is required' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'items are required' });
    }

    let completed;

    const executeComplete = async () => {
      const audit = await withSession(StockAudit.findById(auditId), session);
      if (!audit) throw new Error('Audit not found');
      if (audit.status !== 'in_progress') throw new Error('Audit is not in progress');

      // Update performedBy if provided at completion time
      if (performedBy) audit.performedBy = performedBy;
      if (performedByUserId) audit.performedByUserId = performedByUserId;

      const existingItems = await withSession(StockAuditItem.find({ auditId }), session);
      const byItemId = new Map(existingItems.map((it) => [it._id.toString(), it]));
      const byComposite = new Map(
        existingItems.map((it) => [`${it.medicineId.toString()}:${it.batchId ? it.batchId.toString() : 'none'}`, it])
      );

      let mismatches = 0;

      for (const input of items) {
        const itemId = input.itemId;
        const medId = input.medicineId;
        const batchId = input.batchId;
        const physicalQty = Number(input.physicalQty);
        const note = input.note;

        if ((!itemId && !medId) || Number.isNaN(physicalQty) || physicalQty < 0) {
          throw new Error('Invalid item payload (itemId or medicineId and non-negative physicalQty required)');
        }

        const record = itemId
          ? byItemId.get(String(itemId))
          : byComposite.get(`${String(medId)}:${batchId ? String(batchId) : 'none'}`);
        if (!record) {
          throw new Error('Audit item not found for provided identifier');
        }

        const difference = physicalQty - record.systemQty;
        record.physicalQty = physicalQty;
        record.difference = difference;
        record.note = note;
        await record.save(session ? { session } : {});

        if (difference !== 0) mismatches += 1;
      }

      audit.mismatches = mismatches;
      audit.itemsAudited = existingItems.length;
      audit.approveAdjustments = true;
      audit.status = 'completed';
      audit.completedAt = new Date();
      await audit.save(session ? { session } : {});

      const mismatchedItems = await withSession(
        StockAuditItem.find({ auditId, difference: { $ne: 0 } }),
        session
      );
      
      for (const item of mismatchedItems) {
        await applyAuditAdjustment({
          session,
          auditId: audit._id,
          medicineId: item.medicineId,
          batchId: item.batchId,
          quantity: item.difference,
          reason: `Stock audit adjustment (${audit.completedAt.toISOString().slice(0, 10)})`,
          performedByUserId: audit.performedByUserId
        });
      }

      completed = audit;
    };

    if (supportsTransactions && session) {
      await session.withTransaction(executeComplete);
    } else {
      await executeComplete();
    }

    return res.json({
      success: true,
      message: 'Audit completed successfully',
      data: {
        id: completed._id,
        status: completed.status,
        itemsAudited: completed.itemsAudited,
        mismatches: completed.mismatches,
        approveAdjustments: completed.approveAdjustments,
        completedAt: completed.completedAt
      }
    });
  } catch (error) {
    console.error('❌ Complete audit error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to complete audit' });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

export const updateAuditItem = async (req, res) => {
  try {
    const { auditId, itemId } = req.params;
    const { physicalQty, note } = req.body || {};

    const qty = Number(physicalQty);
    if (!auditId || !itemId) {
      return res.status(400).json({ success: false, message: 'auditId and itemId are required' });
    }
    if (Number.isNaN(qty) || qty < 0) {
      return res.status(400).json({ success: false, message: 'physicalQty must be a non-negative number' });
    }

    const audit = await StockAudit.findById(auditId).lean();
    if (!audit) return res.status(404).json({ success: false, message: 'Audit not found' });
    if (audit.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Audit is not in progress' });
    }

    const item = await StockAuditItem.findOne({ _id: itemId, auditId });
    if (!item) return res.status(404).json({ success: false, message: 'Audit item not found' });

    item.physicalQty = qty;
    item.difference = qty - item.systemQty;
    item.note = typeof note === 'string' ? note : item.note;
    await item.save();

    return res.json({
      success: true,
      data: {
        itemId: item._id,
        medicineId: item.medicineId,
        batchId: item.batchId,
        batchNumber: item.batchNumber,
        physicalQty: item.physicalQty,
        difference: item.difference,
        note: item.note
      }
    });
  } catch (error) {
    console.error('❌ Update audit item error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update audit item' });
  }
};

export const bulkUpdateAuditItems = async (req, res) => {
  try {
    const { auditId } = req.params;
    const { items } = req.body || {};

    if (!auditId) return res.status(400).json({ success: false, message: 'auditId is required' });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'items array is required' });
    }

    const audit = await StockAudit.findById(auditId).lean();
    if (!audit) return res.status(404).json({ success: false, message: 'Audit not found' });
    if (audit.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Audit is not in progress' });
    }

    const updated = [];
    for (const input of items) {
      const qty = Number(input.physicalQty);
      if (!input.itemId || Number.isNaN(qty) || qty < 0) {
        return res.status(400).json({ success: false, message: 'Each item requires itemId and non-negative physicalQty' });
      }

      const item = await StockAuditItem.findOne({ _id: input.itemId, auditId });
      if (!item) {
        return res.status(404).json({ success: false, message: 'Audit item not found' });
      }

      item.physicalQty = qty;
      item.difference = qty - item.systemQty;
      if (typeof input.note === 'string') item.note = input.note;
      await item.save();

      updated.push({ itemId: item._id, physicalQty: item.physicalQty, difference: item.difference, note: item.note });
    }

    return res.json({ success: true, data: { updated } });
  } catch (error) {
    console.error('❌ Bulk update audit items error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update audit items' });
  }
};

export const cancelAudit = async (req, res) => {
  try {
    const { auditId } = req.params;
    if (!auditId) return res.status(400).json({ success: false, message: 'auditId is required' });

    const audit = await StockAudit.findById(auditId);
    if (!audit) return res.status(404).json({ success: false, message: 'Audit not found' });
    if (audit.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Only in-progress audits can be cancelled' });
    }

    audit.status = 'cancelled';
    audit.completedAt = new Date();
    await audit.save();

    return res.json({ success: true, data: { id: audit._id, status: audit.status } });
  } catch (error) {
    console.error('❌ Cancel audit error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to cancel audit' });
  }
};

export const getLatestInProgressAudit = async (req, res) => {
  try {
    const audit = await StockAudit.findOne({ status: 'in_progress' }).sort({ startedAt: -1 }).lean();
    if (!audit) {
      return res.json({ success: true, data: { audit: null, items: [] } });
    }

    const items = await StockAuditItem.find({ auditId: audit._id }).sort({ medicineName: 1 }).lean();
    return res.json({
      success: true,
      data: {
        audit: {
          id: audit._id,
          type: audit.type,
          category: audit.category,
          rack: audit.rack,
          status: audit.status,
          itemsAudited: audit.itemsAudited,
          mismatches: audit.mismatches,
          startedAt: audit.startedAt,
          performedBy: audit.performedBy
        },
        items: items.map((i) => ({
          itemId: i._id,
          medicineId: i.medicineId,
          batchId: i.batchId,
          batchNumber: i.batchNumber,
          medicineName: i.medicineName,
          category: i.category,
          rack: i.rack,
          systemQty: i.systemQty,
          physicalQty: i.physicalQty,
          difference: i.difference,
          note: i.note
        }))
      }
    });
  } catch (error) {
    console.error('❌ Get in-progress audit error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch in-progress audit' });
  }
};

export const getAuditSummary = async (req, res) => {
  try {
    const lastCompleted = await StockAudit.findOne({ status: 'completed' }).sort({ completedAt: -1 }).lean();

    if (!lastCompleted) {
      return res.json({
        success: true,
        data: {
          lastAudit: null
        }
      });
    }

    return res.json({
      success: true,
      data: {
        lastAudit: {
          id: lastCompleted._id,
          date: lastCompleted.completedAt || lastCompleted.startedAt,
          type: lastCompleted.type,
          itemsAudited: lastCompleted.itemsAudited,
          mismatches: lastCompleted.mismatches,
          status: lastCompleted.status
        }
      }
    });
  } catch (error) {
    console.error('❌ Get audit summary error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch audit summary' });
  }
};

export const listAudits = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const audits = await StockAudit.find().sort({ startedAt: -1 }).limit(limit).lean();

    return res.json({
      success: true,
      data: audits.map((a) => ({
        id: a._id,
        date: a.completedAt || a.startedAt,
        type: a.type,
        category: a.category,
        rack: a.rack,
        itemsAudited: a.itemsAudited,
        mismatches: a.mismatches,
        status: a.status
      }))
    });
  } catch (error) {
    console.error('❌ List audits error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to list audits' });
  }
};

export const getAuditDetails = async (req, res) => {
  try {
    const { auditId } = req.params;
    const audit = await StockAudit.findById(auditId).lean();
    if (!audit) {
      return res.status(404).json({ success: false, message: 'Audit not found' });
    }

    const items = await StockAuditItem.find({ auditId }).sort({ medicineName: 1 }).lean();
    console.log(`📋 Audit details for ${auditId}: ${items.length} items found`);

    return res.json({
      success: true,
      data: {
        audit: {
          id: audit._id,
          type: audit.type,
          category: audit.category,
          rack: audit.rack,
          status: audit.status,
          itemsAudited: audit.itemsAudited,
          mismatches: audit.mismatches,
          approveAdjustments: audit.approveAdjustments,
          startedAt: audit.startedAt,
          completedAt: audit.completedAt,
          performedBy: audit.performedBy
        },
        items: items.map((i) => ({
          itemId: i._id,
          medicineId: i.medicineId,
          batchId: i.batchId,
          batchNumber: i.batchNumber,
          medicineName: i.medicineName,
          category: i.category,
          rack: i.rack,
          systemQty: i.systemQty,
          physicalQty: i.physicalQty,
          difference: i.difference,
          note: i.note
        }))
      }
    });
  } catch (error) {
    console.error('❌ Get audit details error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to get audit details' });
  }
};

// Get audit analytics - expiring soon, sales performance, zero sales
export const getAuditAnalytics = async (req, res) => {
  try {
    const { type, category, rack } = req.query;

    // Validate type
    if (type && !['full', 'category', 'rack'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid audit type' });
    }

    // Validate required parameters
    if (type === 'category' && !category) {
      return res.status(400).json({ success: false, message: 'Category is required for category audit type' });
    }
    if (type === 'rack' && !rack) {
      return res.status(400).json({ success: false, message: 'Rack is required for rack audit type' });
    }

    // Build medicine filter based on audit type
    const medicineFilter = { discontinued: { $ne: true } };
    if (type === 'category' && category) {
      medicineFilter.category = category;
    }
    if (type === 'rack' && rack) {
      medicineFilter.rackLocation = rack;
    }

    // Get medicines matching the filter
    const medicines = await Medicine.find(medicineFilter)
      .populate('genericId', 'name')
      .populate('manufacturerId', 'name')
      .lean();

    const medicineIds = medicines.map(m => m._id);

    // 1. Items already expired (past expiry date)
    // Use StockLedger to get actual quantities (same as inventory logic)
    const expiredBatches = await Batch.aggregate([
      {
        $match: {
          medicineId: { $in: medicineIds },
          expiryDate: { $lt: new Date() }
        }
      },
      {
        $lookup: {
          from: 'stockledgers',
          localField: '_id',
          foreignField: 'batchId',
          as: 'ledgerEntries'
        }
      },
      {
        $addFields: {
          actualQuantity: {
            $sum: '$ledgerEntries.quantity'
          }
        }
      },
      {
        $match: {
          actualQuantity: { $gt: 0 }
        }
      },
      {
        $lookup: {
          from: 'medicines',
          localField: 'medicineId',
          foreignField: '_id',
          as: 'medicine'
        }
      },
      { $unwind: '$medicine' },
      {
        $lookup: {
          from: 'generics',
          localField: 'medicine.genericId',
          foreignField: '_id',
          as: 'generic'
        }
      },
      { $unwind: { path: '$generic', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          medicineName: '$medicine.name',
          genericName: '$generic.name',
          category: '$medicine.category',
          rack: '$medicine.rackLocation',
          batchNumber: 1,
          expiryDate: 1,
          quantityAvailable: '$actualQuantity',
          purchasePrice: 1,
          mrp: 1,
          daysExpired: {
            $divide: [
              { $subtract: [new Date(), '$expiryDate'] },
              1000 * 60 * 60 * 24
            ]
          },
          totalValue: { $multiply: ['$actualQuantity', '$purchasePrice'] }
        }
      },
      { $sort: { expiryDate: 1 } }
    ]);

    // 2. Items expiring soon (within 30 days)
    // Use StockLedger to get actual quantities (same as inventory logic)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringSoonBatches = await Batch.aggregate([
      {
        $match: {
          medicineId: { $in: medicineIds },
          expiryDate: { $lte: thirtyDaysFromNow, $gte: new Date() }
        }
      },
      {
        $lookup: {
          from: 'stockledgers',
          localField: '_id',
          foreignField: 'batchId',
          as: 'ledgerEntries'
        }
      },
      {
        $addFields: {
          actualQuantity: {
            $sum: '$ledgerEntries.quantity'
          }
        }
      },
      {
        $match: {
          actualQuantity: { $gt: 0 }
        }
      },
      {
        $lookup: {
          from: 'medicines',
          localField: 'medicineId',
          foreignField: '_id',
          as: 'medicine'
        }
      },
      { $unwind: '$medicine' },
      {
        $lookup: {
          from: 'generics',
          localField: 'medicine.genericId',
          foreignField: '_id',
          as: 'generic'
        }
      },
      { $unwind: { path: '$generic', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          medicineName: '$medicine.name',
          genericName: '$generic.name',
          category: '$medicine.category',
          rack: '$medicine.rackLocation',
          batchNumber: 1,
          expiryDate: 1,
          quantityAvailable: '$actualQuantity',
          purchasePrice: 1,
          mrp: 1,
          daysUntilExpiry: {
            $divide: [
              { $subtract: ['$expiryDate', new Date()] },
              1000 * 60 * 60 * 24
            ]
          },
          totalValue: { $multiply: ['$actualQuantity', '$purchasePrice'] }
        }
      },
      { $sort: { expiryDate: 1 } }
    ]);

    // 3. Sales performance analysis (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const salesPerformance = await StockMovement.aggregate([
      {
        $match: {
          medicineId: { $in: medicineIds },
          type: { $in: ['SALE', 'SALE_OUT'] },
          createdAt: { $gte: ninetyDaysAgo }
        }
      },
      {
        $group: {
          _id: '$medicineId',
          totalQuantitySold: { $sum: { $abs: '$quantity' } },
          totalRevenue: {
            $sum: {
              $multiply: [
                { $abs: '$quantity' },
                { $ifNull: ['$sellingPrice', 0] }
              ]
            }
          },
          totalCost: {
            $sum: {
              $multiply: [
                { $abs: '$quantity' },
                { $ifNull: ['$purchasePrice', 0] }
              ]
            }
          },
          saleCount: { $sum: 1 }
        }
      },
      {
        $addFields: {
          profit: { $subtract: ['$totalRevenue', '$totalCost'] }
        }
      },
      {
        $lookup: {
          from: 'medicines',
          localField: '_id',
          foreignField: '_id',
          as: 'medicine'
        }
      },
      { $unwind: '$medicine' },
      {
        $lookup: {
          from: 'generics',
          localField: 'medicine.genericId',
          foreignField: '_id',
          as: 'generic'
        }
      },
      { $unwind: { path: '$generic', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          medicineId: '$_id',
          medicineName: '$medicine.name',
          genericName: '$generic.name',
          category: '$medicine.category',
          rack: '$medicine.rackLocation',
          totalQuantitySold: 1,
          totalRevenue: 1,
          totalCost: 1,
          profit: 1,
          saleCount: 1
        }
      }
    ]);

    // Separate products by sales performance
    const highSalesProducts = salesPerformance
      .sort((a, b) => b.totalQuantitySold - a.totalQuantitySold)
      .slice(0, 20); // Top 20

    const lowSalesProducts = salesPerformance
      .filter(p => p.totalQuantitySold > 0)
      .sort((a, b) => a.totalQuantitySold - b.totalQuantitySold)
      .slice(0, 20); // Bottom 20 with at least some sales

    // 4. Products with zero sales
    const medicinesWithSales = new Set(salesPerformance.map(s => s.medicineId.toString()));
    const zeroSalesProducts = medicines
      .filter(m => !medicinesWithSales.has(m._id.toString()))
      .map(m => ({
        medicineId: m._id,
        medicineName: m.name,
        genericName: m.genericId?.name || 'N/A',
        category: m.category,
        rack: m.rackLocation || 'N/A',
        totalQuantitySold: 0,
        totalRevenue: 0,
        profit: 0,
        saleCount: 0
      }));

    // Get current stock for zero sales products
    const zeroSalesWithStock = await Promise.all(
      zeroSalesProducts.map(async (product) => {
        const batches = await Batch.find({ 
          medicineId: product.medicineId 
        }).lean();
        const totalStock = batches.reduce((sum, b) => sum + (b.quantityAvailable || 0), 0);
        return {
          ...product,
          currentStock: totalStock
        };
      })
    );

    return res.json({
      success: true,
      data: {
        expired: {
          count: expiredBatches.length,
          totalValue: expiredBatches.reduce((sum, b) => sum + (b.totalValue || 0), 0),
          items: expiredBatches
        },
        expiringSoon: {
          count: expiringSoonBatches.length,
          totalValue: expiringSoonBatches.reduce((sum, b) => sum + (b.totalValue || 0), 0),
          items: expiringSoonBatches
        },
        highSales: {
          count: highSalesProducts.length,
          totalRevenue: highSalesProducts.reduce((sum, p) => sum + (p.totalRevenue || 0), 0),
          totalProfit: highSalesProducts.reduce((sum, p) => sum + (p.profit || 0), 0),
          items: highSalesProducts
        },
        lowSales: {
          count: lowSalesProducts.length,
          totalRevenue: lowSalesProducts.reduce((sum, p) => sum + (p.totalRevenue || 0), 0),
          items: lowSalesProducts
        },
        zeroSales: {
          count: zeroSalesWithStock.length,
          totalStockValue: 0, // Can be calculated if needed
          items: zeroSalesWithStock
        },
        filters: {
          type: type || 'full',
          category: category || null,
          rack: rack || null,
          totalMedicines: medicines.length
        }
      }
    });
  } catch (error) {
    console.error('❌ Get audit analytics error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to get audit analytics' 
    });
  }
};
