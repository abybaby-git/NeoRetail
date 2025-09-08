const express = require('express');
const router = express.Router();
const pool = require('./db');

// GET /users -> list all users with optional filters
router.get('/', async (req, res) => {
  try {
    const { role, status, q } = req.query;
    const conditions = [];
    const params = [];

    if (role) { params.push(role.toLowerCase()); conditions.push(`LOWER(role) = $${params.length}`); }
    if (status) { params.push(status.toLowerCase()); conditions.push(`LOWER(status) = $${params.length}`); }
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
  try {
    const { name, email, role, store_id, rfid_uid, status } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({ message: 'name, email and role are required' });
    }

    const insert = await pool.query(
      `INSERT INTO users (name, email, role, store_id, rfid_uid, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, store_id, rfid_uid, status, created_at`,
      [name.trim(), email.trim(), role.toLowerCase(), store_id || null, rfid_uid || null, status || 'active']
    );

    res.status(201).json({ message: 'User created', user: insert.rows[0] });
  } catch (err) {
    console.error('Failed to create user:', err);
    res.status(500).json({ message: 'Failed to create user' });
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


