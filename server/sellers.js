const express = require('express');
const router = express.Router();
const pool = require('./db');

// GET /sellers → list all sellers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         id,
         company_name,
         contact_person,
         email,
         phone,
         address,
         city,
         state,
         pincode,
         gst_number,
         payment_terms,
         created_at,
         updated_at
       FROM sellers
       ORDER BY company_name ASC`
    );

    return res.status(200).json({ sellers: result.rows });
  } catch (err) {
    console.error('Error fetching sellers:', err);
    return res.status(500).json({ message: 'Failed to fetch sellers' });
  }
});

// POST /sellers → create a new seller
router.post('/', async (req, res) => {
  try {
    const { 
      company_name, 
      contact_person, 
      email, 
      phone, 
      address, 
      city, 
      state, 
      pincode, 
      gst_number, 
      payment_terms 
    } = req.body;

    // Validate required fields
    if (!company_name) {
      return res.status(400).json({ message: 'Company name is required' });
    }

    // Create the seller
    const result = await pool.query(
      `INSERT INTO sellers (
         company_name, contact_person, email, phone, address, 
         city, state, pincode, gst_number, payment_terms, 
         created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING *`,
      [company_name, contact_person || null, email || null, phone || null, 
       address || null, city || null, state || null, pincode || null, 
       gst_number || null, payment_terms || null]
    );

    return res.status(201).json({ 
      message: 'Seller created successfully', 
      seller: result.rows[0] 
    });
  } catch (err) {
    console.error('Error creating seller:', err);
    return res.status(500).json({ message: 'Failed to create seller' });
  }
});

// PUT /sellers/:id → update a seller
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      company_name, 
      contact_person, 
      email, 
      phone, 
      address, 
      city, 
      state, 
      pincode, 
      gst_number, 
      payment_terms 
    } = req.body;

    // Validate required fields
    if (!company_name) {
      return res.status(400).json({ message: 'Company name is required' });
    }

    // Check if seller exists
    const existingSeller = await pool.query('SELECT id FROM sellers WHERE id = $1', [id]);
    if (existingSeller.rows.length === 0) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    // Update the seller
    const result = await pool.query(
      `UPDATE sellers 
       SET company_name = $1, contact_person = $2, email = $3, phone = $4, 
           address = $5, city = $6, state = $7, pincode = $8, 
           gst_number = $9, payment_terms = $10, updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [company_name, contact_person || null, email || null, phone || null, 
       address || null, city || null, state || null, pincode || null, 
       gst_number || null, payment_terms || null, id]
    );

    return res.status(200).json({ 
      message: 'Seller updated successfully', 
      seller: result.rows[0] 
    });
  } catch (err) {
    console.error('Error updating seller:', err);
    return res.status(500).json({ message: 'Failed to update seller' });
  }
});

// DELETE /sellers/:id → delete a seller
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if seller exists
    const existingSeller = await pool.query('SELECT id FROM sellers WHERE id = $1', [id]);
    if (existingSeller.rows.length === 0) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    // Delete the seller
    await pool.query('DELETE FROM sellers WHERE id = $1', [id]);

    return res.status(200).json({ message: 'Seller deleted successfully' });
  } catch (err) {
    console.error('Error deleting seller:', err);
    return res.status(500).json({ message: 'Failed to delete seller' });
  }
});

module.exports = router;
