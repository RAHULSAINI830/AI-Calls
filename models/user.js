// src/models/user.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  admin: { type: Boolean, default: false },
  model_id: { type: String, default: '' }, // New field
  isVerified: { type: Boolean, default: false },
  registrationOTP: { type: String },
  registrationOTPExpiry: { type: Date },
  resetOTP: { type: String },
  resetOTPExpiry: { type: Date },
});

module.exports = mongoose.model('User', UserSchema);
