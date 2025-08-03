const mongoose = require('mongoose');

const redirectLogSchema = new mongoose.Schema({
  uid: String,
  pid: String,
  projectName: String, // Add this line
  status: { type: String, enum: ['completed', 'terminate', 'quotafull'] },
  ip: String,
  userAgent: String,
  location: Object,
  fingerprint: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RedirectLog', redirectLogSchema);