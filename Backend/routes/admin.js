const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Rental = require('../models/Rental');
const Bill = require('../models/Bill');
const auth = require('../middleware/auth');

// Admin-only middleware
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Apply auth to all routes
router.use(auth);
router.use(adminOnly);

// GET all users (admin only)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').lean();
    res.json(users);
  } catch (err) {
    console.error('get users', err);
    res.status(500).json({ error: 'server error' });
  }
});

// DELETE user (admin only)
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'not found' });
    res.json({ message: 'deleted' });
  } catch (err) {
    console.error('delete user', err);
    res.status(500).json({ error: 'server error' });
  }
});

// GET all products (admin can see all)
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().lean();
    res.json(products);
  } catch (err) {
    console.error('get products', err);
    res.status(500).json({ error: 'server error' });
  }
});

// POST new product (admin only)
router.post('/products', async (req, res) => {
  try {
    const prod = new Product(req.body);
    await prod.save();
    res.status(201).json(prod);
  } catch (err) {
    console.error('create product', err);
    res.status(500).json({ error: 'server error' });
  }
});

// PUT update product (admin only)
router.put('/products/:id', async (req, res) => {
  try {
    const prod = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!prod) return res.status(404).json({ error: 'product not found' });
    res.json(prod);
  } catch (err) {
    console.error('update product', err);
    res.status(500).json({ error: 'server error' });
  }
});

// GET all active rentals (admin only) - optionally include completed
router.get('/rentals', async (req, res) => {
  try {
    let query = {};
    const includeCompleted = req.query.includeCompleted === 'true';
    
    if (!includeCompleted) {
      query.returnedAt = null;
    }

    const rentals = await Rental.find(query)
      .populate('user', 'name email')
      .populate('product', 'name cat price')
      .sort({ rentedAt: -1 })
      .lean();
    res.json(rentals);
  } catch (err) {
    console.error('get rentals', err);
    res.status(500).json({ error: 'server error' });
  }
});

// POST create rental (decrements product stock and logs rental)
router.post('/rentals', async (req, res) => {
  const { userId, productId, qty } = req.body;
  if (!userId || !productId || !qty) return res.status(400).json({ error: 'missing fields' });
  try {
    const user = await User.findById(userId);
    const product = await Product.findById(productId);
    if (!user || !product) return res.status(404).json({ error: 'user or product not found' });
    if (product.qty < qty) return res.status(400).json({ error: 'insufficient stock' });

    // decrement stock
    product.qty -= qty;
    await product.save();

    const rental = new Rental({ user: userId, product: productId, qty, originalQty: qty });
    await rental.save();

    res.status(201).json(rental);
  } catch (err) {
    console.error('create rental', err);
    res.status(500).json({ error: 'server error' });
  }
});

// GET all bills
router.get('/bills', async (req, res) => {
  try {
    const bills = await Bill.find()
      .populate('user', 'name email')
      .populate('product', 'name cat')
      .sort({ generatedAt: -1 })
      .lean();
    res.json(bills);
  } catch (err) {
    console.error('get bills', err);
    res.status(500).json({ error: 'server error' });
  }
});

// POST process return (increase stock and log return)
router.post('/returns/:id', async (req, res) => {
  const { returnQty, returnDate, generateBill } = req.body;
  if (!returnQty || returnQty <= 0) return res.status(400).json({ error: 'missing or invalid returnQty' });

  const actualReturnDate = returnDate ? new Date(returnDate) : new Date();

  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) return res.status(404).json({ error: 'rental not found' });
    if (returnQty > rental.qty) return res.status(400).json({ error: 'return qty exceeds rented qty' });

    // increase stock
    const product = await Product.findByIdAndUpdate(
      rental.product,
      { $inc: { qty: returnQty } },
      { new: true }
    );

    if (!product) return res.status(404).json({ error: 'product not found' });

    // Update rental qty
    rental.qty -= returnQty;

    let bill = null;
    const fullyReturned = rental.qty === 0;
    if (fullyReturned) {
      rental.returnedAt = actualReturnDate;
    }

    // bill
    {
      // calculate days rented 
      let daysRented = Math.ceil((actualReturnDate - rental.rentedAt) / (1000 * 60 * 60 * 24));
      if (daysRented < 1) daysRented = 1;

      const dailyRate = product.price || 0;
      const subtotal = daysRented * dailyRate * returnQty;
      const gstAmount = subtotal * 0.18; // 18% GST
      const totalAmount = subtotal + gstAmount;

      // Generate unique bill number
      const billNumber = 'BILL-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

      bill = new Bill({
        billNumber,
        rental: rental._id,
        user: rental.user,
        product: rental.product,
        qty: returnQty,
        daysRented,
        dailyRate,
        subtotal,
        gstAmount,
        totalAmount,
        rentedAt: rental.rentedAt,
        returnedAt: actualReturnDate
      });
      await bill.save();
    }

    await rental.save();

    res.json({
      message: fullyReturned
        ? 'full return processed and bill generated'
        : (!!generateBill ? 'partial return processed and bill generated' : 'partial return processed successfully'),
      bill: (fullyReturned || !!generateBill) ? {
        id: bill._id,
        billNumber: bill.billNumber,
        daysRented: bill.daysRented,
        subtotal: bill.subtotal,
        gstAmount: bill.gstAmount,
        totalAmount: bill.totalAmount
      } : null,
      storedBillId: (!fullyReturned && !generateBill) ? bill._id : null,
      remainingQty: rental.qty
    });
  } catch (err) {
    console.error('process return', err);
    res.status(500).json({ error: 'server error' });
  }
});


// DELETE product (admin only)
router.delete('/products/:id', async (req, res) => {
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
