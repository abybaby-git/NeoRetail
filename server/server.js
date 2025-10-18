// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const loginRoute = require('./login');
const storesRoute = require('./stores');
const usersRoute = require('./users');
const categoriesRoute = require('./categories');
const productsRoute = require('./products');
const sellersRoute = require('./sellers');
const purchasesRoute = require('./purchases');
const stockRoute = require('./stock');
const posRoute = require('./pos');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy to get real IP address
app.set('trust proxy', true);

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/login', loginRoute);
app.use('/stores', storesRoute);
app.use('/users', usersRoute);
app.use('/categories', categoriesRoute);
app.use('/products', productsRoute);
app.use('/sellers', sellersRoute);
app.use('/purchases', purchasesRoute);
app.use('/stock', stockRoute);
app.use('/pos', posRoute);

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Server Start
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
