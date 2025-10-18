const express = require('express');
const router = express.Router();
const pool = require('./db');

// GET /categories → list all categories
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, category_no, name, description, created_at, updated_at
       FROM categories
       ORDER BY id ASC`
    );

    return res.status(200).json({ categories: result.rows });
  } catch (err) {
    console.error('Error fetching categories:', err);
    return res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

module.exports = router;
 
// POST /categories → create a new category
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (name == null || String(name).trim() === '') {
      return res.status(400).json({ message: 'name is required' });
    }

    // Generate next category_no (since DB column is NOT NULL without a default)
    const nextNoResult = await pool.query(
      `SELECT COALESCE(MAX(category_no), 0) + 1 AS next_no FROM categories`
    );
    const nextCategoryNo = nextNoResult.rows?.[0]?.next_no ?? 1;

    const insert = await pool.query(
      `INSERT INTO categories (category_no, name, description, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, category_no, name, description, created_at, updated_at`,
      [nextCategoryNo, name.trim(), description ?? null]
    );

    return res.status(201).json({ message: 'Category created', category: insert.rows[0] });
  } catch (err) {
    console.error('Error creating category:', err);
    return res.status(500).json({ message: 'Failed to create category' });
  }
});

// DELETE /categories/:id → delete a category by id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'id is required' });

    const del = await pool.query(
      `DELETE FROM categories WHERE id = $1 RETURNING id`,
      [id]
    );

    if (del.rowCount === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    return res.status(200).json({ message: 'Category deleted' });
  } catch (err) {
    console.error('Error deleting category:', err);
    return res.status(500).json({ message: 'Failed to delete category' });
  }
});


