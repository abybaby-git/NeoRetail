const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'neoretail',
  password: '051121',
  port: 5432,
});

pool.connect()
  .then(() => console.log('PostgreSQL connected successfully.'))
  .catch(err => console.error('PostgreSQL connection error:', err));

module.exports = pool;
