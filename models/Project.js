const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: String,
  pid: { type: String, required: true },
  clientName: String,
  surveyLink: { type: String, required: true }, 
  description: String, 
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', projectSchema);
