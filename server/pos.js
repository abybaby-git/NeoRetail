const express = require('express');
const router = express.Router();
const pool = require('./db');

// GET /pos/products - Get available products for POS (with stock info)
router.get('/products', async (req, res) => {
  try {
    const { store_id, search } = req.query;
    
    if (!store_id) {
      return res.status(400).json({ message: 'store_id is required' });
    }

    let query = `
      SELECT 
        s.id as stock_id,
        s.product_id,
        s.quantity as allocated_quantity,
        s.selling_price,
        s.barcode,
        s.rack_location,
        p.name as product_name,
        p.sku,
        c.name as category_name,
        COALESCE(sold_quantities.total_sold, 0) as total_sold,
        (s.quantity - COALESCE(sold_quantities.total_sold, 0)) as available_quantity
      FROM stock s
      JOIN products p ON s.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN (
        SELECT 
          stock_id,
          SUM(quantity) as total_sold
        FROM pos_sale_items
        GROUP BY stock_id
      ) sold_quantities ON s.id = sold_quantities.stock_id
      WHERE s.store_id = $1 AND (s.quantity - COALESCE(sold_quantities.total_sold, 0)) > 0
    `;
    
    let params = [store_id];
    
    if (search) {
      query += ` AND (LOWER(p.name) LIKE $2 OR LOWER(p.sku) LIKE $2 OR LOWER(s.barcode) LIKE $2)`;
      params.push(`%${search.toLowerCase()}%`);
    }
    
    query += ` ORDER BY p.name ASC`;
    
    const result = await pool.query(query, params);
    
    res.status(200).json({ products: result.rows });
  } catch (err) {
    console.error('Error fetching POS products:', err);
    res.status(500).json({ message: 'Failed to fetch products', error: err.message });
  }
});

// GET /pos/products/:barcode - Get product by barcode
router.get('/products/barcode/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params;
    const { store_id } = req.query;
    
    if (!store_id) {
      return res.status(400).json({ message: 'store_id is required' });
    }

    const result = await pool.query(`
      SELECT 
        s.id as stock_id,
        s.product_id,
        s.quantity as allocated_quantity,
        s.selling_price,
        s.barcode,
        s.rack_location,
        p.name as product_name,
        p.sku,
        c.name as category_name,
        COALESCE(sold_quantities.total_sold, 0) as total_sold,
        (s.quantity - COALESCE(sold_quantities.total_sold, 0)) as available_quantity
      FROM stock s
      JOIN products p ON s.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN (
        SELECT 
          stock_id,
          SUM(quantity) as total_sold
        FROM pos_sale_items
        GROUP BY stock_id
      ) sold_quantities ON s.id = sold_quantities.stock_id
      WHERE s.barcode = $1 AND s.store_id = $2 AND (s.quantity - COALESCE(sold_quantities.total_sold, 0)) > 0
    `, [barcode, store_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found or out of stock' });
    }
    
    res.status(200).json({ product: result.rows[0] });
  } catch (err) {
    console.error('Error fetching product by barcode:', err);
    res.status(500).json({ message: 'Failed to fetch product', error: err.message });
  }
});

// POST /pos/sales - Create a new sale
router.post('/sales', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      store_id,
      user_id,
      items,
      total_amount,
      total_discount = 0,
      total_tax = 0,
      grand_total,
      payment_method = 'Cash',
      payments
    } = req.body;
    
    // Validate required fields
    if (!store_id || !user_id || !items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Missing required fields: store_id, user_id, and items array');
    }
    
    if (!grand_total || grand_total <= 0) {
      throw new Error('Invalid grand_total');
    }
    
    // Create sale record
    const saleResult = await client.query(`
      INSERT INTO pos_sales (
        store_id, user_id, total_amount, total_discount, total_tax, 
        grand_total, payment_method, payment_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      store_id, user_id, total_amount, total_discount, total_tax,
      grand_total, payment_method, 'paid'
    ]);
    
    const sale = saleResult.rows[0];
    
    // Create sale items
    for (const item of items) {
      const { product_id, stock_id, quantity, discount = 0, total_amount: item_total } = item;
      
      // Validate item
      if (!product_id || !stock_id || !quantity || !item_total) {
        throw new Error('Invalid item data');
      }
      
      // Create sale item
      await client.query(`
        INSERT INTO pos_sale_items (
          sale_id, product_id, stock_id, quantity, discount, total_amount
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [sale.id, product_id, stock_id, quantity, discount, item_total]);
      
      // Note: Stock quantities are not reduced on sale - they remain as allocated quantities
      // Low stock is calculated by comparing stock quantities with sold quantities
    }
    
    // Create payment records if provided
    if (payments && Array.isArray(payments)) {
      for (const payment of payments) {
        const { payment_method: method, amount_paid, payment_reference } = payment;
        
        await client.query(`
          INSERT INTO pos_payments (
            sale_id, payment_method, amount_paid, payment_reference
          ) VALUES ($1, $2, $3, $4)
        `, [sale.id, method, amount_paid, payment_reference]);
      }
    }
    
    await client.query('COMMIT');
    
    // Fetch complete sale details
    const completeSale = await pool.query(`
      SELECT 
        s.*,
        u.name as cashier_name,
        st.name as store_name
      FROM pos_sales s
      JOIN users u ON s.user_id = u.id
      JOIN stores st ON s.store_id = st.id
      WHERE s.id = $1
    `, [sale.id]);
    
    res.status(201).json({ 
      message: 'Sale created successfully',
      sale: completeSale.rows[0]
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating sale:', err);
    res.status(500).json({ message: 'Failed to create sale', error: err.message });
  } finally {
    client.release();
  }
});

