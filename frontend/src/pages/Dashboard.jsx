import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, Plus, PlayCircle, Activity, PieChart as PieChartIcon, Settings, X, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import api from '../api';
import { ErrorBoundary } from '../components/ErrorBoundary';
import Footer from '../components/Footer';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#1A1A1F] border border-[#333] rounded-xl p-3 text-white shadow-lg">
        <p className="text-[#888] mb-1 text-sm">{label}</p>
        <p className="text-primary font-bold text-lg mb-1">{data.ratio}% Target Met</p>
        <p className="text-sm text-gray-400">Completed: {data.videos} / {data.target}</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [playlists, setPlaylists] = useState([]);
  const [addMode, setAddMode] = useState('youtube'); // 'youtube' or 'custom'
  
  // YouTube Form State
  const [newUrl, setNewUrl] = useState('');
  
  // Custom Form State
  const [customTitle, setCustomTitle] = useState('');

  // Profile State
  const [userProfile, setUserProfile] = useState({ name: '', email: '' });
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [showEmailCodeInput, setShowEmailCodeInput] = useState(false);
  const [emailCode, setEmailCode] = useState('');

  // Password Change & Account State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  const [changingPwd, setChangingPwd] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Activity State
  const [activityData, setActivityData] = useState([]);

  // Shared State
  const [dailyGoal, setDailyGoal] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
    fetchPlaylists();
    fetchActivity();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUserProfile(res.data);
      setProfileName(res.data.name || '');
      setProfileEmail(res.data.email || '');
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPlaylists = async () => {
    try {
      const res = await api.get('/playlists');
      setPlaylists(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  };

  const fetchActivity = async () => {
    try {
      const res = await api.get('/playlists/activity');
      setActivityData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPlaylist = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (addMode === 'youtube') {
        await api.post('/playlists', { url: newUrl, dailyGoal });
        setNewUrl('');
      } else {
        await api.post('/playlists/custom', { title: customTitle, dailyGoal });
        setCustomTitle('');
      }
      setDailyGoal(2);
      fetchPlaylists();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add playlist');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    setProfileMsg({ type: '', text: '' });
    try {
      const res = await api.put('/auth/profile', { 
        name: profileName, 
        newEmail: profileEmail !== userProfile.email ? profileEmail : undefined 
      });
      setUserProfile({ ...userProfile, name: profileName });
      
      if (res.data.emailVerificationSent) {
        setProfileMsg({ type: 'success', text: 'Verification code sent to your new email.' });
        setShowEmailCodeInput(true);
      } else {
        setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
      }
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update profile' });
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleVerifyNewEmail = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    setProfileMsg({ type: '', text: '' });
    try {
      const res = await api.post('/auth/verify-new-email', { code: emailCode });
      setUserProfile({ ...userProfile, email: res.data.email });
      setProfileEmail(res.data.email);
      setShowEmailCodeInput(false);
      setEmailCode('');
      setProfileMsg({ type: 'success', text: 'Email updated successfully!' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Failed to verify email' });
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangingPwd(true);
    setPasswordMsg({ type: '', text: '' });
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setShowPasswordModal(false), 2000);
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update password' });
    } finally {
      setChangingPwd(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you ABSOLUTELY sure? This will delete your account and all associated data permanently.')) return;
    setIsDeletingAccount(true);
    try {
      await api.delete('/auth/account');
      localStorage.removeItem('token');
      navigate('/register');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete account');
      setIsDeletingAccount(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-white p-6 md:p-12 relative">
      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface border border-white/10 p-6 rounded-2xl w-full max-w-sm relative shadow-2xl">
            <button 
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Settings className="mr-2 text-primary" size={20} /> Account Settings
            </h2>

            <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">

            {/* Profile Settings */}
            {profileMsg.text && (
              <div className={`p-3 rounded-lg mb-4 text-sm ${profileMsg.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {profileMsg.text}
              </div>
            )}

            {!showEmailCodeInput ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4 mb-6">
                <h3 className="text-sm font-semibold text-white/80 border-b border-white/10 pb-2">Profile Details</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                  <input
                    type="text"
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-secondary transition-colors text-sm"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-secondary transition-colors text-sm"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="w-full bg-secondary text-white font-semibold py-2 rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50 mt-2"
                >
                  {updatingProfile ? 'Updating...' : 'Update Profile'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyNewEmail} className="space-y-4 mb-6">
                <h3 className="text-sm font-semibold text-white/80 border-b border-white/10 pb-2">Verify New Email</h3>
                <p className="text-sm text-gray-400 mb-2">Enter the 6-digit code sent to {profileEmail}.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Verification Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    className="w-full text-center tracking-[0.5em] font-mono text-xl bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-secondary transition-colors"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/[^0-9]/g, ''))}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={updatingProfile || emailCode.length !== 6}
                  className="w-full bg-secondary text-white font-semibold py-2 rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50 mt-2"
                >
                  {updatingProfile ? 'Verifying...' : 'Verify & Change Email'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmailCodeInput(false)}
                  className="w-full text-sm text-gray-400 hover:text-white transition-colors mt-2"
                >
                  Cancel Email Change
                </button>
              </form>
            )}
            
            {passwordMsg.text && (
              <div className={`p-3 rounded-lg mb-4 text-sm ${passwordMsg.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-white/80 border-b border-white/10 pb-2">Change Password</h3>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Current Password</label>
                <input
                  type="password"
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-secondary transition-colors text-sm"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">New Password</label>
                <input
                  type="password"
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-secondary transition-colors text-sm"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={changingPwd}
                className="w-full bg-white text-black font-semibold py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 mt-2"
              >
                {changingPwd ? 'Updating...' : 'Update Password'}
              </button>
            </form>

            <div className="pt-4 border-t border-white/10">
               <h3 className="text-sm font-semibold text-red-400 mb-3">Danger Zone</h3>
               <button
                 onClick={handleDeleteAccount}
                 disabled={isDeletingAccount}
                 className="w-full bg-red-500/10 text-red-500 font-semibold py-2 rounded-lg hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
               >
                 {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
               </button>
            </div>
            </div>
          </div>
        </div>
      )}

      <header className="flex justify-between items-center mb-12">
        <h1 className="text-2xl font-bold">Cap<span className="text-primary">Pace</span></h1>
        <div className="flex items-center gap-6">
          <button onClick={() => setShowSettingsModal(true)} className="flex items-center text-gray-400 hover:text-white transition-colors">
            <Settings size={18} className="mr-2" />
            Account
          </button>
          <button onClick={handleLogout} className="flex items-center text-gray-400 hover:text-red-400 transition-colors">
            <LogOut size={18} className="mr-2" />
            Logout
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center">
                <PlayCircle className="mr-2 text-secondary" /> Your Playlists
              </h2>
            </div>
            
            {playlists.length === 0 ? (
              <div className="bg-surface border border-white/5 p-8 rounded-2xl text-center text-gray-400">
                You haven't added any playlists yet. Add one to get started!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {playlists.map((pl) => (
                  <Link key={pl._id} to={`/playlist/${pl._id}`} className="block">
                    <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden hover:border-secondary/50 transition-colors group">
                      <div className="h-40 bg-gray-900 relative">
                        {pl.thumbnail && <img src={pl.thumbnail} alt={pl.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
                      </div>
                      <div className="p-5">
                        <h3 className="font-semibold text-lg line-clamp-1 mb-1">{pl.title}</h3>
                        <div className="flex justify-between text-sm text-gray-400 mb-2">
                          <span>{pl.totalVideos} videos</span>
                          <span>Goal: {pl.dailyGoal}/day</span>
                        </div>
                        <div className="w-full bg-black/50 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-secondary h-1.5 rounded-full"
                            style={{ width: `${Math.round((pl.watchedCount / pl.totalVideos) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xl font-semibold flex items-center mb-6">
              <TrendingUp className="mr-2 text-primary" /> Learning Curve
            </h2>
            <div className="bg-surface border border-white/5 p-6 rounded-2xl mb-8">
              {activityData.length === 0 || activityData.every(d => d.videos === 0) ? (
                <p className="text-gray-400 text-sm italic text-center py-8">Complete tasks to see your learning curve.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activityData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="date" stroke="#888" tick={{fill: '#888', fontSize: 12}} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888" tick={{fill: '#888', fontSize: 12}} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={(val) => `${val}%`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="ratio" name="Target Met" stroke="#6366F1" strokeWidth={3} dot={{ r: 4, fill: '#1A1A1F', stroke: '#6366F1', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#6366F1' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <h2 className="text-xl font-semibold flex items-center mb-6">
              <PieChartIcon className="mr-2 text-secondary" /> Overall Progress
            </h2>
            <div className="bg-surface border border-white/5 p-6 rounded-2xl">
              {playlists.length === 0 ? (
                <p className="text-gray-400 text-sm italic text-center py-8">Add a playlist to see your stats.</p>
              ) : (
                <div className="h-64 relative">
                  <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                    <span className="text-3xl font-bold text-white">
                      {Math.round((playlists.reduce((acc, pl) => acc + (pl.watchedCount || 0), 0) / Math.max(1, playlists.reduce((acc, pl) => acc + pl.totalVideos, 0))) * 100)}%
                    </span>
                    <span className="text-xs text-gray-500 uppercase tracking-widest mt-1">Completed</span>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Completed', value: playlists.reduce((acc, pl) => acc + (pl.watchedCount || 0), 0), fill: '#6366F1' },
                          { name: 'Remaining', value: Math.max(0, playlists.reduce((acc, pl) => acc + (pl.totalVideos - (pl.watchedCount || 0)), 0)), fill: '#333340' }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={8}
                      >
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1A1A1F', border: '1px solid #333', borderRadius: '12px', color: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)' }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <div className="bg-surface border border-white/5 p-6 rounded-2xl sticky top-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center">
              <Plus className="mr-2 text-secondary" size={20} /> Add New Tracker
            </h3>
            
            <div className="flex bg-black/50 p-1 rounded-lg mb-4">
              <button
                onClick={() => setAddMode('youtube')}
                className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${addMode === 'youtube' ? 'bg-secondary text-white' : 'text-gray-400 hover:text-white'}`}
              >
                YouTube
              </button>
              <button
                onClick={() => setAddMode('custom')}
                className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${addMode === 'custom' ? 'bg-secondary text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Custom
              </button>
            </div>

            {error && <div className="bg-red-500/10 text-red-500 p-3 rounded-lg mb-4 text-sm">{error}</div>}
            
            <form onSubmit={handleAddPlaylist} className="space-y-4">
              {addMode === 'youtube' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">YouTube URL</label>
                  <input
                    type="text"
                    placeholder="https://youtube.com/playlist?list=..."
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-secondary transition-colors text-sm"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Tracker Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Reading List, Course Modules..."
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-secondary transition-colors text-sm"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    required
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Daily Goal</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-secondary transition-colors text-sm"
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(parseInt(e.target.value) || 1)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-secondary text-white font-semibold py-2.5 rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating...' : (addMode === 'youtube' ? 'Import Playlist' : 'Create Tracker')}
              </button>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
    </ErrorBoundary>
  );
}
