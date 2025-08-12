const mongoose = require('mongoose');
const User = require('../server/models/User');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/building_management');
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log(`Email: ${existingAdmin.email}`);
      process.exit(0);
    }

    // Get admin details
    const adminData = {};
    
    adminData.firstName = await question('שם פרטי: ');
    adminData.lastName = await question('שם משפחה: ');
    adminData.email = await question('אימייל: ');
    adminData.phone = await question('טלפון: ');
    adminData.password = await question('סיסמה: ');
    adminData.role = 'admin';

    // Create admin user
    const admin = new User(adminData);
    await admin.save();

    console.log('\n✅ Admin user created successfully!');
    console.log(`Email: ${admin.email}`);
    console.log(`Name: ${admin.firstName} ${admin.lastName}`);
    console.log('\nYou can now login to the system.');

  } catch (error) {
    console.error('Error creating admin:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

const question = (query) => {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
};

// Load environment variables
require('dotenv').config();

createAdmin();