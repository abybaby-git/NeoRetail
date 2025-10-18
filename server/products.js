const express = require('express');
const router = express.Router();
const pool = require('./db');

// GET /products → list all products with category info
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         p.id,
         p.name,
         p.sku,
         p.category_id,
         p.unit,
         p.created_at,
         p.updated_at,
         c.name as category_name,
         c.category_no
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       ORDER BY p.id ASC`
    );

    return res.status(200).json({ products: result.rows });
  } catch (err) {
    console.error('Error fetching products:', err);
    return res.status(500).json({ message: 'Failed to fetch products' });
  }
});

// PUT /products/:id → update a product
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sku, category_id, unit } = req.body;

    // Validate required fields
    if (!name || !sku) {
      return res.status(400).json({ message: 'Name and SKU are required' });
    }

    // Check if product exists
    const existingProduct = await pool.query('SELECT id FROM products WHERE id = $1', [id]);
    if (existingProduct.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if SKU is unique (excluding current product)
    const skuCheck = await pool.query(
      'SELECT id FROM products WHERE sku = $1 AND id != $2',
      [sku, id]
    );
    if (skuCheck.rows.length > 0) {
      return res.status(400).json({ message: 'SKU already exists' });
    }

    // Update the product
    const result = await pool.query(
      `UPDATE products 
       SET name = $1, sku = $2, category_id = $3, unit = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [name, sku, category_id || null, unit || null, id]
    );

    return res.status(200).json({ 
      message: 'Product updated successfully', 
      product: result.rows[0] 
    });
  } catch (err) {
    console.error('Error updating product:', err);
    return res.status(500).json({ message: 'Failed to update product' });
  }
});

// POST /products → create a new product
router.post('/', async (req, res) => {
  try {
    const { name, sku, category_id, unit } = req.body;

    // Validate required fields
    if (!name || !sku) {
      return res.status(400).json({ message: 'Name and SKU are required' });
    }

    // Check if SKU already exists
    const skuCheck = await pool.query('SELECT id FROM products WHERE sku = $1', [sku]);
    if (skuCheck.rows.length > 0) {
      return res.status(400).json({ message: 'SKU already exists' });
    }

    // Create the product
    const result = await pool.query(
      `INSERT INTO products (name, sku, category_id, unit, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [name, sku, category_id || null, unit || null]
    );

    return res.status(201).json({ 
      message: 'Product created successfully', 
      product: result.rows[0] 
    });
  } catch (err) {
    console.error('Error creating product:', err);
    return res.status(500).json({ message: 'Failed to create product' });
  }
});

module.exports = router;
