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
         u.name AS manager_name,
         u.id AS manager_id
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

// GET /stores/managers → fetch all managers
router.get('/managers', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email 
       FROM users 
       WHERE LOWER(role) = 'manager'
       ORDER BY name ASC`
    );

    return res.status(200).json({ managers: result.rows });
  } catch (err) {
    console.error('Error fetching managers:', err);
    return res.status(500).json({ message: 'Failed to fetch managers' });
  }
});

// GET /stores/stats → fetch user statistics
router.get('/stats', async (req, res) => {
  try {
    // Get total managers
    const managersResult = await pool.query(
      `SELECT COUNT(*) as count FROM users WHERE LOWER(role) = 'manager'`
    );

    // Get total staff
    const staffResult = await pool.query(
      `SELECT COUNT(*) as count FROM users WHERE LOWER(role) = 'staff'`
    );

    // Get total stores
    const storesResult = await pool.query(
      `SELECT COUNT(*) as count FROM stores`
    );

    return res.status(200).json({ 
      stats: {
        totalManagers: parseInt(managersResult.rows[0].count),
        totalStaff: parseInt(staffResult.rows[0].count),
        totalStores: parseInt(storesResult.rows[0].count)
      }
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    return res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

// GET /stores/:id → get single store details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT 
         s.id,
         s.name,
         s.location,
         s.created_at,
         s.status,
         u.name AS manager_name,
         u.id AS manager_id
       FROM stores s
       LEFT JOIN users u 
         ON u.store_id = s.id AND LOWER(u.role) = 'manager'
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Store not found' });
    }

    return res.status(200).json({ store: result.rows[0] });
  } catch (err) {
    console.error('Error fetching store:', err);
    return res.status(500).json({ message: 'Failed to fetch store' });
  }
});

// PUT /stores/:id → update store details
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, status, manager_id } = req.body;

    // Validate required fields
    if (!name || !location) {
      return res.status(400).json({ 
        message: 'Store name and location are required' 
      });
    }

    // Validate status
    const validStatuses = ['online', 'closed', 'maintenance'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: 'Invalid status. Must be one of: online, closed, maintenance' 
      });
    }

    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Update store details
      const storeResult = await client.query(
        `UPDATE stores 
         SET name = $1, location = $2, status = $3 
         WHERE id = $4 
         RETURNING id, name, location, status, created_at`,
        [name, location, status, id]
      );

      if (storeResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Store not found' });
      }

      // Remove current manager assignment if exists
      await client.query(
        `UPDATE users 
         SET store_id = NULL 
         WHERE store_id = $1 AND LOWER(role) = 'manager'`,
        [id]
      );

      // Assign new manager if provided
      if (manager_id) {
        // Verify the user is actually a manager
        const managerCheck = await client.query(
          `SELECT id FROM users WHERE id = $1 AND LOWER(role) = 'manager'`,
          [manager_id]
        );

        if (managerCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'Invalid manager ID' });
        }

        // Assign manager to store
        await client.query(
          `UPDATE users 
           SET store_id = $1 
           WHERE id = $2`,
          [id, manager_id]
        );
      }

      await client.query('COMMIT');

      // Fetch updated store with manager info
      const updatedStoreResult = await pool.query(
        `SELECT 
           s.id,
           s.name,
           s.location,
           s.created_at,
           s.status,
           u.name AS manager_name,
           u.id AS manager_id
         FROM stores s
         LEFT JOIN users u 
           ON u.store_id = s.id AND LOWER(u.role) = 'manager'
         WHERE s.id = $1`,
        [id]
      );

      return res.status(200).json({ 
        message: 'Store updated successfully',
        store: updatedStoreResult.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('Error updating store:', err);
    return res.status(500).json({ message: 'Failed to update store' });
  }
});

// DELETE /stores/:id → delete a store
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if store exists
      const storeCheck = await client.query(
        `SELECT id, name FROM stores WHERE id = $1`,
        [id]
      );

      if (storeCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Store not found' });
      }

      // Remove manager assignment if exists
      await client.query(
        `UPDATE users 
         SET store_id = NULL 
         WHERE store_id = $1 AND LOWER(role) = 'manager'`,
        [id]
      );

      // Delete the store
      await client.query(
        `DELETE FROM stores WHERE id = $1`,
        [id]
      );

      await client.query('COMMIT');

      return res.status(200).json({ 
        message: 'Store deleted successfully',
        deletedStore: storeCheck.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('Error deleting store:', err);
    return res.status(500).json({ message: 'Failed to delete store' });
  }
});

// POST /stores → create a new store
router.post('/', async (req, res) => {
  try {
    const { name, location, status = 'online' } = req.body;

    // Validate required fields
    if (!name || !location) {
      return res.status(400).json({ 
        message: 'Store name and location are required' 
      });
    }

    // Validate status
    const validStatuses = ['online', 'closed', 'maintenance'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: 'Invalid status. Must be one of: online, closed, maintenance' 
      });
    }

    // Insert new store
    const result = await pool.query(
      `INSERT INTO stores (name, location, status, created_at) 
       VALUES ($1, $2, $3, NOW()) 
       RETURNING id, name, location, status, created_at`,
      [name, location, status]
    );

    const newStore = result.rows[0];
    
    return res.status(201).json({ 
      message: 'Store created successfully',
      store: newStore
    });
  } catch (err) {
    console.error('Error creating store:', err);
    return res.status(500).json({ message: 'Failed to create store' });
  }
});

module.exports = router;


