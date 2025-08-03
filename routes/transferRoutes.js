const express = require('express');
const router = express.Router();

router.get('/success', (req, res) => {
  const { encrypt } = req.query;
  res.send(`✅ Survey completed! Encrypted ID: ${encrypt}`);
});

router.get('/terminate', (req, res) => {
  const { encrypt } = req.query;
  res.send(`❌ Survey terminated. Encrypted ID: ${encrypt}`);
});

router.get('/quotafull', (req, res) => {
  const { encrypt } = req.query;
  res.send(`🚫 Quota full. Encrypted ID: ${encrypt}`);
});

module.exports = router;
