const express = require('express');
const router = express.Router();
const pool = require('./db');

// GET /stock → list all stock with product, store, and seller details
router.get('/', async (req, res) => {
  try {
    console.log('Fetching stock from database...');
    console.log('Query params:', req.query);
    
    // Build query with optional store_id filter
    let query = `SELECT 
         s.id, 
         s.product_id,
         s.store_id,
         s.seller_id,
         s.purchase_id,
         s.quantity, 
         s.selling_price, 
         s.barcode, 
         s.rack_location,
         s.created_at,
         s.updated_at,
         p.purchase_price
       FROM stock s
       LEFT JOIN purchases p ON s.purchase_id = p.id`;
    
    let queryParams = [];
    
    // Add filters if provided
    const conditions = [];
    if (req.query.store_id) {
      conditions.push('s.store_id = $' + (queryParams.length + 1));
      queryParams.push(req.query.store_id);
      console.log('Filtering by store_id:', req.query.store_id);
    }
    if (req.query.product_id) {
      conditions.push('s.product_id = $' + (queryParams.length + 1));
      queryParams.push(req.query.product_id);
      console.log('Filtering by product_id:', req.query.product_id);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY s.created_at DESC';
    
    const result = await pool.query(query, queryParams);
    
    console.log('Basic stock query result:', result.rows.length, 'rows');
    if (req.query.store_id) {
      console.log('Filtered results for store_id', req.query.store_id, ':', result.rows.map(r => ({ id: r.id, store_id: r.store_id, product_id: r.product_id })));
    }
    
    // Get detailed information for each stock item
    const stockWithDetails = await Promise.all(
      result.rows.map(async (stock) => {
        try {
          // Get product details with category
          const productResult = await pool.query(
            `SELECT p.name, p.sku, c.name as category_name 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             WHERE p.id = $1`, 
            [stock.product_id]
          );
          const product = productResult.rows[0] || { name: 'Unknown Product', sku: 'N/A', category_name: 'Unknown Category' };
          
          // Get store details
          const storeResult = await pool.query('SELECT name FROM stores WHERE id = $1', [stock.store_id]);
          const store = storeResult.rows[0] || { name: 'Unknown Store' };
          
          // Get seller details
          const sellerResult = await pool.query('SELECT company_name, contact_person FROM sellers WHERE id = $1', [stock.seller_id]);
          const seller = sellerResult.rows[0] || { company_name: 'Unknown Supplier', contact_person: 'N/A' };
          
          // Get sold quantity for this specific stock item
          const soldResult = await pool.query(
            'SELECT COALESCE(SUM(quantity), 0) as sold_quantity FROM pos_sale_items WHERE stock_id = $1',
            [stock.id]
          );
          const soldQuantity = parseFloat(soldResult.rows[0].sold_quantity);
          const remainingQuantity = parseFloat(stock.quantity) - soldQuantity;
          
          return {
            ...stock,
            product_name: product.name,
            product_sku: product.sku,
            category_name: product.category_name,
            store_name: store.name,
            seller_name: seller.company_name,
            seller_contact: seller.contact_person,
            sold_quantity: soldQuantity,
            remaining_quantity: remainingQuantity
          };
        } catch (err) {
          console.error('Error fetching details for stock', stock.id, ':', err);
          return {
            ...stock,
            product_name: 'Unknown Product',
            product_sku: 'N/A',
            category_name: 'Unknown Category',
            store_name: 'Unknown Store',
            seller_name: 'Unknown Supplier',
            seller_contact: 'N/A',
            sold_quantity: 0,
            remaining_quantity: parseFloat(stock.quantity)
          };
        }
      })
    );
    
    console.log('Final stock with details:', stockWithDetails.length, 'rows');
    res.status(200).json({ stock: stockWithDetails });
  } catch (err) {
    console.error('Error fetching stock:', err);
    res.status(500).json({ message: 'Failed to fetch stock', error: err.message });
  }
});

// POST /stock → create a new stock entry
router.post('/', async (req, res) => {
  try {
    const { product_id, store_id, seller_id, purchase_id, quantity, selling_price, barcode, rack_location } = req.body;

    // Validate required fields
    if (!product_id || !store_id || !seller_id || !quantity || !selling_price || !barcode) {
      return res.status(400).json({ message: 'Product ID, Store ID, Seller ID, Quantity, Selling Price, and Barcode are required' });
    }

    // Create the stock entry
    const result = await pool.query(
      `INSERT INTO stock (product_id, store_id, seller_id, purchase_id, quantity, selling_price, barcode, rack_location, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [product_id, store_id, seller_id, purchase_id || null, quantity, selling_price, barcode, rack_location || null]
    );

    return res.status(201).json({ 
      message: 'Stock entry created successfully', 
      stock: result.rows[0] 
    });

  } catch (err) {
    console.error('Error creating stock entry:', err);
    
    // Handle unique constraint violation for barcode
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Barcode already exists. Please use a unique barcode.' });
    }
    
    res.status(500).json({ message: 'Failed to create stock entry', error: err.message });
  }
});

// PUT /stock/:id → update a stock entry
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { product_id, store_id, seller_id, purchase_id, quantity, selling_price, barcode, rack_location } = req.body;

    // Validate required fields
    if (!product_id || !store_id || !seller_id || !quantity || !selling_price || !barcode) {
      return res.status(400).json({ message: 'Product ID, Store ID, Seller ID, Quantity, Selling Price, and Barcode are required' });
    }

    // Check if stock entry exists
    const existingStock = await pool.query('SELECT id, quantity, purchase_id FROM stock WHERE id = $1', [id]);
    if (existingStock.rows.length === 0) {
      return res.status(404).json({ message: 'Stock entry not found' });
    }

    const currentStock = existingStock.rows[0];
    const currentQuantity = parseFloat(currentStock.quantity);
    const newQuantity = parseFloat(quantity);
    const quantityDifference = newQuantity - currentQuantity;

    // If quantity is being increased, check if it exceeds available purchase quantity
    if (quantityDifference > 0) {
      // Get total purchased quantity for this product
      const purchaseResult = await pool.query(
        'SELECT COALESCE(SUM(quantity), 0) as total_purchased FROM purchases WHERE product_id = $1',
        [product_id]
      );
      
      const totalPurchased = parseFloat(purchaseResult.rows[0].total_purchased);
      
      // Get total quantity already allocated for this product
      const allocatedResult = await pool.query(
        'SELECT COALESCE(SUM(quantity), 0) as total_allocated FROM stock WHERE product_id = $1',
        [product_id]
      );
      
      const totalAllocated = parseFloat(allocatedResult.rows[0].total_allocated);
      const maxAvailableQuantity = totalPurchased - (totalAllocated - currentQuantity);
      
      if (newQuantity > maxAvailableQuantity) {
        return res.status(400).json({ 
          message: `Quantity exceeds the max stock. Max available quantity: ${maxAvailableQuantity} (Total purchased: ${totalPurchased}, Already allocated: ${totalAllocated - currentQuantity})` 
        });
      }
    }

    // Update the stock entry
    const result = await pool.query(
      `UPDATE stock 
       SET product_id = $1, store_id = $2, seller_id = $3, purchase_id = $4, quantity = $5, selling_price = $6, barcode = $7, rack_location = $8, updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [product_id, store_id, seller_id, purchase_id || null, quantity, selling_price, barcode, rack_location || null, id]
    );

    return res.status(200).json({ 
      message: 'Stock entry updated successfully', 
      stock: result.rows[0] 
    });

  } catch (err) {
    console.error('Error updating stock entry:', err);
    
    // Handle unique constraint violation for barcode
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Barcode already exists. Please use a unique barcode.' });
    }
    
    res.status(500).json({ message: 'Failed to update stock entry', error: err.message });
  }
});

