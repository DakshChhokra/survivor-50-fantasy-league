import { useEffect, useState } from 'react';
import { api, User } from '../../api';

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetId, setResetId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  useEffect(() => {
    api
      .get<User[]>('/auth/users')
      .then(setUsers)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  async function handleReset(id: number) {
    if (resetPassword.length < 4) {
      alert('Password must be at least 4 characters');
      return;
    }
    try {
      await api.patch(`/auth/users/${id}/password`, { password: resetPassword });
      setResetId(null);
      setResetPassword('');
      alert('Password updated');
    } catch (e) {
      alert((e as Error).message);
    }
  }

  if (loading) return <div className="text-center py-12 text-stone-500">Loading users...</div>;
  if (error) return <div className="text-center py-12 text-red-400">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-stone-100">Users</h2>
        <span className="text-stone-500 text-sm">{users.length} registered</span>
      </div>
      <p className="text-xs text-stone-500">
        Forgot a password? Set a new one here and tell them.
      </p>

      {users.length === 0 ? (
        <p className="text-stone-500">No users yet.</p>
      ) : (
        <div className="space-y-2">
          {users.map((u, idx) => (
            <div
              key={u.id}
              className="flex items-center gap-3 bg-stone-900 border border-stone-800 rounded-lg px-4 py-3"
            >
              <div className="w-8 text-center text-stone-600 font-mono text-sm">{idx + 1}</div>
              <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center text-stone-400 font-semibold text-sm">
                {u.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-stone-200">{u.username}</span>
                  {u.is_admin && (
                    <span className="text-xs bg-torch-800 text-torch-300 px-1.5 py-0.5 rounded">
                      admin
                    </span>
                  )}
                </div>
                <span className="text-xs text-stone-500">
                  Joined {new Date(u.created_at).toLocaleDateString()}
                </span>
              </div>
              {resetId === u.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="input-field w-36"
                    placeholder="new password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleReset(u.id)}
                    className="text-sm text-emerald-400"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => { setResetId(null); setResetPassword(''); }}
                    className="text-sm text-stone-500"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setResetId(u.id); setResetPassword(''); }}
                  className="text-xs text-stone-400 hover:text-stone-200"
                >
                  Set password
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
