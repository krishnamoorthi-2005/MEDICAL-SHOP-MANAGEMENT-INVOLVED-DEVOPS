import Medicine from '../models/Medicine.js';
import Generic from '../models/Generic.js';
import Manufacturer from '../models/Manufacturer.js';
import Supplier from '../models/Supplier.js';
import Batch from '../models/Batch.js';
import StockLedger from '../models/StockLedger.js';

const toISODate = (date) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().split('T')[0];
};

export const searchMedicines = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    // Run generic/manufacturer lookups in parallel
    const [matchingGenerics, matchingManufacturers] = await Promise.all([
      Generic.find({ name: { $regex: q, $options: 'i' } }).select('_id').lean(),
      Manufacturer.find({ name: { $regex: q, $options: 'i' } }).select('_id').lean(),
    ]);

    const searchConditions = [
      { name: { $regex: q, $options: 'i' } },
      { category: { $regex: q, $options: 'i' } },
    ];
    if (matchingGenerics.length > 0) searchConditions.push({ genericId: { $in: matchingGenerics.map(g => g._id) } });
    if (matchingManufacturers.length > 0) searchConditions.push({ manufacturerId: { $in: matchingManufacturers.map(m => m._id) } });

    const medicines = await Medicine.find({ $or: searchConditions, discontinued: { $ne: true } })
      .limit(20)
      .populate('genericId', 'name')
      .populate('manufacturerId', 'name')
      .lean();

    if (medicines.length === 0) return res.json({ success: true, data: [] });

    const medicineIds = medicines.map(m => m._id);

    // Single batch query for ALL batches and ALL ledger balances
    const [allBatches, ledgerBalances] = await Promise.all([
      Batch.find({ medicineId: { $in: medicineIds } }).sort({ expiryDate: 1 }).lean(),
      StockLedger.aggregate([
        { $match: { medicineId: { $in: medicineIds } } },
        { $group: { _id: '$batchId', quantity: { $sum: '$quantity' } } },
      ]),
    ]);

    const balanceMap = new Map(ledgerBalances.map(l => [l._id.toString(), l.quantity || 0]));
    const batchesByMed = new Map();
    for (const b of allBatches) {
      const key = b.medicineId.toString();
      if (!batchesByMed.has(key)) batchesByMed.set(key, []);
      batchesByMed.get(key).push(b);
    }

    const results = medicines.map(med => {
      const batches = batchesByMed.get(med._id.toString()) || [];
      const activeBatches = batches.filter(b => (balanceMap.get(b._id.toString()) || 0) > 0);
      const totalStock = activeBatches.reduce((sum, b) => sum + (balanceMap.get(b._id.toString()) || 0), 0);
      const mrp = activeBatches[0]?.mrp || 0;

      return {
        _id: med._id,
        name: med.name,
        genericId: med.genericId,
        manufacturerId: med.manufacturerId,
        category: med.category,
        unitType: med.unitType,
        rackLocation: med.rackLocation,
        minStockLevel: med.minStockLevel,
        maxStockLevel: med.maxStockLevel,
        stock: totalStock,
        mrp,
        inStock: totalStock > 0,
        batches: activeBatches.map(b => ({
          id: b._id,
          batchNumber: b.batchNumber,
          expiryDate: b.expiryDate,
          quantity: balanceMap.get(b._id.toString()) || 0,
          mrp: b.mrp,
          purchasePrice: b.purchasePrice,
        })),
      };
    });

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('❌ Medicine search error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to search medicines' });
  }
};

