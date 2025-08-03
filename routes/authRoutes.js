const express = require('express');
const router = express.Router();
const {
  login,
  changePassword,
  register,
} = require('../controllers/authController');

router.post('/register', register);        
router.post('/login', login);
router.post('/change-password', changePassword);

module.exports = router;
