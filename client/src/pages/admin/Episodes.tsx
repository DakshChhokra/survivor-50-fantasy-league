import { useEffect, useState, FormEvent } from 'react';
import { api, Episode } from '../../api';

export default function AdminEpisodes() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [epNum, setEpNum] = useState('');
  const [airDate, setAirDate] = useState('');
  const [numElim, setNumElim] = useState('1');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Episode>>({});

  async function load() {
    setLoading(true);
    const data = await api.get<Episode[]>('/episodes').finally(() => setLoading(false));
    setEpisodes(data);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/episodes', {
        episode_number: parseInt(epNum, 10),
        air_date: airDate || null,
        num_eliminations: parseInt(numElim, 10) || 1,
        deadline: deadline || null,
      });
      setEpNum('');
      setAirDate('');
      setNumElim('1');
      setDeadline('');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(id: number) {
    try {
      await api.patch(`/episodes/${id}`, editData);
      setEditId(null);
      setEditData({});
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function handleToggleLock(ep: Episode) {
    try {
      await api.patch(`/episodes/${ep.id}`, { is_locked: !ep.is_locked });
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function handleDelete(id: number, num: number) {
    if (!confirm(`Delete Episode ${num}? This will remove all associated predictions.`)) return;
    try {
      await api.delete(`/episodes/${id}`);
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-stone-100">Manage Episodes</h1>

      <div className="bg-stone-900 border border-stone-800 rounded-xl p-6">
        <h2 className="font-semibold text-stone-200 mb-4">Create Episode</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="bg-red-950/50 border border-red-800 text-red-300 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">Episode # *</label>
              <input
                type="number"
                value={epNum}
                onChange={(e) => setEpNum(e.target.value)}
                required
                min={1}
                className="w-full bg-stone-800 border border-stone-700 text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-torch-600"
                placeholder="1"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">Air Date</label>
              <input
                type="date"
                value={airDate}
                onChange={(e) => setAirDate(e.target.value)}
                className="w-full bg-stone-800 border border-stone-700 text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-torch-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                # Eliminations
              </label>
              <input
                type="number"
                value={numElim}
                onChange={(e) => setNumElim(e.target.value)}
                min={1}
                className="w-full bg-stone-800 border border-stone-700 text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-torch-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                Picks Deadline
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-stone-800 border border-stone-700 text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-torch-600"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving || !epNum}
            className="bg-torch-600 hover:bg-torch-500 disabled:bg-stone-700 disabled:text-stone-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? 'Creating...' : 'Create Episode'}
          </button>
        </form>
      </div>

      <div>
        <h2 className="font-semibold text-stone-200 mb-3">All Episodes</h2>
        {loading ? (
          <div className="text-stone-500 text-sm">Loading...</div>
        ) : episodes.length === 0 ? (
          <div className="text-stone-500 text-sm">No episodes yet.</div>
        ) : (
          <div className="space-y-3">
            {episodes.map((ep) => (
              <div
                key={ep.id}
                className="bg-stone-900 border border-stone-800 rounded-xl p-4"
              >
                {editId === ep.id ? (
                  <div className="space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-stone-400 mb-1">Air Date</label>
                        <input
                          type="date"
                          value={editData.air_date ?? ep.air_date ?? ''}
                          onChange={(e) =>
                            setEditData((d) => ({ ...d, air_date: e.target.value }))
                          }
                          className="w-full bg-stone-800 border border-stone-700 text-stone-100 rounded px-3 py-1.5 text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-400 mb-1">Deadline</label>
                        <input
                          type="datetime-local"
                          value={editData.deadline ?? ep.deadline ?? ''}
                          onChange={(e) =>
                            setEditData((d) => ({ ...d, deadline: e.target.value }))
                          }
                          className="w-full bg-stone-800 border border-stone-700 text-stone-100 rounded px-3 py-1.5 text-sm focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(ep.id)}
                        className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setEditId(null); setEditData({}); }}
                        className="text-stone-400 hover:text-stone-200 px-3 py-1.5 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-100">
                          Episode {ep.episode_number}
                        </span>
                        {ep.is_locked ? (
                          <span className="text-xs bg-stone-800 text-stone-400 px-2 py-0.5 rounded-full">
                            🔒 Locked
                          </span>
                        ) : (
                          <span className="text-xs bg-green-900/50 text-green-400 border border-green-800 px-2 py-0.5 rounded-full">
                            Open
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5 space-x-3">
                        {ep.air_date && <span>Airs: {ep.air_date}</span>}
                        {ep.deadline && (
                          <span>
                            Deadline: {new Date(ep.deadline).toLocaleString()}
                          </span>
                        )}
                        <span>{ep.num_eliminations} elimination(s)</span>
                        <span className="text-stone-600">
                          {(ep as Episode & { elimination_count?: number }).elimination_count ?? 0} marked
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleLock(ep)}
                        className="text-xs text-stone-400 hover:text-stone-200 bg-stone-800 hover:bg-stone-700 px-2.5 py-1 rounded transition-colors"
                      >
                        {ep.is_locked ? 'Unlock' : 'Lock'} Picks
                      </button>
                      <button
                        onClick={() => { setEditId(ep.id); setEditData({}); }}
                        className="text-xs text-torch-400 hover:text-torch-300 bg-stone-800 hover:bg-stone-700 px-2.5 py-1 rounded transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(ep.id, ep.episode_number)}
                        className="text-xs text-red-400 hover:text-red-300 bg-stone-800 hover:bg-stone-700 px-2.5 py-1 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
