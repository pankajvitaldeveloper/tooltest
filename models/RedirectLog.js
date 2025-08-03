const mongoose = require('mongoose');

const redirectLogSchema = new mongoose.Schema({
  uid: String,
  pid: String,
  status: { type: String, enum: ['completed', 'terminate', 'quotafull'] },
  ip: String,
  userAgent: String,
  location: Object,     // geoIP API response
  fingerprint: String,  // from client JS
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RedirectLog', redirectLogSchema);
