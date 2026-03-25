import Customer from '../models/Customer.js';
import Sale from '../models/Sale.js';

/* ── GET /api/customers ─────────────────────────────────── */
export const getCustomers = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 50, active } = req.query;
    const query = {
      isActive: true, // Default to showing only active customers
    };

    // Only filter by userId for regular users (not Admin or Staff)
    const userRole = (req.user.role || '').toLowerCase();
    if (userRole !== 'admin' && userRole !== 'staff') {
      query.userId = req.user.id; // Regular users only see their own customers
    }

    if (search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { phone: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    // Allow explicitly requesting inactive or all customers
    if (active !== undefined) {
      query.isActive = active === 'true';
    }

    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .sort({ totalSpent: -1, name: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, customers, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── GET /api/customers/:id ─────────────────────────────── */
export const getCustomerById = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    
    // Only filter by userId for regular users (not Admin or Staff)
    const userRole = (req.user.role || '').toLowerCase();
    if (userRole !== 'admin' && userRole !== 'staff') {
      query.userId = req.user.id; // Regular users only see their own customers
    }
    
    const customer = await Customer.findOne(query);
    
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    // Fetch recent purchase history
    const sales = await Sale.find({ customerId: customer._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('invoiceNumber total paymentMethod createdAt items');

    res.json({ success: true, customer, sales });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── POST /api/customers ────────────────────────────────── */
export const createCustomer = async (req, res) => {
  try {
    const { name, phone, email, address, dateOfBirth, notes } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required' });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const normalizedPhone = phone.trim();
    const normalizedEmail = (email || '').trim().toLowerCase();

    // Customers are globally unique by phone. Reuse the existing record if one exists
    // instead of failing payment flow with a duplicate key error.
    const customer = await Customer.findOneAndUpdate(
      { phone: normalizedPhone },
      {
        $set: {
          name: name.trim(),
          email: normalizedEmail,
          address: address || '',
          dateOfBirth: dateOfBirth || undefined,
          notes: notes || '',
          isActive: true,
        },
        $setOnInsert: {
          userId: req.user.id,
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json({ success: true, customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── PUT /api/customers/:id ─────────────────────────────── */
export const updateCustomer = async (req, res) => {
  try {
    const { name, phone, email, address, dateOfBirth, notes, isActive, totalSpent, totalVisits, nextPurchaseDate } = req.body;
    const userRole = (req.user.role || '').toLowerCase();

    // Avoid phone collision with another customer (within this user's scope)
    if (phone) {
      const conflictQuery = { 
        phone: phone.trim(), 
        _id: { $ne: req.params.id } 
      };
      // Regular users check within their scope, Admin/Staff check globally
      if (userRole !== 'admin' && userRole !== 'staff') {
        conflictQuery.userId = req.user.id;
      }
      
      const conflict = await Customer.findOne(conflictQuery);
      
      if (conflict) {
        return res.status(409).json({ success: false, message: 'Phone number already used by another customer' });
      }
    }

    const updateQuery = { _id: req.params.id };
    if (userRole !== 'admin' && userRole !== 'staff') {
      updateQuery.userId = req.user.id; // Regular users only update their own customers
    }

    const customer = await Customer.findOneAndUpdate(
      updateQuery,
      { name, phone, email, address, dateOfBirth, notes, isActive, totalSpent, totalVisits, nextPurchaseDate },
      { new: true, runValidators: true }
    );

    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── DELETE /api/customers/:id (soft-delete) ────────────── */
export const deleteCustomer = async (req, res) => {
  try {
    const deleteQuery = { _id: req.params.id };
    const userRole = (req.user.role || '').toLowerCase();
    if (userRole !== 'admin' && userRole !== 'staff') {
      deleteQuery.userId = req.user.id; // Regular users only delete their own customers
    }

    const customer = await Customer.findOneAndUpdate(
      deleteQuery,
      { isActive: false },
      { new: true }
    );
    
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, message: 'Customer deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── GET /api/customers/:id/history ─────────────────────── */
export const getCustomerHistory = async (req, res) => {
  try {
    // Security: verify customer belongs to this user (or user is Admin/Staff)
    const query = { _id: req.params.id };
    const userRole = (req.user.role || '').toLowerCase();
    if (userRole !== 'admin' && userRole !== 'staff') {
      query.userId = req.user.id;
    }

    const customer = await Customer.findOne(query);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const sales = await Sale.find({ customerId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('invoiceNumber total paymentMethod createdAt items');

    const totalSpent = sales.reduce((sum, s) => sum + (s.total || 0), 0);

    res.json({ success: true, sales, totalSpent, count: sales.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── GET /api/customers/search (dedicated search for active customers) ── */
export const searchActiveCustomers = async (req, res) => {
  try {
    const { query = '', limit = 10 } = req.query;

    if (!query || query.trim().length < 1) {
      return res.json({ success: true, customers: [] });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const searchQuery = {
      isActive: true,        // Always filter for active customers only
      $or: [
        { name: { $regex: query.trim(), $options: 'i' } },
        { phone: { $regex: query.trim(), $options: 'i' } },
        { email: { $regex: query.trim(), $options: 'i' } },
      ],
    };

    // Only filter by userId for regular users (not Admin or Staff)
    if (userRole !== 'admin' && userRole !== 'staff') {
      searchQuery.userId = req.user.id;
    }

    const customers = await Customer.find(searchQuery)
      .select('name phone email totalSpent totalVisits lastVisit isActive')
      .sort({ totalSpent: -1, name: 1 })
      .limit(Number(limit));

    res.json({ success: true, customers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── GET /api/customers/my-info (get customer data by email/phone for logged-in user) ── */
export const getMyCustomerInfo = async (req, res) => {
  try {
    const { email, phone } = req.query;

    if (!email && !phone) {
      return res.status(400).json({ success: false, message: 'Email or phone required' });
    }

    // Find customer record that matches the user's email or phone
    const query = {};
    if (email) query.email = email.trim().toLowerCase();
    if (phone) query.phone = phone.trim();

    const customer = await Customer.findOne(query);

    if (!customer) {
      return res.json({ 
        success: true, 
        customer: null,
        message: 'No customer record found. Make your first purchase in store!' 
      });
    }

    // Get recent purchases
    const sales = await Sale.find({ customerId: customer._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('invoiceNumber total paymentMethod createdAt items')
      .populate('items.medicineId', 'name');

    res.json({ 
      success: true, 
      customer: {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        totalSpent: customer.totalSpent || 0,
        totalVisits: customer.totalVisits || 0,
        lastVisit: customer.lastVisit,
        nextPurchaseDate: customer.nextPurchaseDate
      },
      sales 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

