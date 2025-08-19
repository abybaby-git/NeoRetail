const pool = require('./db');
const bcrypt = require('bcrypt');

const samplePassword = 'hello123'; // Change this to test other passwords

(async () => {
  try {
    const result = await pool.query('SELECT * FROM user_credentials');
    for (const row of result.rows) {
      const match = await bcrypt.compare(samplePassword, row.password_hash);
      console.log(`Email: ${row.email}, Hash: ${row.password_hash}, Match with '${samplePassword}':`, match);
    }
  } catch (err) {
    console.error('Error fetching user_credentials:', err);
  } finally {
    await pool.end();
  }
})();