export const getMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.find({}).populate('manufacturerId', 'name').lean();

    if (medicines.length === 0) return res.json({ success: true, data: [] });

    const medicineIds = medicines.map(m => m._id);

    // Single batch query — eliminates N+1
    const [allBatches, ledgerBalances] = await Promise.all([
      Batch.find({ medicineId: { $in: medicineIds } }).sort({ expiryDate: 1 }).lean(),
      StockLedger.aggregate([
        { $match: { medicineId: { $in: medicineIds } } },
        { $group: { _id: '$batchId', quantity: { $sum: '$quantity' } } },
      ]),
    ]);

    const balanceMap = new Map(ledgerBalances.map(l => [l._id.toString(), l.quantity || 0]));
    const batchesByMed = new Map();
    for (const b of allBatches) {
      const key = b.medicineId.toString();
      if (!batchesByMed.has(key)) batchesByMed.set(key, []);
      batchesByMed.get(key).push(b);
    }

    const data = medicines.map(med => {
      const batches = batchesByMed.get(med._id.toString()) || [];
      const activeBatches = batches.filter(b => (balanceMap.get(b._id.toString()) || 0) > 0);
      const totalStock = activeBatches.reduce((sum, b) => sum + (balanceMap.get(b._id.toString()) || 0), 0);

      const nearestExpiry = activeBatches.length > 0
        ? toISODate(activeBatches.reduce((min, b) => (b.expiryDate && b.expiryDate < min ? b.expiryDate : min), activeBatches[0].expiryDate))
        : null;

      const stockStatus = totalStock === 0 ? 'out_of_stock'
        : totalStock <= (med.minStockLevel || 0) ? 'low_stock'
        : 'in_stock';

      const mrp = activeBatches[0]?.mrp || 0;

      return {
        id: med._id,
        name: med.name,
        category: med.category,
        unitType: med.unitType,
        rackLocation: med.rackLocation,
        minStockLevel: med.minStockLevel,
        maxStockLevel: med.maxStockLevel,
        isActive: !med.discontinued,
        manufacturer: med.manufacturerId?.name || 'Unknown',
        stock: totalStock,
        mrp,
        batches: activeBatches.map(b => ({
          id: b._id,
          batchNumber: b.batchNumber,
          expiryDate: b.expiryDate,
          quantity: balanceMap.get(b._id.toString()) || 0,
          mrp: b.mrp,
          purchasePrice: b.purchasePrice,
          createdAt: b.createdAt,
        })),
        nearestExpiry,
        stockStatus,
        createdAt: med.createdAt,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Get medicines error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch medicines' });
  }
};

export const getMedicine = async (req, res) => {
  try {
    const med = await Medicine.findById(req.params.id)
      .populate('manufacturerId', 'name')
      .lean();

    if (!med) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    const batches = await Batch.find({ medicineId: med._id }).sort({ expiryDate: 1 }).lean();

    const batchIds = batches.map((b) => b._id);
    const ledger = await StockLedger.aggregate([
      { $match: { medicineId: med._id, batchId: { $in: batchIds } } },
      { $group: { _id: '$batchId', quantity: { $sum: '$quantity' } } },
    ]);
    const balanceMap = new Map(ledger.map((l) => [l._id.toString(), l.quantity || 0]));

    const totalStock = batches.reduce(
      (sum, b) => sum + (balanceMap.get(b._id.toString()) || 0),
      0,
    );

    const data = {
      id: med._id,
      name: med.name,
      category: med.category,
      unitType: med.unitType,
      rackLocation: med.rackLocation,
      minStockLevel: med.minStockLevel,
      maxStockLevel: med.maxStockLevel,
      gstRate: med.gstRate,
      isActive: !med.discontinued,
      manufacturer: med.manufacturerId?.name || 'Unknown',
      stock: totalStock,
      batches: batches.map((b) => ({
        id: b._id,
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        quantity: balanceMap.get(b._id.toString()) || 0,
        mrp: b.mrp,
        purchasePrice: b.purchasePrice,
        createdAt: b.createdAt,
      })),
      createdAt: med.createdAt,
    };

    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Get medicine error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch medicine' });
  }
};

// Create medicine and optional initial batch
export const createMedicine = async (req, res) => {
  try {
    const {
      name,
      genericName,
      category,
      manufacturer,
      batchNumber,
      expiryDate,
      quantity,
      purchasePrice,
      mrp,
      rack,
    } = req.body || {};

    if (!name || !category || !manufacturer) {
      return res.status(400).json({
        success: false,
        message: 'Name, category, and manufacturer are required',
      });
    }

    let generic = await Generic.findOne({ name: genericName || name });
    if (!generic) {
      generic = await Generic.create({
        name: genericName || name,
        therapeuticClass: category,
      });
    }

    let mfr = await Manufacturer.findOne({ name: manufacturer });
    if (!mfr) {
      mfr = await Manufacturer.create({ name: manufacturer });
    }

    const medicine = await Medicine.create({
      name,
      genericId: generic._id,
      manufacturerId: mfr._id,
      category,
      unitType: 'tablet',
      rackLocation: rack || 'Not Assigned',
      minStockLevel: 50,
      maxStockLevel: 1000,
      gstRate: 12,
    });

    const qtyNum = quantity ? parseInt(quantity, 10) : 0;

    if (batchNumber && qtyNum > 0) {
      let supplier = await Supplier.findOne({ name: 'Default Supplier' });
      if (!supplier) {
        supplier = await Supplier.create({
          name: 'Default Supplier',
          phone: '0000000000',
          email: 'supplier@pharmacy.com',
          address: 'Default Supplier Address',
          status: 'active',
        });
      }

      const batch = await Batch.create({
        medicineId: medicine._id,
        batchNumber,
        expiryDate: expiryDate ? new Date(expiryDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        purchasePrice: parseFloat(purchasePrice) || 0,
        mrp: parseFloat(mrp) || 0,
        quantityAvailable: 0,
        supplierId: supplier._id,
        receivedDate: new Date(),
      });

      await StockLedger.recordMovement({
        medicineId: medicine._id,
        batchId: batch._id,
        type: 'PURCHASE_IN',
        quantity: qtyNum,
        previousStock: 0,
        newStock: qtyNum,
        referenceType: 'po',
        reason: 'Initial stock - New product added',
        unitPrice: parseFloat(purchasePrice) || 0,
        purchasePrice: parseFloat(purchasePrice) || 0,
        totalValue: qtyNum * (parseFloat(purchasePrice) || 0),
      });
    }

    res.status(201).json({
      success: true,
      message: 'Medicine created successfully',
      data: medicine,
    });
  } catch (error) {
    console.error('❌ Create medicine error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create medicine' });
  }
};

export const discontinueMedicine = async (req, res) => {
  try {
    const { medicineId } = req.params;

    if (!medicineId) {
      return res.status(400).json({ success: false, message: 'Medicine ID is required' });
    }

    const medicine = await Medicine.findById(medicineId);
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    medicine.discontinued = true;
    await medicine.save();

    res.status(200).json({
      success: true,
      message: 'Medicine marked as discontinued',
      data: {
        medicineId: medicine._id,
        name: medicine.name,
        discontinued: medicine.discontinued,
      },
    });
  } catch (error) {
    console.error('❌ Discontinue medicine error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to discontinue medicine' });
  }
};