// GET /pos/sales - Get sales history
router.get('/sales', async (req, res) => {
  try {
    const { store_id, user_id, date_from, date_to, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        s.*,
        u.name as cashier_name,
        st.name as store_name
      FROM pos_sales s
      JOIN users u ON s.user_id = u.id
      JOIN stores st ON s.store_id = st.id
      WHERE 1=1
    `;
    
    let params = [];
    let paramCount = 0;
    
    if (store_id) {
      paramCount++;
      query += ` AND s.store_id = $${paramCount}`;
      params.push(store_id);
    }
    
    if (user_id) {
      paramCount++;
      query += ` AND s.user_id = $${paramCount}`;
      params.push(user_id);
    }
    
    if (date_from) {
      paramCount++;
      query += ` AND s.sale_date >= $${paramCount}`;
      params.push(date_from);
    }
    
    if (date_to) {
      paramCount++;
      query += ` AND s.sale_date <= $${paramCount}`;
      params.push(date_to);
    }
    
    query += ` ORDER BY s.sale_date DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, params);
    
    res.status(200).json({ sales: result.rows });
  } catch (err) {
    console.error('Error fetching sales:', err);
    res.status(500).json({ message: 'Failed to fetch sales', error: err.message });
  }
});

// GET /pos/sales/report - Get comprehensive sales report with items and payments
router.get('/sales/report', async (req, res) => {
  try {
    const { store_id, date_from, date_to } = req.query;
    
    if (!store_id) {
      return res.status(400).json({ message: 'store_id is required' });
    }
    
    // Build date filter
    let dateFilter = '';
    let params = [store_id];
    let paramCount = 1;
    
    if (date_from) {
      paramCount++;
      dateFilter += ` AND s.sale_date >= $${paramCount}::date`;
      params.push(date_from);
    }
    
    if (date_to) {
      paramCount++;
      dateFilter += ` AND s.sale_date <= $${paramCount}::date + interval '1 day' - interval '1 second'`;
      params.push(date_to);
    }
    
    // Get sales with items and payments
    const query = `
      SELECT 
        s.id as sale_id,
        s.sale_date,
        s.total_amount,
        s.total_discount,
        s.total_tax,
        s.grand_total,
        s.payment_status,
        s.payment_method,
        u.name as cashier_name,
        st.name as store_name,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'item_id', si.id,
                'product_id', si.product_id,
                'product_name', p.name,
                'sku', p.sku,
                'quantity', si.quantity,
                'selling_price', si.total_amount / si.quantity,
                'discount', si.discount,
                'total_amount', si.total_amount
              )
            )
            FROM pos_sale_items si
            JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = s.id
          ), 
          '[]'::json
        ) as items,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'payment_method', pp.payment_method,
                'amount_paid', pp.amount_paid,
                'payment_reference', pp.payment_reference,
                'created_at', pp.created_at
              )
            )
            FROM pos_payments pp
            WHERE pp.sale_id = s.id
          ), 
          '[]'::json
        ) as payments
      FROM pos_sales s
      JOIN users u ON s.user_id = u.id
      JOIN stores st ON s.store_id = st.id
      WHERE s.store_id = $1 ${dateFilter}
      ORDER BY s.sale_date DESC
    `;
    
    const result = await pool.query(query, params);
    
    // Calculate summary statistics
    const summary = {
      total_sales: result.rows.reduce((sum, sale) => sum + parseFloat(sale.grand_total), 0),
      total_transactions: result.rows.length,
      total_discount: result.rows.reduce((sum, sale) => sum + parseFloat(sale.total_discount || 0), 0),
      total_tax: result.rows.reduce((sum, sale) => sum + parseFloat(sale.total_tax || 0), 0)
    };
    
    res.status(200).json({ 
      sales: result.rows,
      summary: summary
    });
  } catch (err) {
    console.error('Error fetching sales report:', err);
    res.status(500).json({ message: 'Failed to fetch sales report', error: err.message });
  }
});

