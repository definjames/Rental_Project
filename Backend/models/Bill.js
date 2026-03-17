const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  billNumber: { type: String, unique: true, required: true },
  rental: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  qty: { type: Number, required: true }, // quantity returned in this bill
  daysRented: { type: Number, required: true },
  dailyRate: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  gstRate: { type: Number, default: 0.18 }, // 18% GST
  gstAmount: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  rentedAt: { type: Date, required: true },
  returnedAt: { type: Date, required: true },
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Bill', billSchema);
