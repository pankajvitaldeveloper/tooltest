const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  res.json({ token: generateToken(user) });
};

// Change Password
exports.changePassword = async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;
  const user = await User.findOne({ email });

  if (!user || !(await user.comparePassword(oldPassword))) {
    return res.status(400).json({ message: 'Old password is incorrect' });
  }

  user.password = newPassword;
  await user.save();

  res.json({ message: 'Password updated successfully' });
};

// Register new user
exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({ email, password });
    await user.save();

    res.status(201).json({
      message: 'User registered successfully',
      token: generateToken(user),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