// GET /pos/sales/:id - Get sale details with items
router.get('/sales/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get sale details
    const saleResult = await pool.query(`
      SELECT 
        s.*,
        u.name as cashier_name,
        st.name as store_name
      FROM pos_sales s
      JOIN users u ON s.user_id = u.id
      JOIN stores st ON s.store_id = st.id
      WHERE s.id = $1
    `, [id]);
    
    if (saleResult.rows.length === 0) {
      return res.status(404).json({ message: 'Sale not found' });
    }
    
    // Get sale items
    const itemsResult = await pool.query(`
      SELECT 
        si.*,
        p.name as product_name,
        p.sku,
        s.selling_price,
        s.barcode
      FROM pos_sale_items si
      JOIN products p ON si.product_id = p.id
      LEFT JOIN stock s ON si.stock_id = s.id
      WHERE si.sale_id = $1
    `, [id]);
    
    // Get payments
    const paymentsResult = await pool.query(`
      SELECT * FROM pos_payments WHERE sale_id = $1 ORDER BY created_at ASC
    `, [id]);
    
    res.status(200).json({
      sale: saleResult.rows[0],
      items: itemsResult.rows,
      payments: paymentsResult.rows
    });
    
  } catch (err) {
    console.error('Error fetching sale details:', err);
    res.status(500).json({ message: 'Failed to fetch sale details', error: err.message });
  }
});

