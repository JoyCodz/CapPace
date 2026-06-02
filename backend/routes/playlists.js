const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');
const Playlist = require('../models/Playlist');
const Video = require('../models/Video');

// Helper to extract playlist ID from URL
function extractPlaylistId(url) {
  const match = url.match(/[?&]list=([^&]+)/);
  return match ? match[1] : url;
}

// Add a new playlist
router.post('/', auth, async (req, res) => {
  try {
    const { url, dailyGoal } = req.body;
    const playlistId = extractPlaylistId(url);
    if (!playlistId) return res.status(400).json({ message: 'Invalid YouTube URL or Playlist ID' });

    const apiKey = process.env.YOUTUBE_API_KEY;

    // Fetch playlist details
    const plRes = await axios.get('https://www.googleapis.com/youtube/v3/playlists', {
      params: { part: 'snippet', id: playlistId, key: apiKey }
    });

    if (!plRes.data.items || plRes.data.items.length === 0) {
      return res.status(404).json({ message: 'Playlist not found on YouTube' });
    }

    const plSnippet = plRes.data.items[0].snippet;

    // Fetch playlist items (videos)
    let videos = [];
    let nextPageToken = '';
    do {
      const itemsRes = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
        params: {
          part: 'snippet',
          playlistId: playlistId,
          maxResults: 50,
          pageToken: nextPageToken,
          key: apiKey
        }
      });
      videos = videos.concat(itemsRes.data.items);
      nextPageToken = itemsRes.data.nextPageToken;
    } while (nextPageToken);

    // Save Playlist
    const newPlaylist = new Playlist({
      userId: req.user,
      youtubePlaylistId: playlistId,
      title: plSnippet.title,
      thumbnail: plSnippet.thumbnails?.high?.url || plSnippet.thumbnails?.default?.url,
      totalVideos: videos.length,
      dailyGoal: dailyGoal || 2,
      startDate: new Date()
    });

    await newPlaylist.save();

    // Save Videos
    const videoDocs = videos.map((item, index) => ({
      playlistId: newPlaylist._id,
      youtubeVideoId: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      sequenceIndex: index
    }));

    await Video.insertMany(videoDocs);

    res.status(201).json(newPlaylist);
  } catch (error) {
    console.error('Error adding playlist:', error?.response?.data || error);
    res.status(500).json({ message: 'Server error adding playlist' });
  }
});

// Add a custom empty playlist
router.post('/custom', auth, async (req, res) => {
  try {
    const { title, dailyGoal } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const newPlaylist = new Playlist({
      userId: req.user,
      title,
      totalVideos: 0,
      dailyGoal: dailyGoal || 2,
      startDate: new Date(),
      playlistType: 'custom'
    });

    await newPlaylist.save();
    res.status(201).json(newPlaylist);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating custom playlist' });
  }
});

// Add a manual video/task to a playlist
router.post('/:id/videos', auth, async (req, res) => {
  try {
    const playlistId = req.params.id;
    const { title, url } = req.body;

    const playlist = await Playlist.findOne({ _id: playlistId, userId: req.user });
    if (!playlist) return res.status(404).json({ message: 'Playlist not found' });

    if (!title) return res.status(400).json({ message: 'Title is required' });

    const newVideo = new Video({
      playlistId,
      title,
      url,
      sequenceIndex: playlist.totalVideos
    });

    await newVideo.save();

    playlist.totalVideos += 1;
    await playlist.save();

    res.status(201).json(newVideo);
  } catch (error) {
    res.status(500).json({ message: 'Server error adding task' });
  }
});

