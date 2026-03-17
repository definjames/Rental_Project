const mongoose = require('mongoose');

const rentalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  // `qty` is the remaining quantity still rented (decrements on partial returns).
  qty: { type: Number, required: true },
  // Original quantity at the time of renting (helps reporting/billing).
  originalQty: { type: Number, default: function () { return this.qty; } },
  rentedAt: { type: Date, default: Date.now },
  returnedAt: { type: Date } // Set when fully returned
}, { timestamps: true });

module.exports = mongoose.model('Rental', rentalSchema);
