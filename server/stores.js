const express = require('express');
const router = express.Router();
const pool = require('./db');

// GET /stores → list stores with manager name (if any)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         s.id,
         s.name,
         s.location,
         s.created_at,
         s.status,
         u.name AS manager_name
       FROM stores s
       LEFT JOIN users u 
         ON u.store_id = s.id AND LOWER(u.role) = 'manager'
       ORDER BY s.id ASC`
    );

    return res.status(200).json({ stores: result.rows });
  } catch (err) {
    console.error('Error fetching stores:', err);
    return res.status(500).json({ message: 'Failed to fetch stores' });
  }
});

module.exports = router;


