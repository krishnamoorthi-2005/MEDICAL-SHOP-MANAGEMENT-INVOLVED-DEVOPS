import connectDB from '../config/database.js';
import Generic from '../models/Generic.js';
import Manufacturer from '../models/Manufacturer.js';
import Medicine from '../models/Medicine.js';
import Supplier from '../models/Supplier.js';
import Batch from '../models/Batch.js';
import StockMovement from '../models/StockMovement.js';
import StockLedger from '../models/StockLedger.js';
import Sale from '../models/Sale.js';
import Purchase from '../models/Purchase.js';
import WriteOffLog from '../models/WriteOffLog.js';
import Role from '../models/Role.js';
import User from '../models/User.js';
import DailySalesSummary from '../models/DailySalesSummary.js';
import bcrypt from 'bcrypt';

console.log('🚀 PHARMACY DATABASE INITIALIZATION STARTING...\n');

const initializeDatabase = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    console.log('📦 Creating collections and indexes...\n');

    // Create collections by triggering schema validation
    const collections = [
      { model: Generic, name: 'Generics' },
      { model: Manufacturer, name: 'Manufacturers' },
      { model: Medicine, name: 'Medicines' },
      { model: Supplier, name: 'Suppliers' },
      { model: Batch, name: 'Batches (STOCK LIVES HERE)' },
      { model: StockMovement, name: 'Stock Movements (LEDGER - CRITICAL)' },
      { model: Sale, name: 'Sales' },
      { model: Purchase, name: 'Purchases' },
      { model: WriteOffLog, name: 'Write-Off Logs' },
      { model: Role, name: 'Roles' },
      { model: User, name: 'Users' },
      { model: DailySalesSummary, name: 'Daily Sales Summary (Precomputed)' }
    ];

    for (const { model, name } of collections) {
      try {
        await model.createCollection();
        console.log(`✅ ${name} collection created`);
      } catch (err) {
        if (err.code === 48) {
          console.log(`✅ ${name} collection already exists`);
        } else {
          throw err;
        }
      }
    }

    console.log('\n🔥 Dropping existing indexes to avoid conflicts...');
    
    // Drop all existing indexes first
    const collectionsToDrop = [
      Generic, Manufacturer, Medicine, Supplier, Batch, StockMovement,
      Sale, Purchase, WriteOffLog, Role, User, DailySalesSummary
    ];
    
    for (const model of collectionsToDrop) {
      try {
        await model.collection.dropIndexes();
      } catch (err) {
        // Ignore errors if indexes don't exist
      }
    }
    
    console.log('✅ Old indexes dropped\n');
    console.log('🔥 Creating fresh indexes...');
    
    // Ensure all indexes are created
    await Promise.all([
      Generic.createIndexes(),
      Manufacturer.createIndexes(),
      Medicine.createIndexes(),
      Supplier.createIndexes(),
      Batch.createIndexes(),
      StockMovement.createIndexes(),
      Sale.createIndexes(),
      Purchase.createIndexes(),
      WriteOffLog.createIndexes(),
      Role.createIndexes(),
      User.createIndexes(),
      DailySalesSummary.createIndexes()
    ]);

    console.log('✅ All indexes created successfully\n');

    // Create default roles
    console.log('👥 Creating default roles...');
    const roles = [
      {
        roleName: 'Admin',
        permissions: ['*'],
        description: 'Full system access'
      },
      {
        roleName: 'Manager',
        permissions: ['inventory.*', 'sales.*', 'purchases.*', 'reports.view'],
        description: 'Manage inventory and operations'
      },
      {
        roleName: 'Staff',
        permissions: ['inventory.view', 'sales.view', 'purchases.view'],
        description: 'General staff access'
      },
      {
        roleName: 'Cashier',
        permissions: ['sales.create', 'inventory.view'],
        description: 'Billing and sales only'
      },
      {
        roleName: 'Auditor',
        permissions: ['*.view', 'reports.*'],
        description: 'View-only access with full reports'
      }
    ];

    for (const roleData of roles) {
      await Role.findOneAndUpdate(
        { roleName: roleData.roleName },
        roleData,
        { upsert: true, new: true }
      );
      console.log(`✅ Role created: ${roleData.roleName}`);
    }

    // Create default admin user
    console.log('\n👤 Creating default admin user...');
    const adminRole = await Role.findOne({ roleName: 'Admin' });
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await User.findOneAndUpdate(
      { username: 'admin' },
      {
        username: 'admin',
        passwordHash: hashedPassword,
        fullName: 'System Administrator',
        email: 'admin@gmail.com',
        roleId: adminRole._id,
        status: 'active'
      },
      { upsert: true, new: true }
    );

    console.log('✅ Admin user created');
    console.log('   Username: admin');
    console.log('   Password: admin123');

    // Create sample data
    console.log('\n📊 Creating sample data...');

    // Create a generic
    const paracetamolGeneric = await Generic.findOneAndUpdate(
      { name: 'Paracetamol' },
      {
        name: 'Paracetamol',
        therapeuticClass: 'Analgesic',
        commonUses: 'Pain relief and fever reduction'
      },
      { upsert: true, new: true }
    );

    // Create a manufacturer
    const ciplaManufacturer = await Manufacturer.findOneAndUpdate(
      { name: 'Cipla Ltd' },
      {
        name: 'Cipla Ltd',
        contact: '+91-9876543210',
        email: 'contact@cipla.com',
        address: 'Mumbai, India',
        gstNumber: 'GST123456789',
        status: 'active'
      },
      { upsert: true, new: true }
    );

    // Create a supplier
    const supplier = await Supplier.findOneAndUpdate(
      { phone: '+91-9876543210' },
      {
        name: 'ABC Pharmaceuticals',
        phone: '+91-9876543210',
        email: 'abc@pharma.com',
        address: 'Delhi, India',
        gstNumber: 'GST987654321',
        status: 'active'
      },
      { upsert: true, new: true }
    );

    // Create a medicine
    const medicine = await Medicine.findOneAndUpdate(
      { name: 'Crocin 650mg' },
      {
        name: 'Crocin 650mg',
        genericId: paracetamolGeneric._id,
        manufacturerId: ciplaManufacturer._id,
        category: 'Analgesic',
        unitType: 'tablet',
        rackLocation: 'A1',
        minStockLevel: 100,
        maxStockLevel: 1000,
        gstRate: 12,
        discontinued: false
      },
      { upsert: true, new: true }
    );

    // Create a batch
    const batch = await Batch.findOneAndUpdate(
      { batchNumber: 'BATCH-2026-001' },
      {
        medicineId: medicine._id,
        batchNumber: 'BATCH-2026-001',
        expiryDate: new Date('2027-12-31'),
        purchasePrice: 10,
        mrp: 20,
        quantityAvailable: 500,
        supplierId: supplier._id,
        receivedDate: new Date()
      },
      { upsert: true, new: true }
    );

    // Create initial stock movement (purchase)
    await StockMovement.create({
      medicineId: medicine._id,
      batchId: batch._id,
      type: 'PURCHASE',
      quantity: 500,
      referenceType: 'po',
      previousStock: 0,
      newStock: 500,
      purchasePrice: 5,
      unitPrice: 5,
      totalValue: 2500
    });

    // Create sample sales data (today's sales and past sales for trends)
    const adminUser = await User.findOne({ username: 'admin' });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Today's sales
    const todaySale = await Sale.create({
      invoiceNumber: `INV-${Date.now()}`,
      customerId: null,
      items: [
        {
          medicineId: medicine._id,
          batchId: batch._id,
          medicineName: medicine.name,
          quantity: 10,
          unitPrice: 20,
          lineTotal: 200
        }
      ],
      subtotal: 200,
      taxAmount: 24,
      discountAmount: 0,
      total: 224,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      userId: adminUser?._id,
      createdAt: today,
      updatedAt: today
    });

    // Past 6 days sales for trend data
    for (let i = 1; i <= 6; i++) {
      const pastDate = new Date(today);
      pastDate.setDate(pastDate.getDate() - i);
      const qty = 5 + i;
      const lineTotal = qty * 20;
      const taxAmount = (lineTotal * 12) / 100;
      
      await Sale.create({
        invoiceNumber: `INV-PAST-${i}-${Date.now()}`,
        customerId: null,
        items: [
          {
            medicineId: medicine._id,
            batchId: batch._id,
            medicineName: medicine.name,
            quantity: qty,
            unitPrice: 20,
            lineTotal: lineTotal
          }
        ],
        subtotal: lineTotal,
        taxAmount: taxAmount,
        discountAmount: 0,
        total: lineTotal + taxAmount,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        userId: adminUser?._id,
        createdAt: pastDate,
        updatedAt: pastDate
      });
    }

    // Create stock ledger entries for sales
    const salesQuery = await Sale.find().sort({ createdAt: -1 }).limit(7).lean();
    for (const sale of salesQuery) {
      for (const item of sale.items) {
        await StockLedger.create({
          medicineId: item.medicineId,
          batchId: item.batchId,
          type: 'SALE',
          quantity: -item.quantity,
          purchasePrice: 10,  // Cost price
          sellingPrice: item.unitPrice,
          totalValue: -(item.lineTotal),
          referenceId: sale._id,
          referenceType: 'sale',
          previousStock: 500,
          newStock: 500 - item.quantity,
          description: `Sale ${sale.invoiceNumber}`,
          createdAt: sale.createdAt,
          updatedAt: sale.createdAt
        });
      }
    }

    console.log('✅ Sample data created successfully\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 DATABASE INITIALIZATION COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📦 Database Name: pharmacy_system');
    console.log('✅ All collections created');
    console.log('✅ All indexes applied');
    console.log('✅ Batch-level stock implemented');
    console.log('✅ Stock movement ledger active');
    console.log('✅ Default admin user created\n');

    console.log('🔐 Login Credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123\n');

    console.log('📊 Sample Data:');
    console.log('   ✅ 1 Generic (Paracetamol)');
    console.log('   ✅ 1 Manufacturer (Cipla Ltd)');
    console.log('   ✅ 1 Supplier (ABC Pharmaceuticals)');
    console.log('   ✅ 1 Medicine (Crocin 650mg)');
    console.log('   ✅ 1 Batch (500 units in stock)');
    console.log('   ✅ 1 Stock Movement (initial purchase)\n');

    console.log('🚀 Next Steps:');
    console.log('   1. Start building the transaction engine');
    console.log('   2. Implement billing API');
    console.log('   3. Implement FEFO logic\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

initializeDatabase();