// DELETE /stock/:id → delete a stock entry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if stock entry exists
    const existingStock = await pool.query('SELECT id FROM stock WHERE id = $1', [id]);
    if (existingStock.rows.length === 0) {
      return res.status(404).json({ message: 'Stock entry not found' });
    }

    // Delete the stock entry
    await pool.query('DELETE FROM stock WHERE id = $1', [id]);
    
    return res.status(200).json({ message: 'Stock entry deleted successfully' });

  } catch (err) {
    console.error('Error deleting stock entry:', err);
    res.status(500).json({ message: 'Failed to delete stock entry', error: err.message });
  }
});

// GET /stock/stats → get store-wise stock statistics
router.get('/stats', async (req, res) => {
  try {
    console.log('Fetching store-wise stock statistics...');
    
    // Get all stores first
    const storesResult = await pool.query(
      `SELECT id, name, status FROM stores ORDER BY id ASC`
    );
    
    console.log('Stores found:', storesResult.rows.length);
    
    // Get stock statistics for each store
    const storeStats = await Promise.all(
      storesResult.rows.map(async (store) => {
        try {
          // Get total products in this store
          const totalProductsResult = await pool.query(
            `SELECT COUNT(DISTINCT product_id) as total_products 
             FROM stock WHERE store_id = $1`,
            [store.id]
          );
          
          // Get stock levels
          const stockLevelsResult = await pool.query(
            `SELECT 
               COUNT(CASE WHEN quantity > 10 THEN 1 END) as in_stock,
               COUNT(CASE WHEN quantity > 0 AND quantity <= 10 THEN 1 END) as low_stock,
               COUNT(CASE WHEN quantity = 0 THEN 1 END) as out_of_stock,
               SUM(quantity * selling_price) as stock_value
             FROM stock WHERE store_id = $1`,
            [store.id]
          );
          
          const stats = stockLevelsResult.rows[0];
          
          return {
            store_id: store.id,
            store_name: store.name,
            status: store.status,
            total_products: parseInt(totalProductsResult.rows[0].total_products) || 0,
            in_stock: parseInt(stats.in_stock) || 0,
            low_stock: parseInt(stats.low_stock) || 0,
            out_of_stock: parseInt(stats.out_of_stock) || 0,
            stock_value: parseFloat(stats.stock_value) || 0
          };
        } catch (err) {
          console.error(`Error fetching stats for store ${store.id}:`, err);
          return {
            store_id: store.id,
            store_name: store.name,
            status: store.status,
            total_products: 0,
            in_stock: 0,
            low_stock: 0,
            out_of_stock: 0,
            stock_value: 0
          };
        }
      })
    );
    
    console.log('Store stats calculated:', storeStats.length, 'stores');
    res.status(200).json({ storeStats });
  } catch (err) {
    console.error('Error fetching store stats:', err);
    res.status(500).json({ message: 'Failed to fetch store statistics', error: err.message });
  }
});

