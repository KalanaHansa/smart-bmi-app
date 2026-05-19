const mongoose = require('mongoose');

const BmiRecordSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  weight: { type: Number, required: true },
  height: { type: Number, required: true },
  bmi: { type: Number, required: true },
  status: { type: String, required: true },
  aiAdvice: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BmiRecord', BmiRecordSchema);