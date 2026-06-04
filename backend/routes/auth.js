const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const User = require('../models/User');
const PendingUser = require('../models/PendingUser');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if fully registered
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    // Check if already pending
    await PendingUser.deleteMany({ email });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verificationCode = generateCode();

    const pendingUser = new PendingUser({ 
      name, 
      email, 
      password: hashedPassword,
      verificationCode 
    });
    
    await pendingUser.save();

    // Send email
    await resend.emails.send({
      from: "noreply@cappace.me",
      to: email,
      subject: "Verify your CapPace account",
      html: `
        <div style="font-family:Arial;padding:20px">
          <h1>Hello ${name} 👋</h1>
          <p>Thank you for joining CapPace!</p>
          <div style="background:#f4f4f4;padding:15px;border-radius:10px;margin-top:20px;font-size:24px;letter-spacing:4px;font-weight:bold;text-align:center;">
            ${verificationCode}
          </div>
          <p style="margin-top:20px">This code expires in 1 hour.</p>
        </div>
      `,
    });

    res.status(201).json({ message: 'Verification email sent', email });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify Email (Signup)
router.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;
    const pendingUser = await PendingUser.findOne({ email, verificationCode: code });
    
    if (!pendingUser) return res.status(400).json({ message: 'Invalid or expired verification code' });

    // Move to User collection
    const user = new User({
      name: pendingUser.name,
      email: pendingUser.email,
      password: pendingUser.password,
    });
    await user.save();
    
    await PendingUser.deleteOne({ _id: pendingUser._id });

    const payload = { userId: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, userId: user._id, email: user.email, name: user.name });
  } catch (error) {
    console.error("Verify Error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Resend Verification Code
router.post('/resend-code', async (req, res) => {
  try {
    const { email } = req.body;
    const pendingUser = await PendingUser.findOne({ email });
    if (!pendingUser) return res.status(404).json({ message: 'No pending registration found for this email' });

    const newCode = generateCode();
    pendingUser.verificationCode = newCode;
    pendingUser.createdAt = Date.now(); // Reset TTL
    await pendingUser.save();

    await resend.emails.send({
      from: "noreply@cappace.me",
      to: email,
      subject: "Verify your CapPace account (Resend)",
      html: `
        <div style="font-family:Arial;padding:20px">
          <h1>Hello ${pendingUser.name} 👋</h1>
          <p>Here is your new verification code:</p>
          <div style="background:#f4f4f4;padding:15px;border-radius:10px;margin-top:20px;font-size:24px;letter-spacing:4px;font-weight:bold;text-align:center;">
            ${newCode}
          </div>
          <p style="margin-top:20px">This code expires in 1 hour.</p>
        </div>
      `,
    });

    res.json({ message: 'Code resent' });
  } catch (error) {
    console.error("Resend Code Error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || user.is_deleted) {
      const pending = await PendingUser.findOne({ email });
      if (pending) {
        return res.status(403).json({ message: 'Please verify your email first', isPending: true, email });
      }
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const payload = { userId: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, userId: user._id, email: user.email, name: user.name });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Current User Profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Profile (Name and/or Email)
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, newEmail } = req.body;
    const user = await User.findById(req.user);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;

    let emailVerificationSent = false;
    if (newEmail && newEmail !== user.email) {
      const existingUser = await User.findOne({ email: newEmail });
      if (existingUser) return res.status(400).json({ message: 'Email already in use' });

      const code = generateCode();
      user.newEmail = newEmail;
      user.newEmailVerificationCode = code;
      user.newEmailVerificationCodeExpiresAt = Date.now() + 3600000; // 1 hour

      await resend.emails.send({
        from: "noreply@cappace.me",
        to: newEmail,
        subject: "Verify your new CapPace email",
        html: `
          <div style="font-family:Arial;padding:20px">
            <h1>Hello ${user.name || ''} 👋</h1>
            <p>You requested to change your email address. Use the code below to verify it:</p>
            <div style="background:#f4f4f4;padding:15px;border-radius:10px;margin-top:20px;font-size:24px;letter-spacing:4px;font-weight:bold;text-align:center;">
              ${code}
            </div>
            <p style="margin-top:20px">This code expires in 1 hour.</p>
          </div>
        `,
      });
      emailVerificationSent = true;
    }

    await user.save();
    res.json({ 
      message: 'Profile updated', 
      user: { name: user.name, email: user.email },
      emailVerificationSent
    });
  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify New Email
router.post('/verify-new-email', auth, async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user);
    if (!user || !user.newEmail) return res.status(400).json({ message: 'No email change pending' });

    if (user.newEmailVerificationCode !== code || user.newEmailVerificationCodeExpiresAt < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    user.email = user.newEmail;
    user.newEmail = undefined;
    user.newEmailVerificationCode = undefined;
    user.newEmailVerificationCodeExpiresAt = undefined;
    await user.save();

    res.json({ message: 'Email updated successfully', email: user.email });
  } catch (error) {
    console.error("Verify New Email Error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change Password
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Incorrect current password' });

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error changing password' });
  }
});

// Delete Account (Soft Delete)
router.delete('/account', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.is_deleted = true;
    await user.save();

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting account' });
  }
});

module.exports = router;
