const { Pool } = require('pg');

// Use your Render PostgreSQL credentials
const pool = new Pool({
  connectionString: "postgresql://neoretail_db_user:Lr8CCbAhJiZrWNKawOanzxqRXcAXBAP6@dpg-d3pve8bipnbc73a7g300-a.oregon-postgres.render.com/neoretail_db",
  ssl: { rejectUnauthorized: false } // Required for Render
});

pool.connect()
  .then(() => console.log('PostgreSQL connected successfully.'))
  .catch(err => console.error('PostgreSQL connection error:', err));

module.exports = pool;
