const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// GET /api/users  (admin only)
router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'admin only' });
  try {
    const users = await User.find().select('-password').lean();
    res.json(users);
  } catch (err) {
    console.error('get users', err);
    res.status(500).json({ error: 'server error' });
  }
});

// DELETE /api/users/:id  (admin only)
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'admin only' });
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'not found' });
    res.json({ message: 'deleted' });
  } catch (err) {
    console.error('delete user', err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;