// GET /stock/available-purchases → get purchases with remaining quantities available for assignment
router.get('/available-purchases', async (req, res) => {
  try {
    console.log('Fetching available purchases for stock assignment...');
    
    // Get all purchases with their remaining quantities
    const result = await pool.query(
      `SELECT 
         p.id as purchase_id,
         p.product_id,
         p.seller_id,
         p.purchase_price,
         p.quantity as total_quantity,
         p.invoice_no,
         p.created_at,
         pr.name as product_name,
         pr.sku as product_sku,
         s.company_name as seller_name,
         COALESCE(SUM(st.quantity), 0) as assigned_quantity,
         (p.quantity - COALESCE(SUM(st.quantity), 0)) as remaining_quantity
       FROM purchases p
       LEFT JOIN stock st ON p.id = st.purchase_id
       LEFT JOIN products pr ON p.product_id = pr.id
       LEFT JOIN sellers s ON p.seller_id = s.id
       GROUP BY p.id, p.product_id, p.seller_id, p.purchase_price, p.quantity, p.invoice_no, p.created_at, pr.name, pr.sku, s.company_name
       HAVING (p.quantity - COALESCE(SUM(st.quantity), 0)) > 0
       ORDER BY p.created_at DESC`
    );
    
    console.log('Available purchases found:', result.rows.length);
    res.status(200).json({ availablePurchases: result.rows });
  } catch (err) {
    console.error('Error fetching available purchases:', err);
    res.status(500).json({ message: 'Failed to fetch available purchases', error: err.message });
  }
});