// GET /pos/sales/:id/receipt - Generate receipt data
router.get('/sales/:id/receipt', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get complete sale data for receipt
    const result = await pool.query(`
      SELECT 
        s.*,
        u.name as cashier_name,
        st.name as store_name,
        st.location as store_location,
        (
          SELECT json_agg(
            json_build_object(
              'product_name', p.name,
              'sku', p.sku,
              'quantity', si.quantity,
              'selling_price', s2.selling_price,
              'discount', si.discount,
              'total_amount', si.total_amount
            )
          )
          FROM pos_sale_items si
          JOIN products p ON si.product_id = p.id
          LEFT JOIN stock s2 ON si.stock_id = s2.id
          WHERE si.sale_id = s.id
        ) as items,
        (
          SELECT json_agg(
            json_build_object(
              'payment_method', payment_method,
              'amount_paid', amount_paid,
              'payment_reference', payment_reference
            )
          )
          FROM pos_payments
          WHERE sale_id = s.id
        ) as payments
      FROM pos_sales s
      JOIN users u ON s.user_id = u.id
      JOIN stores st ON s.store_id = st.id
      WHERE s.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Sale not found' });
    }
    
    res.status(200).json({ receipt: result.rows[0] });
    
  } catch (err) {
    console.error('Error generating receipt:', err);
    res.status(500).json({ message: 'Failed to generate receipt', error: err.message });
  }
});

// GET /pos/low-stock/:store_id - Get low stock items for a store (stock - sold <= 5)
router.get('/low-stock/:store_id', async (req, res) => {
  try {
    const { store_id } = req.params;
    
    const query = `
      SELECT 
        s.id as stock_id,
        s.product_id,
        p.name as product_name,
        p.sku,
        s.quantity as allocated_quantity,
        s.selling_price,
        s.purchase_price,
        s.barcode,
        s.rack_location,
        s.expiry_date,
        COALESCE(sold_quantities.total_sold, 0) as total_sold,
        (s.quantity - COALESCE(sold_quantities.total_sold, 0)) as remaining_quantity
      FROM stock s
      JOIN products p ON s.product_id = p.id
      LEFT JOIN (
        SELECT 
          stock_id,
          SUM(quantity) as total_sold
        FROM pos_sale_items
        GROUP BY stock_id
      ) sold_quantities ON s.id = sold_quantities.stock_id
      WHERE s.store_id = $1 
        AND (s.quantity - COALESCE(sold_quantities.total_sold, 0)) <= 5
      ORDER BY remaining_quantity ASC, p.name ASC
    `;
    
    const result = await pool.query(query, [store_id]);
    
    res.status(200).json({ 
      low_stock_items: result.rows,
      total_items: result.rows.length
    });
  } catch (err) {
    console.error('Error fetching low stock items:', err);
    res.status(500).json({ message: 'Failed to fetch low stock items', error: err.message });
  }
});

// GET /pos/admin/reports - Get sales reports for all stores (Admin only)
router.get('/admin/reports', async (req, res) => {
  try {
    const { store_id, date_from, date_to, limit = 50, offset = 0 } = req.query;
    
    // Build date filter
    let dateFilter = '';
    let params = [];
    let paramCount = 0;
    
    if (date_from) {
      paramCount++;
      dateFilter += ` AND s.sale_date >= $${paramCount}::date`;
      params.push(date_from);
    }
    
    if (date_to) {
      paramCount++;
      dateFilter += ` AND s.sale_date <= $${paramCount}::date + interval '1 day' - interval '1 second'`;
      params.push(date_to);
    }
    
    // Add store filter if provided
    let storeFilter = '';
    if (store_id) {
      paramCount++;
      storeFilter = ` AND s.store_id = $${paramCount}`;
      params.push(store_id);
    }
    
    // Add pagination parameters
    paramCount++;
    params.push(parseInt(limit));
    paramCount++;
    params.push(parseInt(offset));
    
    // Get sales with items and payments for all stores
    const query = `
      SELECT 
        s.id as sale_id,
        s.store_id,
        s.sale_date,
        s.total_amount,
        s.total_discount,
        s.total_tax,
        s.grand_total,
        s.payment_status,
        s.payment_method,
        u.name as cashier_name,
        st.name as store_name,
        st.location as store_location,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'item_id', si.id,
                'product_id', si.product_id,
                'product_name', p.name,
                'sku', p.sku,
                'quantity', si.quantity,
                'selling_price', si.total_amount / si.quantity,
                'discount', si.discount,
                'total_amount', si.total_amount
              )
            )
            FROM pos_sale_items si
            JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = s.id
          ), 
          '[]'::json
        ) as items,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'payment_method', pp.payment_method,
                'amount_paid', pp.amount_paid,
                'payment_reference', pp.payment_reference,
                'created_at', pp.created_at
              )
            )
            FROM pos_payments pp
            WHERE pp.sale_id = s.id
          ), 
          '[]'::json
        ) as payments
      FROM pos_sales s
      JOIN users u ON s.user_id = u.id
      JOIN stores st ON s.store_id = st.id
      WHERE 1=1 ${dateFilter} ${storeFilter}
      ORDER BY s.sale_date DESC
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `;
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM pos_sales s
      WHERE 1=1 ${dateFilter} ${storeFilter}
    `;
    const countParams = params.slice(0, -2); // Remove limit and offset
    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].total);
    
    // Calculate summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(s.grand_total), 0) as total_sales,
        COALESCE(SUM(s.total_discount), 0) as total_discount,
        COALESCE(SUM(s.total_tax), 0) as total_tax,
        COALESCE(AVG(s.grand_total), 0) as average_order_value
      FROM pos_sales s
      WHERE 1=1 ${dateFilter} ${storeFilter}
    `;
    const summaryResult = await pool.query(summaryQuery, countParams);
    const summary = summaryResult.rows[0];
    
    // Get store-wise summary
    const storeSummaryQuery = `
      SELECT 
        st.id as store_id,
        st.name as store_name,
        st.location as store_location,
        COUNT(s.id) as transaction_count,
        COALESCE(SUM(s.grand_total), 0) as total_sales
      FROM stores st
      LEFT JOIN pos_sales s ON st.id = s.store_id AND 1=1 ${dateFilter.replace('s.', 's.')}
      GROUP BY st.id, st.name, st.location
      ORDER BY total_sales DESC
    `;
    const storeSummaryResult = await pool.query(storeSummaryQuery, countParams);
    
    res.status(200).json({ 
      sales: result.rows,
      summary: {
        total_transactions: parseInt(summary.total_transactions),
        total_sales: parseFloat(summary.total_sales),
        total_discount: parseFloat(summary.total_discount),
        total_tax: parseFloat(summary.total_tax),
        average_order_value: parseFloat(summary.average_order_value)
      },
      store_summary: storeSummaryResult.rows,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Error fetching admin sales report:', err);
    res.status(500).json({ message: 'Failed to fetch admin sales report', error: err.message });
  }
});

module.exports = router;
