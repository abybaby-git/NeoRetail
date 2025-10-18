const express = require('express');
const router = express.Router();
const pool = require('./db');

// GET /purchases → list all purchases with product and seller details
router.get('/', async (req, res) => {
  try {
    console.log('Fetching purchases from database...');
    console.log('Query params:', req.query);
    
    // Build query with optional product_id filter
    let query = `SELECT 
         p.id, 
         p.product_id,
         p.seller_id,
         p.purchase_price, 
         p.quantity, 
         p.invoice_no, 
         p.created_at
       FROM purchases p`;
    
    let queryParams = [];
    
    // Add product_id filter if provided
    if (req.query.product_id) {
      query += ' WHERE p.product_id = $1';
      queryParams.push(req.query.product_id);
      console.log('Filtering by product_id:', req.query.product_id);
    }
    
    query += ' ORDER BY p.created_at DESC';
    
    const result = await pool.query(query, queryParams);
    
    console.log('Basic purchases query result:', result.rows.length, 'rows');
    
    // Now try to get product and seller names separately
    const purchasesWithDetails = await Promise.all(
      result.rows.map(async (purchase) => {
        try {
          // Get product details
          const productResult = await pool.query('SELECT name, sku FROM products WHERE id = $1', [purchase.product_id]);
          const product = productResult.rows[0] || { name: 'Unknown Product', sku: 'N/A' };
          
          // Get seller details
          const sellerResult = await pool.query('SELECT company_name, contact_person FROM sellers WHERE id = $1', [purchase.seller_id]);
          const seller = sellerResult.rows[0] || { company_name: 'Unknown Supplier', contact_person: 'N/A' };
          
          return {
            ...purchase,
            product_name: product.name,
            product_sku: product.sku,
            seller_name: seller.company_name,
            seller_contact: seller.contact_person
          };
        } catch (err) {
          console.error('Error fetching details for purchase', purchase.id, ':', err);
          return {
            ...purchase,
            product_name: 'Unknown Product',
            product_sku: 'N/A',
            seller_name: 'Unknown Supplier',
            seller_contact: 'N/A'
          };
        }
      })
    );
    
    console.log('Final purchases with details:', purchasesWithDetails.length, 'rows');
    res.status(200).json({ purchases: purchasesWithDetails });
  } catch (err) {
    console.error('Error fetching purchases:', err);
    res.status(500).json({ message: 'Failed to fetch purchases', error: err.message });
  }
});

// POST /purchases → create a new purchase
router.post('/', async (req, res) => {
  try {
    const { product_id, seller_id, purchase_price, quantity, invoice_no } = req.body;

    // Validate required fields
    if (!product_id || !seller_id || !purchase_price || !quantity) {
      return res.status(400).json({ message: 'Product ID, seller ID, purchase price, and quantity are required' });
    }

    // Create the purchase
    const result = await pool.query(
      `INSERT INTO purchases (product_id, seller_id, purchase_price, quantity, invoice_no, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [product_id, seller_id, purchase_price, quantity, invoice_no || null]
    );

    return res.status(201).json({ 
      message: 'Purchase created successfully', 
      purchase: result.rows[0] 
    });
  } catch (err) {
    console.error('Error creating purchase:', err);
    return res.status(500).json({ message: 'Failed to create purchase' });
  }
});

// PUT /purchases/:id → update a purchase
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { product_id, seller_id, purchase_price, quantity, invoice_no } = req.body;

    // Validate required fields
    if (!product_id || !seller_id || !purchase_price || !quantity) {
      return res.status(400).json({ message: 'Product ID, seller ID, purchase price, and quantity are required' });
    }

    // Check if purchase exists
    const existingPurchase = await pool.query('SELECT id FROM purchases WHERE id = $1', [id]);
    if (existingPurchase.rows.length === 0) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    // Update the purchase
    const result = await pool.query(
      `UPDATE purchases 
       SET product_id = $1, seller_id = $2, purchase_price = $3, quantity = $4, invoice_no = $5
       WHERE id = $6
       RETURNING *`,
      [product_id, seller_id, purchase_price, quantity, invoice_no || null, id]
    );

    return res.status(200).json({ 
      message: 'Purchase updated successfully', 
      purchase: result.rows[0] 
    });
  } catch (err) {
    console.error('Error updating purchase:', err);
    return res.status(500).json({ message: 'Failed to update purchase' });
  }
});

// DELETE /purchases/:id → delete a purchase
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingPurchase = await pool.query('SELECT id FROM purchases WHERE id = $1', [id]);
    if (existingPurchase.rows.length === 0) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    await pool.query('DELETE FROM purchases WHERE id = $1', [id]);
    res.status(200).json({ message: 'Purchase deleted successfully' });
  } catch (err) {
    console.error('Error deleting purchase:', err);
    res.status(500).json({ message: 'Failed to delete purchase' });
  }
});

module.exports = router;
