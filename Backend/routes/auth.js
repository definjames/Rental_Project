const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function setAuthCookie(res, token) {
  const eightHoursMs = 8 * 60 * 60 * 1000;
  const secure = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: secure ? 'none' : 'lax',
    secure,
    maxAge: eightHoursMs
  });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, userid, password, name } = req.body;
    if (!email || !password || !name || !userid) {
      return res.status(400).json({ error: 'email, userid, name and password are required' });
    }
    // check existing email or userid
    let existing = await User.findOne({ $or: [{ email }, { userid }] });
    if (existing) return res.status(400).json({ error: 'user already exists' });

    const userData = { ...req.body, firstLogin: true };
    const user = new User(userData);
    // default role is user
    await user.save();
    return res.json({ user: user.toJSON() });
  } catch (err) {
    console.error('register error', err);
    res.status(500).json({ error: 'server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'invalid credentials' });
    const match = await user.comparePassword(password);
    if (!match) return res.status(400).json({ error: 'invalid credentials' });

    const payload = { id: user._id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' });

    setAuthCookie(res, token);
    res.json({ token, user: user.toJSON() });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ error: 'server error' });
  }
});

// GET /api/auth/me  (requires valid token)
router.get('/me', require('../middleware/auth'), async (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const secure = process.env.NODE_ENV === 'production';
  res.clearCookie('token', { sameSite: secure ? 'none' : 'lax', secure });
  res.json({ message: 'logged out' });
});

// POST /api/auth/change-password (requires valid token)
router.post('/change-password', require('../middleware/auth'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'user not found' });
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ error: 'newPassword required' });
    user.password = newPassword;
    user.firstLogin = false;
    await user.save();
    res.json({ message: 'password changed' });
  } catch (err) {
    console.error('change-password error', err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
