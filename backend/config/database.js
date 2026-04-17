const mongoose = require('mongoose');
require('dotenv').config();

let uri = process.env.MONGODB_URI;

// Fallback: allow providing creds separately to avoid issues with special characters
if (!uri && process.env.MONGO_USER && process.env.MONGO_PASS && (process.env.MONGO_HOST || process.env.MONGODB_HOST)) {
  const user = encodeURIComponent(process.env.MONGO_USER);
  const pass = encodeURIComponent(process.env.MONGO_PASS);
  const host = process.env.MONGO_HOST || process.env.MONGODB_HOST;
  const dbName = process.env.MONGO_DB || process.env.MONGODB_DB || 'admin';
  uri = `mongodb+srv://${user}:${pass}@${host}/${dbName}?retryWrites=true&w=majority`;
}

const connectDB = async () => {
  if (!uri) {
    console.error('❌ MongoDB connection string is not defined.\nPlease create a `.env` file at the project root and set `MONGODB_URI` (see backend/.env.example).');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed due to app termination');
  process.exit(0);
});

module.exports = connectDB;
