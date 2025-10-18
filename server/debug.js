// Debug script to test server components
console.log('🔍 Starting server diagnostics...');

// Test 1: Check Node.js version
console.log('📋 Node.js version:', process.version);

// Test 2: Check environment variables
console.log('🌍 Environment variables:');
console.log('  - NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('  - PORT:', process.env.PORT || 'not set');
console.log('  - DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'not set');

// Test 3: Check if modules can be required
try {
  console.log('📦 Testing module imports...');
  const express = require('express');
  console.log('  ✅ Express imported successfully');
  
  const cors = require('cors');
  console.log('  ✅ CORS imported successfully');
  
  const bodyParser = require('body-parser');
  console.log('  ✅ Body-parser imported successfully');
  
  const pool = require('./db');
  console.log('  ✅ Database pool imported successfully');
  
} catch (error) {
  console.error('  ❌ Module import failed:', error.message);
}

// Test 4: Test database connection
async function testDatabase() {
  try {
    console.log('🗄️ Testing database connection...');
    const pool = require('./db');
    const client = await pool.connect();
    console.log('  ✅ Database connection successful');
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('  ✅ Database query successful:', result.rows[0]);
    
    client.release();
  } catch (error) {
    console.error('  ❌ Database connection failed:', error.message);
  }
}

// Test 5: Test Express app creation
try {
  console.log('🚀 Testing Express app creation...');
  const express = require('express');
  const app = express();
  console.log('  ✅ Express app created successfully');
  
  // Test route registration
  app.get('/test', (req, res) => {
    res.json({ message: 'Test route working' });
  });
  console.log('  ✅ Route registration successful');
  
} catch (error) {
  console.error('  ❌ Express app creation failed:', error.message);
}

// Run database test
testDatabase().then(() => {
  console.log('✅ All diagnostics completed');
}).catch((error) => {
  console.error('❌ Diagnostics failed:', error);
});
