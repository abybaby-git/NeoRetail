// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

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
const PORT = 5000;

// Trust proxy to get real IP address
app.set('trust proxy', true);

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Serve static files from the React app build directory (if it exists)
const clientDistPath = path.join(__dirname, '../client/dist');
try {
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
  }
} catch (error) {
  console.log('Client build directory not found, skipping static file serving');
}

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

// Catch all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../client/dist/index.html');
  try {
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ message: 'Frontend not built yet. Please build the client first.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Server Start
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
