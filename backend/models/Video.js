const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  playlistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Playlist',
    required: true
  },
  youtubeVideoId: {
    type: String
  },
  url: {
    type: String
  },
  title: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String
  },
  sequenceIndex: {
    type: Number,
    required: true
  },
  isWatched: {
    type: Boolean,
    default: false
  },
  watchedAt: {
    type: Date
  }
});

module.exports = mongoose.model('Video', videoSchema);