// POST /stock/assign → assign stock from purchase to store
router.post('/assign', async (req, res) => {
  try {
    const { purchase_id, store_id, quantity, selling_price, barcode, rack_location } = req.body;

    // Validate required fields
    if (!purchase_id || !store_id || !quantity || !selling_price || !barcode) {
      return res.status(400).json({ 
        message: 'Purchase ID, Store ID, Quantity, Selling Price, and Barcode are required' 
      });
    }

    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get purchase details and check remaining quantity
      const purchaseResult = await client.query(
        `SELECT 
           p.id, p.product_id, p.seller_id, p.quantity as total_quantity,
           COALESCE(SUM(st.quantity), 0) as assigned_quantity
         FROM purchases p
         LEFT JOIN stock st ON p.id = st.purchase_id
         WHERE p.id = $1
         GROUP BY p.id, p.product_id, p.seller_id, p.quantity`,
        [purchase_id]
      );

      if (purchaseResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Purchase not found' });
      }

      const purchase = purchaseResult.rows[0];
      const remainingQuantity = purchase.total_quantity - purchase.assigned_quantity;

      // Check if requested quantity is available
      if (quantity > remainingQuantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: `Insufficient quantity. Only ${remainingQuantity} units available for assignment.` 
        });
      }

      // Check if store exists
      const storeResult = await client.query('SELECT id, name FROM stores WHERE id = $1', [store_id]);
      if (storeResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Store not found' });
      }

      // Check if barcode already exists
      const barcodeResult = await client.query('SELECT id FROM stock WHERE barcode = $1', [barcode]);
      if (barcodeResult.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Barcode already exists. Please use a unique barcode.' });
      }

      // Create the stock assignment
      const stockResult = await client.query(
        `INSERT INTO stock (product_id, store_id, seller_id, purchase_id, quantity, selling_price, barcode, rack_location, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         RETURNING *`,
        [purchase.product_id, store_id, purchase.seller_id, purchase_id, quantity, selling_price, barcode, rack_location || null]
      );

      await client.query('COMMIT');

      // Get detailed information for the response
      const detailedResult = await pool.query(
        `SELECT 
           st.*,
           pr.name as product_name,
           pr.sku as product_sku,
           s.name as store_name,
           sel.company_name as seller_name
         FROM stock st
         LEFT JOIN products pr ON st.product_id = pr.id
         LEFT JOIN stores s ON st.store_id = s.id
         LEFT JOIN sellers sel ON st.seller_id = sel.id
         WHERE st.id = $1`,
        [stockResult.rows[0].id]
      );

      return res.status(201).json({ 
        message: 'Stock assigned successfully', 
        stock: detailedResult.rows[0],
        remainingQuantity: remainingQuantity - quantity
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('Error assigning stock:', err);
    res.status(500).json({ message: 'Failed to assign stock', error: err.message });
  }
});

// GET /stock/purchase/:id/remaining → get remaining quantity for a specific purchase
router.get('/purchase/:id/remaining', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT 
         p.id as purchase_id,
         p.product_id,
         p.quantity as total_quantity,
         COALESCE(SUM(st.quantity), 0) as assigned_quantity,
         (p.quantity - COALESCE(SUM(st.quantity), 0)) as remaining_quantity,
         pr.name as product_name,
         pr.sku as product_sku
       FROM purchases p
       LEFT JOIN stock st ON p.id = st.purchase_id
       LEFT JOIN products pr ON p.product_id = pr.id
       WHERE p.id = $1
       GROUP BY p.id, p.product_id, p.quantity, pr.name, pr.sku`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    res.status(200).json({ purchase: result.rows[0] });
  } catch (err) {
    console.error('Error fetching purchase remaining quantity:', err);
    res.status(500).json({ message: 'Failed to fetch remaining quantity', error: err.message });
  }
});

module.exports = router;
