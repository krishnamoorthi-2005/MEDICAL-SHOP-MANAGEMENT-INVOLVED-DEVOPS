import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import User from '../models/User.js';
import Role from '../models/Role.js';
import Customer from '../models/Customer.js';

const buildUserPayload = (user, role) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  role: role?.roleName || 'user',
  status: user.status,
});

const getFallbackRole = async () => {
  let role = await Role.findOne({ roleName: 'user' });
  if (!role) {
    role = await Role.findOne({ roleName: 'User' });
  }
  return role;
};

const normalizeEmail = (email) => (email || '').trim().toLowerCase();

export const signup = async (req, res) => {
  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

    const { username, fullName, email, phone, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email);
    const normalizedUsername = (username || '').trim().toLowerCase();

    // Validation
    if (!normalizedUsername || !fullName || !normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'username, fullName, email and password are required',
      });
    }

    if (normalizedUsername.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters long',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Check for existing user by username or email
    const existing = await User.findOne({ 
      $or: [
        { username: normalizedUsername },
        { email: normalizedEmail }
      ] 
    }).lean();
    
    if (existing) {
      if (existing.username === normalizedUsername) {
        return res.status(409).json({
          success: false,
          message: 'Username already exists. Please choose another.',
        });
      }
      if (existing.email === normalizedEmail) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists. Please use a different email.',
        });
      }
    }

    // Default role is "user"
    let role = await Role.findOne({ roleName: 'user' });
    if (!role) {
      role = await Role.findOne({ roleName: 'User' });
    }
    if (!role) {
      role = await Role.create({
        roleName: 'user',
        permissions: [],
        description: 'Default application user',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username: normalizedUsername,
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : undefined,
      passwordHash,
      roleId: role._id,
      status: 'active',
    });

    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured on the server');
    }

    // Auto-create a Customer record so the user appears in the admin Customers section
    try {
      const existingCustomer = await Customer.findOne({ email: normalizedEmail });
      if (!existingCustomer) {
        // Use phone if provided, otherwise use a placeholder derived from email
        const customerPhone = (phone && phone.trim()) ? phone.trim() : `email:${normalizedEmail}`;
        // Check phone uniqueness before creating
        const phoneConflict = await Customer.findOne({ phone: customerPhone });
        if (!phoneConflict) {
          await Customer.create({
            name: fullName.trim(),
            email: normalizedEmail,
            phone: customerPhone,
            userId: user._id,
            isActive: true,
          });
        }
      }
    } catch (customerErr) {
      // Non-fatal: log but don't fail signup
      console.warn('⚠️ Could not auto-create customer record:', customerErr.message);
    }

    const payload = buildUserPayload(user, role);
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.status(201).json({
      success: true,
      token,
      user: payload,
    });
  } catch (error) {
    console.error('❌ Signup error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to sign up',
    });
  }
};

export const login = async (req, res) => {
  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

    const { email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const user = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { username: normalizedEmail },
      ],
    })
      .populate('roleId')
      .exec();
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'User account is inactive',
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash || '');
    if (!ok) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    await User.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );

    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured on the server');
    }

    const role = user.roleId || await getFallbackRole();
    const payload = buildUserPayload(user, role);
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.json({
      success: true,
      token,
      user: payload,
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to login',
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Check if user exists
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // For security, don't reveal if email exists or not
      // Return success anyway to prevent email enumeration attacks
      return res.json({
        success: true,
        message: 'If this email is registered, you will receive password reset instructions',
      });
    }

    // Generate reset token (expires in 1 hour)
    const resetToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // In a real app, you would:
    // 1. Store this token in the database with expiration
    // 2. Send an email with a reset link
    // For now, we'll just return a message about what would happen

    console.log(`📧 Password reset token generated for ${normalizedEmail}`);
    console.log(`   Reset link would be: http://localhost:3000/reset-password?token=${resetToken}`);
    
    // Note: In production, integrate with email service like SendGrid, Nodemailer, etc.
    // Email template example:
    // Subject: Reset Your Pharmacy Password
    // Body: Click the link below to reset your password (expires in 1 hour)
    // Link: http://yourapp.com/reset-password?token=${resetToken}

    return res.json({
      success: true,
      message: 'If this email is registered, you will receive password reset instructions',
      // Note: In development, you can uncomment the token for testing:
      // token: resetToken,
    });
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process password reset request',
    });
  }
};
