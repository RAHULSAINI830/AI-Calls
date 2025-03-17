const express = require('express');
const router = express.Router();
const Conversation = require('../models/conversation'); // Ensure this file exists
const User = require('../models/user');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token missing' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// GET /api/conversations - retrieve conversations specific to the admin's model_id
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('admin model_id');
    if (!user || !user.admin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    // Retrieve conversations specific to the admin's model_id
    const conversations = await Conversation.find({ model_id: user.model_id });
    res.json(conversations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching conversations' });
  }
});

module.exports = router;
