const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false // Optional to support legacy unverified users temporarily
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
  newEmail: {
    type: String
  },
  newEmailVerificationCode: {
    type: String
  },
  newEmailVerificationCodeExpiresAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  is_deleted: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('User', userSchema);
