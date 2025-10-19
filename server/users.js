const express = require('express');
const router = express.Router();
const pool = require('./db');
const bcrypt = require('bcrypt');

// GET /users/me -> get current user info (for debugging)
router.get('/me', async (req, res) => {
  try {
    // This endpoint would need authentication middleware in a real app
    // For now, we'll use it for debugging
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ message: 'user_id is required' });
    }
    
    const result = await pool.query(
      `SELECT id, name, email, role, store_id, status, created_at
       FROM users
       WHERE id = $1`,
      [user_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ user: result.rows[0] });
  } catch (err) {
    console.error('Failed to fetch user info:', err);
    res.status(500).json({ message: 'Failed to fetch user info' });
  }
});

// GET /users -> list all users with optional filters
router.get('/', async (req, res) => {
  try {
    const { role, status, q, store_id } = req.query;
    const conditions = [];
    const params = [];

    if (role) { params.push(role.toLowerCase()); conditions.push(`LOWER(role) = $${params.length}`); }
    if (status) { params.push(status.toLowerCase()); conditions.push(`LOWER(status) = $${params.length}`); }
    if (store_id) { params.push(store_id); conditions.push(`store_id = $${params.length}`); }
    if (q) { params.push(`%${q.toLowerCase()}%`); conditions.push(`(LOWER(name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length})`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT id, name, email, role, store_id, rfid_uid, status, created_at
       FROM users
       ${where}
       ORDER BY id ASC`,
      params
    );

    res.status(200).json({ users: result.rows });
  } catch (err) {
    console.error('Failed to fetch users:', err);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// POST /users -> create new user
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, email, role, store_id, rfid_uid, status } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({ message: 'name, email and role are required' });
    }

    await client.query('BEGIN');

    // Create user record
    const insert = await client.query(
      `INSERT INTO users (name, email, role, store_id, rfid_uid, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, store_id, rfid_uid, status, created_at`,
      [name.trim(), email.trim(), role.toLowerCase(), store_id || null, rfid_uid || null, status || 'active']
    );

    const newUser = insert.rows[0];
    const userId = newUser.id;

    // Generate credentials: username = email, password = role@123
    const username = email.trim();
    const password = `${role.toLowerCase()}@123`;
    const passwordHash = await bcrypt.hash(password, 10);

    // Create credentials record
    await client.query(
      `INSERT INTO user_credentials (user_id, username, password_hash, login_attempts, last_login)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, username, passwordHash, 0, null]
    );

    await client.query('COMMIT');

    res.status(201).json({ 
      message: 'User created successfully', 
      user: newUser,
      credentials: {
        username: username,
        password: password,
        note: 'Please save these credentials securely'
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to create user:', err);
    
    // Handle specific error cases
    if (err.code === '23505') { // Unique constraint violation
      if (err.constraint === 'users_email_key') {
        return res.status(400).json({ message: 'Email already exists' });
      } else if (err.constraint === 'user_credentials_username_key') {
        return res.status(400).json({ message: 'Username (email) already exists' });
      }
    }
    
    res.status(500).json({ message: 'Failed to create user' });
  } finally {
    client.release();
  }
});

// PUT /users/:id -> update user
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { name, email, role, store_id, rfid_uid, status } = req.body;

    await client.query('BEGIN');

    const update = await client.query(
      `UPDATE users SET 
         name = COALESCE($1, name),
         email = COALESCE($2, email),
         role = COALESCE($3, role),
         store_id = $4,
         rfid_uid = $5,
         status = COALESCE($6, status)
       WHERE id = $7
       RETURNING id, name, email, role, store_id, rfid_uid, status, created_at`,
      [name?.trim() ?? null, email?.trim() ?? null, role ? role.toLowerCase() : null, store_id ?? null, rfid_uid ?? null, status ?? null, id]
    );

    await client.query('COMMIT');

    if (update.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ message: 'User updated', user: update.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to update user:', err);
    res.status(500).json({ message: 'Failed to update user' });
  } finally {
    client.release();
  }
});

// DELETE /users/:id -> delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const del = await pool.query(`DELETE FROM users WHERE id = $1 RETURNING id`, [id]);
    if (del.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ message: 'User deleted' });
  } catch (err) {
    console.error('Failed to delete user:', err);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

module.exports = router;


