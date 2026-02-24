import { useEffect, useState } from 'react';
import { api, User } from '../../api';

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<User[]>('/auth/users')
      .then(setUsers)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-stone-500">Loading users...</div>;
  if (error) return <div className="text-center py-12 text-red-400">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-100">All Users</h1>
        <span className="text-stone-500 text-sm">{users.length} registered</span>
      </div>

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
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-stone-200">{u.username}</span>
                  {u.username === 'admin' && (
                    <span className="text-xs bg-torch-800 text-torch-300 px-1.5 py-0.5 rounded">
                      admin
                    </span>
                  )}
                </div>
                <span className="text-xs text-stone-500">
                  Joined {new Date(u.created_at).toLocaleDateString()}
                </span>
              </div>
              <span className="text-xs text-stone-600">ID #{u.id}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