// Sync YouTube Playlist
router.post('/:id/sync', auth, async (req, res) => {
  try {
    const playlistId = req.params.id;
    const playlist = await Playlist.findOne({ _id: playlistId, userId: req.user });
    if (!playlist) return res.status(404).json({ message: 'Playlist not found' });
    if (playlist.playlistType === 'custom') return res.status(400).json({ message: 'Cannot sync custom playlists' });

    const apiKey = process.env.YOUTUBE_API_KEY;
    
    // Fetch playlist items (videos)
    let videos = [];
    let nextPageToken = '';
    do {
      const itemsRes = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
        params: {
          part: 'snippet',
          playlistId: playlist.youtubePlaylistId,
          maxResults: 50,
          pageToken: nextPageToken,
          key: apiKey
        }
      });
      videos = videos.concat(itemsRes.data.items);
      nextPageToken = itemsRes.data.nextPageToken;
    } while (nextPageToken);

    // Get existing video IDs
    const existingVideos = await Video.find({ playlistId: playlist._id });
    const existingYoutubeIds = new Set(existingVideos.map(v => v.youtubeVideoId).filter(id => id));

    const newVideoDocs = [];
    let currentSequence = playlist.totalVideos;

    videos.forEach((item) => {
      const yId = item.snippet.resourceId.videoId;
      if (!existingYoutubeIds.has(yId)) {
        newVideoDocs.push({
          playlistId: playlist._id,
          youtubeVideoId: yId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
          sequenceIndex: currentSequence++
        });
        existingYoutubeIds.add(yId);
      }
    });

    if (newVideoDocs.length > 0) {
      await Video.insertMany(newVideoDocs);
      playlist.totalVideos += newVideoDocs.length;
      await playlist.save();
    }

    res.json({ message: 'Sync complete', added: newVideoDocs.length });
  } catch (error) {
    console.error('Error syncing playlist:', error?.response?.data || error);
    res.status(500).json({ message: 'Server error syncing playlist' });
  }
});

// Get all user playlists
router.get('/', auth, async (req, res) => {
  try {
    const playlists = await Playlist.find({ userId: req.user }).lean().sort({ createdAt: -1 });
    
    // Get watched counts
    for (let pl of playlists) {
      pl.watchedCount = await Video.countDocuments({ playlistId: pl._id, isWatched: true });
    }
    
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user activity for learning curve (last 7 days)
router.get('/activity', auth, async (req, res) => {
  try {
    const playlists = await Playlist.find({ userId: req.user }).select('_id dailyGoal startDate');
    const playlistIds = playlists.map(p => p._id);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const videos = await Video.find({
      playlistId: { $in: playlistIds },
      isWatched: true,
      watchedAt: { $gte: sevenDaysAgo }
    });

    const activityData = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      
      const endOfDay = new Date(d);
      endOfDay.setHours(23, 59, 59, 999);

      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      let target = 0;
      playlists.forEach(pl => {
        if (new Date(pl.startDate) <= endOfDay) {
          target += pl.dailyGoal;
        }
      });

      let completed = 0;
      videos.forEach(v => {
        if (v.watchedAt) {
          const vDate = new Date(v.watchedAt);
          if (vDate >= d && vDate <= endOfDay) {
            completed++;
          }
        }
      });

      const ratio = target > 0 ? Math.round((completed / target) * 100) : (completed > 0 ? 100 : 0);

      activityData.push({
        date: dateStr,
        videos: completed,
        target,
        ratio
      });
    }

    res.json(activityData);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching activity' });
  }
});

// Get playlist by ID with videos
router.get('/:id', auth, async (req, res) => {
  try {
    const playlist = await Playlist.findOne({ _id: req.params.id, userId: req.user });
    if (!playlist) return res.status(404).json({ message: 'Playlist not found' });

    const videos = await Video.find({ playlistId: playlist._id }).sort({ sequenceIndex: 1 });
    res.json({ playlist, videos });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete playlist
router.delete('/:id', auth, async (req, res) => {
  try {
    const playlist = await Playlist.findOneAndDelete({ _id: req.params.id, userId: req.user });
    if (!playlist) return res.status(404).json({ message: 'Playlist not found' });

    await Video.deleteMany({ playlistId: playlist._id });
    res.json({ message: 'Playlist deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle video watch status
router.put('/video/:videoId/watch', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    // Ensure user owns this video's playlist
    const playlist = await Playlist.findOne({ _id: video.playlistId, userId: req.user });
    if (!playlist) return res.status(403).json({ message: 'Unauthorized' });

    video.isWatched = !video.isWatched;
    video.watchedAt = video.isWatched ? new Date() : null;
    await video.save();

    res.json(video);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