export const updateRackLocation = async (req, res) => {
  try {
    const { medicineId } = req.params;
    const { rackLocation } = req.body || {};

    if (!rackLocation) {
      return res.status(400).json({ success: false, message: 'Rack location is required' });
    }

    const medicine = await Medicine.findByIdAndUpdate(
      medicineId,
      { rackLocation },
      { new: true },
    )
      .populate('genericId', 'name')
      .populate('manufacturerId', 'name');

    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    res.json({
      success: true,
      message: 'Rack location updated successfully',
      data: medicine,
    });
  } catch (error) {
    console.error('❌ Update rack location error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update rack location' });
  }
};

// Update purchase/selling prices for a medicine's batches
export const updateMedicinePrices = async (req, res) => {
  try {
    const { medicineId } = req.params;
    const { purchasePrice, mrp } = req.body || {};

    if (!medicineId) {
      return res.status(400).json({ success: false, message: 'Medicine ID is required' });
    }

    if (purchasePrice == null && mrp == null) {
      return res.status(400).json({ success: false, message: 'At least one of purchasePrice or mrp is required' });
    }

    const medicine = await Medicine.findById(medicineId).lean();
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    const update = {};
    if (purchasePrice != null && !Number.isNaN(Number(purchasePrice))) {
      update.purchasePrice = Number(purchasePrice);
    }
    if (mrp != null && !Number.isNaN(Number(mrp))) {
      update.mrp = Number(mrp);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid price values provided' });
    }

    // Update all batches for this medicine; prices are metadata and
    // do not affect ledger quantities.
    await Batch.updateMany({ medicineId }, { $set: update });

    res.json({
      success: true,
      message: 'Prices updated successfully',
      data: {
        medicineId,
        ...update,
      },
    });
  } catch (error) {
    console.error('❌ Update medicine prices error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update medicine prices' });
  }
};
