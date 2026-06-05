require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const playlistRoutes = require('./routes/playlists');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev')); // Logs HTTP requests to the console

// Connect to MongoDB
console.log("URI CHECK: ", process.env.MONGODB_URI);
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'CapPace API is running correctly!' });
});
app.use('/api/auth', authRoutes);
app.use('/api/playlists', playlistRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
