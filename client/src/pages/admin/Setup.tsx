import { useEffect, useState, FormEvent } from 'react';
import { api, Contestant } from '../../api';

export default function AdminSetup({ seasonId }: { seasonId: number }) {
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [order, setOrder] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);

  async function load() {
    setLoading(true);
    const data = await api
      .get<Contestant[]>(`/contestants?season_id=${seasonId}`)
      .finally(() => setLoading(false));
    setContestants(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonId]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('season_id', String(seasonId));
      if (order) formData.append('display_order', order);
      if (file) formData.append('headshot', file);

      await api.postForm<Contestant>('/contestants', formData);
      setName('');
      setOrder('');
      setFile(null);
      setPreview(null);
      setSuccess(`${name.trim()} added!`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number, cname: string) {
    if (!confirm(`Remove ${cname}? This cannot be undone.`)) return;
    try {
      await api.delete(`/contestants/${id}`);
      setContestants((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function handleSaveEdit(id: number) {
    try {
      const formData = new FormData();
      formData.append('name', editName.trim());
      if (editFile) formData.append('headshot', editFile);
      await api.patchForm<Contestant>(`/contestants/${id}`, formData);
      setEditId(null);
      setEditFile(null);
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold text-stone-100">Contestants</h2>

      <div className="bg-stone-900 border border-stone-800 rounded-xl p-6">
        <h2 className="font-semibold text-stone-200 mb-4">Add Contestant</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          {error && (
            <div className="bg-red-950/50 border border-red-800 text-red-300 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-sm px-3 py-2 rounded-lg">
              {success}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-stone-800 border border-stone-700 text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-torch-600"
                placeholder="Contestant name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">
                Display Order
              </label>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                className="w-full bg-stone-800 border border-stone-700 text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-torch-600"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">
              Headshot Photo
            </label>
            <div className="flex items-center gap-4">
              {preview && (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-16 h-16 rounded-full object-cover border-2 border-stone-600"
                />
              )}
              <label className="cursor-pointer bg-stone-800 hover:bg-stone-700 border border-stone-700 border-dashed rounded-lg px-4 py-3 text-sm text-stone-400 transition-colors">
                {file ? file.name : 'Click to upload image'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="bg-torch-600 hover:bg-torch-500 disabled:bg-stone-700 disabled:text-stone-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? 'Adding...' : 'Add Contestant'}
          </button>
        </form>
      </div>

      <div>
        <h2 className="font-semibold text-stone-200 mb-3">
          All Contestants ({contestants.length})
        </h2>
        {loading ? (
          <div className="text-stone-500 text-sm">Loading...</div>
        ) : contestants.length === 0 ? (
          <div className="text-stone-500 text-sm">No contestants yet.</div>
        ) : (
          <div className="space-y-2">
            {contestants.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 bg-stone-900 border border-stone-800 rounded-lg px-4 py-3"
              >
                {c.headshot_url ? (
                  <img
                    src={c.headshot_url}
                    alt={c.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-stone-700 flex items-center justify-center text-stone-400 text-xs">
                    ?
                  </div>
                )}
                {editId === c.id ? (
                  <div className="flex-1 flex flex-wrap items-center gap-2">
                    <input
                      className="input-field max-w-xs"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <label className="text-xs text-stone-400 cursor-pointer">
                      {editFile ? editFile.name : 'Replace photo'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(c.id)}
                      className="text-sm text-emerald-400"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditId(null); setEditFile(null); }}
                      className="text-sm text-stone-500"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <span className="font-medium text-stone-200">{c.name}</span>
                      {c.display_order !== 0 && (
                        <span className="text-xs text-stone-500 ml-2">order: {c.display_order}</span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setEditId(c.id);
                        setEditName(c.name);
                        setEditFile(null);
                      }}
                      className="text-torch-400 hover:text-torch-300 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      className="text-red-400 hover:text-red-300 text-sm transition-colors"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
