// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

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

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../client/dist')));

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
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Server Start
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
