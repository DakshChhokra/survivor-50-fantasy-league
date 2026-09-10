import { useState, FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [mode, setMode] = useState<'in' | 'join'>('in');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === 'join' && password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const path = mode === 'join' ? '/auth/register' : '/auth/login';
      const res = await api.post<{ token: string; username: string; isAdmin: boolean }>(path, {
        username,
        password,
      });
      login(res.token, res.username, res.isAdmin);
      navigate('/', { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex justify-center pt-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-stone-100">
            {mode === 'in' ? 'Log in' : 'Join the league'}
          </h1>
          <p className="text-stone-400 text-sm mt-1">Same group of friends, new season or old.</p>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => { setMode('in'); setError(null); }}
            className={`flex-1 py-1.5 rounded-lg text-sm ${
              mode === 'in' ? 'bg-stone-800 text-stone-100' : 'text-stone-500'
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => { setMode('join'); setError(null); }}
            className={`flex-1 py-1.5 rounded-lg text-sm ${
              mode === 'join' ? 'bg-stone-800 text-stone-100' : 'text-stone-500'
            }`}
          >
            Join
          </button>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
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
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              minLength={mode === 'join' ? 2 : undefined}
              className="input-field"
            />
            <p className="text-xs text-stone-500 mt-1.5">
              Can't get in? Text Daksh — he'll reset your password.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === 'join' ? 4 : undefined}
              className="input-field"
            />
          </div>

          {mode === 'join' && (
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="input-field"
              />
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading
              ? mode === 'join'
                ? 'Creating account...'
                : 'Signing in...'
              : mode === 'join'
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-stone-500 mt-4">
          <Link to="/" className="text-torch-400 hover:text-torch-300">
            Back to the league
          </Link>
        </p>
      </div>
    </div>
  );
}
