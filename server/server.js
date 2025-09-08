// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const loginRoute = require('./login');
const storesRoute = require('./stores');
const usersRoute = require('./users');

const app = express();
const PORT = 5000;

// Trust proxy to get real IP address
app.set('trust proxy', true);

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/login', loginRoute);
app.use('/stores', storesRoute);
app.use('/users', usersRoute);

// Server Start
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
