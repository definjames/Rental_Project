const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const auth = require('../middleware/auth');

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().lean();
    res.json(products);
  } catch (err) {
    console.error('get products', err);
    res.status(500).json({ error: 'server error' });
  }
});

// protected routes for admin
router.use(auth, (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'admin only' });
  next();
});

// POST /api/products
router.post('/', async (req, res) => {
  try {
    const prod = new Product(req.body);
    await prod.save();
    res.status(201).json(prod);
  } catch (err) {
    console.error('create product', err);
    res.status(500).json({ error: 'server error' });
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  try {
    const prod = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!prod) return res.status(404).json({ error: 'not found' });
    res.json(prod);
  } catch (err) {
    console.error('update product', err);
    res.status(500).json({ error: 'server error' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const prod = await Product.findByIdAndDelete(req.params.id);
    if (!prod) return res.status(404).json({ error: 'not found' });
    res.json({ message: 'deleted' });
  } catch (err) {
    console.error('delete product', err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;