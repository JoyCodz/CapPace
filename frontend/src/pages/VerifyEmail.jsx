import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';

export default function VerifyEmail({ setIsAuthenticated }) {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // If no email in state, they probably navigated here directly
  if (!email) {
    navigate('/register');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/verify-email', { email, code });
      localStorage.setItem('token', res.data.token);
      setIsAuthenticated(true);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setMessage('');
    try {
      const res = await api.post('/auth/resend-code', { email });
      setMessage(res.data.message || 'Code resent to your email');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-surface p-8 rounded-2xl shadow-xl border border-white/5">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Verify <span className="text-primary">Email</span></h1>
          <p className="text-gray-400">We sent a 6-digit code to <strong>{email}</strong>.</p>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-6 text-sm">{error}</div>}
        {message && <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-3 rounded-lg mb-6 text-sm">{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">6-Digit Code</label>
            <input
              type="text"
              maxLength={6}
              className="w-full text-center tracking-[0.5em] font-mono text-2xl bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-secondary text-white font-semibold py-2.5 rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify Account'}
          </button>
        </form>
        
        <p className="mt-6 text-center text-sm text-gray-400">
          Didn't receive a code? <button onClick={handleResend} className="text-white hover:text-secondary transition-colors underline">Resend Code</button>
        </p>
      </div>
    </div>
  );
}
