const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  cat: { type: String, default: 'General' },
  price: { type: Number, default: 0 },
  qty: { type: Number, default: 0 },
  img: String
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);