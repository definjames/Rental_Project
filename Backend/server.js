require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const User = require('./models/User');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// connect to mongodb
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sparerental';
connectDB(mongoUri)
  .then(() => {
    console.log('MongoDB connected');
    // ensure we have an admin account
    return User.findOne({ role: 'admin' });
  })
  .then(async (admin) => {
    if (!admin) {
      console.log('No admin user found, creating default admin');
      const defaultAdmin = new User({
        userid: 'admin',
        name: 'Administrator',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin'
      });
      await defaultAdmin.save();
      console.log('Default admin created: admin@example.com / admin123');
    }

    // seed some products if none exist
    const Product = require('./models/Product');
    const count = await Product.countDocuments();
    if (count === 0) {
      console.log('Seeding sample products');
      const samples = [
        { name: 'Steel Jack', cat: 'Support', price: 50, qty: 12 },
        { name: 'Sheet', cat: 'Material', price: 25, qty: 30 },
        { name: 'Hammer Drill', cat: 'Power Tool', price: 200, qty: 6 },
        { name: 'Circular Saw', cat: 'Power Tool', price: 180, qty: 8 }
      ];
      await Product.insertMany(samples);
    }
  })
  .catch(err => {
    console.error('Mongo connection error', err);
  });

// routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/admin', require('./routes/admin'));

// If Frontend directory exists, serve it as static assets.
const path = require('path');
const frontendPath = path.join(__dirname, '..', 'Frontend');
app.use(express.static(frontendPath));
// fallback to index.html for SPA navigation
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not found' });
  res.sendFile(path.join(frontendPath, 'index.html'));
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
