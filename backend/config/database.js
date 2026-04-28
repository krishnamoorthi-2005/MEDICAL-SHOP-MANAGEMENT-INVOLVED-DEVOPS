import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const getMongoUri = () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (uri) {
    return uri;
  }

  const fallbackUri = 'mongodb://127.0.0.1:27017/medical-shop-management';
  console.warn('MONGO_URI not set – falling back to local MongoDB at', fallbackUri);
  return fallbackUri;
};

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return mongoose.connection;
  }

  const uri = getMongoUri();

  try {
    // Development: Allow self-signed certificates (MongoDB Atlas)
    // Production: Remove this option
    const mongoOptions = {
      autoIndex: true,
      maxPoolSize: 100,       // Handle 1000 concurrent users
      minPoolSize: 10,        // Keep warm connections ready
      maxIdleTimeMS: 30000,   // Close idle connections after 30s
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    };

    // If using Atlas (https), add SSL options for development
    if (uri.includes('mongodb+srv')) {
      mongoOptions.ssl = true;
      mongoOptions.tlsInsecure = process.env.NODE_ENV !== 'production'; // Allow self-signed certs in dev only
    }

    await mongoose.connect(uri, mongoOptions);

    isConnected = true;
    console.log('🔗 QR Code endpoint: http://localhost:3004/api/notifications/qr');
console.log('✅ Connected to MongoDB via Mongoose');
    console.log(`📦 Database name: ${mongoose.connection.name}`);
    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    throw error;
  }
};

export default connectDB;
export { connectDB };