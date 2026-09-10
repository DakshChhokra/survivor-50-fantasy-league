import { useEffect, useState, FormEvent } from 'react';
import { api, Season } from '../api';
import AdminSetup from './admin/Setup';
import AdminEpisodes from './admin/Episodes';
import AdminResults from './admin/Results';
import AdminUsers from './admin/Users';

type Tab = 'contestants' | 'episodes' | 'results' | 'users';

export default function Admin() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>('contestants');
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSeasons(selectId?: number) {
    const list = await api.get<Season[]>('/seasons');
    setSeasons(list);
    const current = list.find((s) => s.is_current);
    const next = selectId ?? seasonId ?? current?.id ?? list[0]?.id ?? null;
    setSeasonId(next);
  }

  useEffect(() => {
    loadSeasons().catch((e) => setError((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = seasons.find((s) => s.id === seasonId);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const season = await api.post<Season>('/seasons', {
        name: newName.trim(),
        make_current: seasons.length === 0,
      });
      setNewName('');
      await loadSeasons(season.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function makeCurrent() {
    if (!seasonId) return;
    try {
      await api.patch(`/seasons/${seasonId}`, { is_current: true });
      await loadSeasons(seasonId);
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-100">Admin</h1>

      <div className="card p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          {seasons.length > 0 && (
            <label className="flex items-center gap-2 shrink-0 text-sm text-stone-400">
              Editing
              <select
                className="bg-stone-800 border border-stone-700 text-stone-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-torch-600"
                value={seasonId ?? ''}
                onChange={(e) => setSeasonId(Number(e.target.value))}
              >
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.is_current ? ' (current)' : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
          {selected && !selected.is_current && (
            <button type="button" onClick={makeCurrent} className="btn-secondary">
              Make current season
            </button>
          )}
        </div>

        <form onSubmit={handleCreate} className="flex flex-wrap gap-2 items-end">
          <label className="text-sm text-stone-400 flex-1 min-w-[12rem]">
            New season
            <input
              className="input-field mt-1"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Survivor 51"
            />
          </label>
          <button type="submit" disabled={saving || !newName.trim()} className="btn-primary">
            {saving ? 'Creating...' : 'Create'}
          </button>
        </form>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <p className="text-xs text-stone-500">
          New season starts empty — add contestants and episodes below. Old seasons stay
          viewable on the league page.
        </p>
      </div>

      {seasons.length === 0 ? (
        <p className="text-stone-500">Create a season first.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {(['contestants', 'episodes', 'results', 'users'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${
                  tab === t ? 'bg-torch-600 text-white' : 'bg-stone-800 text-stone-400'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'contestants' && seasonId && <AdminSetup seasonId={seasonId} />}
          {tab === 'episodes' && seasonId && <AdminEpisodes seasonId={seasonId} />}
          {tab === 'results' && seasonId && <AdminResults seasonId={seasonId} />}
          {tab === 'users' && <AdminUsers />}
        </>
      )}
    </div>
  );
}
