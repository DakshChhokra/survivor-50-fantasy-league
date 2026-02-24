import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ token: string; username: string; isAdmin: boolean }>(
        '/auth/register',
        { username, password }
      );
      login(res.token, res.username, res.isAdmin);
      navigate('/dashboard', { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex justify-center pt-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-5xl">🔥</span>
          <h1 className="text-2xl font-bold text-stone-100 mt-3">Join the League</h1>
          <p className="text-stone-400 text-sm mt-1">Create your account to play</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-stone-900 border border-stone-800 rounded-xl p-6 space-y-4">
          {error && (
            <div className="bg-red-950/50 border border-red-800 text-red-300 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              minLength={2}
              className="w-full bg-stone-800 border border-stone-700 text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-torch-600 transition-colors"
              placeholder="choose a username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={4}
              className="w-full bg-stone-800 border border-stone-700 text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-torch-600 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full bg-stone-800 border border-stone-700 text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-torch-600 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-torch-600 hover:bg-torch-500 disabled:bg-stone-700 disabled:text-stone-500 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-stone-500 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-torch-400 hover:text-torch-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
