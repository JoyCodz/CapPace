const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  youtubePlaylistId: {
    type: String
  },
  playlistType: {
    type: String,
    enum: ['youtube', 'custom'],
    default: 'youtube'
  },
  title: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String
  },
  totalVideos: {
    type: Number,
    required: true
  },
  dailyGoal: {
    type: Number,
    required: true,
    default: 2
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Playlist', playlistSchema);
