import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, Trash2, Calendar, ExternalLink, Plus, RefreshCw } from 'lucide-react';
import api from '../api';
import Footer from '../components/Footer';

export default function PlaylistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Custom Task State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskUrl, setNewTaskUrl] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetchPlaylistData();
  }, [id]);

  const fetchPlaylistData = async () => {
    try {
      const res = await api.get(`/playlists/${id}`);
      setPlaylist(res.data.playlist);
      setVideos(res.data.videos);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 404) navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const toggleWatch = async (videoId) => {
    // Optimistic UI update
    setVideos(videos.map(v => {
      if (v._id === videoId) {
        const newlyWatched = !v.isWatched;
        return { 
          ...v, 
          isWatched: newlyWatched,
          watchedAt: newlyWatched ? new Date().toISOString() : null
        };
      }
      return v;
    }));
    try {
      await api.put(`/playlists/video/${videoId}/watch`);
    } catch (err) {
      // Revert on fail
      fetchPlaylistData();
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this playlist?')) return;
    try {
      await api.delete(`/playlists/${id}`);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setIsAddingTask(true);
    try {
      const res = await api.post(`/playlists/${id}/videos`, { title: newTaskTitle, url: newTaskUrl });
      setVideos([...videos, res.data]);
      setPlaylist({ ...playlist, totalVideos: playlist.totalVideos + 1 });
      setNewTaskTitle('');
      setNewTaskUrl('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await api.post(`/playlists/${id}/sync`);
      fetchPlaylistData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to sync playlist');
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-white">Loading...</div>;
  }

  if (!playlist) return null;

  const watchedCount = videos.filter(v => v.isWatched).length;
  const progressPercent = Math.round((watchedCount / playlist.totalVideos) * 100);
  
  // Calculate Today's Queue
  // 1. Get videos watched today
  const isToday = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };
  
  const videosWatchedToday = videos.filter(v => v.isWatched && isToday(v.watchedAt));
  const remainingGoalForToday = Math.max(0, playlist.dailyGoal - videosWatchedToday.length);
  const unwatchedVideos = videos.filter(v => !v.isWatched);
  
  const todaysQueue = [...videosWatchedToday, ...unwatchedVideos.slice(0, remainingGoalForToday)].sort((a, b) => a.sequenceIndex - b.sequenceIndex);

  // Recently watched
  const watchedVideos = videos.filter(v => v.isWatched).sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt));

  const getLink = (video) => {
    if (video.youtubeVideoId) {
      return `https://www.youtube.com/watch?v=${video.youtubeVideoId}&list=${playlist.youtubePlaylistId || ''}`;
    }
    return video.url || null;
  };

  return (
    <div className="min-h-screen bg-background text-white p-6 md:p-12">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <Link to="/dashboard" className="text-gray-400 hover:text-white flex items-center mb-4 transition-colors">
            <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2">{playlist.title}</h1>
          <p className="text-gray-400 flex items-center">
            <Calendar size={16} className="mr-2" /> Goal: {playlist.dailyGoal} videos/day
          </p>
        </div>
        <div className="flex gap-2">
          {playlist.playlistType !== 'custom' && (
            <button 
              onClick={handleSync} 
              disabled={isSyncing}
              className="p-2 text-gray-400 hover:text-white transition-colors bg-surface border border-white/5 rounded-lg disabled:opacity-50"
              title="Sync with YouTube"
            >
              <RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} />
            </button>
          )}
          <button onClick={handleDelete} className="p-2 text-gray-500 hover:text-primary transition-colors bg-surface border border-white/5 rounded-lg" title="Delete Playlist">
            <Trash2 size={20} />
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-surface border border-white/5 p-6 rounded-2xl mb-8">
        <div className="flex justify-between items-end mb-2">
          <span className="text-sm font-medium text-gray-300">Overall Progress</span>
          <span className="text-2xl font-bold text-white">{progressPercent}%</span>
        </div>
        <div className="w-full bg-black/50 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-secondary h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-gray-500 text-right">
          {watchedCount} / {playlist.totalVideos} videos completed
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-semibold mb-4">Today's Queue</h2>
          {todaysQueue.length === 0 ? (
            <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-6 rounded-xl text-center">
              🎉 All caught up! You've finished this playlist.
            </div>
          ) : (
            <div className="space-y-3">
              {todaysQueue.map((video) => (
                <div key={video._id} className="bg-surface border border-white/5 p-4 rounded-xl flex items-center gap-4 hover:border-secondary/30 transition-colors group">
                  <button 
                    onClick={() => toggleWatch(video._id)}
                    className={`${video.isWatched ? 'text-secondary' : 'text-gray-500 group-hover:text-secondary'} transition-colors`}
                  >
                    {video.isWatched ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                  </button>
                  {video.thumbnail && (
                    <img src={video.thumbnail} alt="" className={`w-24 h-16 object-cover rounded-md bg-gray-900 ${video.isWatched ? 'opacity-50' : ''}`} />
                  )}
                  <div className={`flex-1 min-w-0 ${video.isWatched ? 'opacity-50 line-through' : ''}`}>
                    <h3 className="font-medium truncate">{video.title}</h3>
                  </div>
                  {getLink(video) && (
                    <a 
                      href={getLink(video)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-500 hover:text-white transition-colors ml-auto"
                      title="Open Link"
                    >
                      <ExternalLink size={20} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {unwatchedVideos.length > todaysQueue.length && (
            <div className="pt-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-400">Up Next</h2>
              <div className="space-y-3 opacity-60">
                {unwatchedVideos.slice(playlist.dailyGoal, playlist.dailyGoal + 3).map((video) => (
                  <div key={video._id} className="bg-surface border border-white/5 p-3 rounded-xl flex items-center gap-4">
                    <div className="w-24 h-16 bg-black/50 rounded-md shrink-0">
                      {video.thumbnail && <img src={video.thumbnail} className="w-full h-full object-cover rounded-md" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium truncate">{video.title}</h3>
                    </div>
                    {getLink(video) && (
                      <a 
                        href={getLink(video)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-500 hover:text-white transition-colors ml-auto"
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Task Form for Custom Playlists */}
          <div className="pt-8">
            <h2 className="text-lg font-semibold mb-4 text-gray-400">Add New Task</h2>
            <form onSubmit={handleAddTask} className="bg-surface border border-white/5 p-4 rounded-xl flex flex-col md:flex-row gap-3">
              <input
                type="text"
                placeholder="Task title..."
                className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-secondary transition-colors text-sm"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                required
              />
              <input
                type="url"
                placeholder="URL (optional)"
                className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-secondary transition-colors text-sm"
                value={newTaskUrl}
                onChange={(e) => setNewTaskUrl(e.target.value)}
              />
              <button
                type="submit"
                disabled={isAddingTask || !newTaskTitle.trim()}
                className="bg-secondary text-white font-medium px-6 py-2 rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50 whitespace-nowrap flex items-center justify-center"
              >
                <Plus size={18} className="mr-2" /> Add
              </button>
            </form>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Recently Watched</h2>
          <div className="bg-surface border border-white/5 rounded-2xl p-4 space-y-4 h-[600px] overflow-y-auto">
            {watchedVideos.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No videos watched yet.</p>
            ) : (
              watchedVideos.slice(0, 20).map((video) => (
                <div key={video._id} className="flex items-start gap-3">
                  <button 
                    onClick={() => toggleWatch(video._id)}
                    className="text-primary mt-1 shrink-0 hover:text-primary/80 transition-colors"
                  >
                    <CheckCircle2 size={18} />
                  </button>
                  <div>
                    <p className="text-sm font-medium line-clamp-2 leading-tight mb-1">{video.title}</p>
                    {video.watchedAt && (
                      <p className="text-xs text-gray-500">
                        {new Date(video.watchedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
