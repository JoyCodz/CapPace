const mongoose = require('mongoose');

const pendingUserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  verificationCode: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600 // Automatically delete document after 1 hour (3600 seconds)
  }
});

module.exports = mongoose.model('PendingUser', pendingUserSchema);
