import { useEffect, useState, FormEvent } from 'react';
import { api, Season } from '../../api';

export default function AdminPoints({
  season,
  onSaved,
}: {
  season: Season;
  onSaved: () => void;
}) {
  const [weekly, setWeekly] = useState(String(season.weekly_pick_points));
  const [winner, setWinner] = useState(String(season.winner_pick_points));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setWeekly(String(season.weekly_pick_points));
    setWinner(String(season.winner_pick_points));
    setError(null);
    setSuccess(null);
  }, [season.id, season.weekly_pick_points, season.winner_pick_points]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    const weekly_pick_points = Number(weekly);
    const winner_pick_points = Number(winner);
    if (weekly.trim() === '' || !Number.isInteger(weekly_pick_points) || weekly_pick_points < 0) {
      setError('Weekly pick points must be a whole number 0 or more');
      return;
    }
    if (winner.trim() === '' || !Number.isInteger(winner_pick_points) || winner_pick_points < 0) {
      setError('Winner pick points must be a whole number 0 or more');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.patch(`/seasons/${season.id}`, { weekly_pick_points, winner_pick_points });
      setSuccess('Points saved. Scores update immediately.');
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-stone-100">Points</h2>
      <p className="text-xs text-stone-500">
        These apply only to {season.name}. Changing them rescores that season right away.
      </p>

      <form onSubmit={handleSave} className="bg-stone-900 border border-stone-800 rounded-xl p-6 space-y-4 max-w-lg">
        {error && (
          <div className="bg-red-950/50 border border-red-800 text-red-300 text-sm px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <p className="text-emerald-400 text-sm">{success}</p>
        )}
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">
            Correct weekly pick
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={weekly}
            onChange={(e) => setWeekly(e.target.value)}
            className="input-field"
          />
          <p className="text-xs text-stone-500 mt-1">
            Points for picking who goes home that episode.
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">
            Season winner pick
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={winner}
            onChange={(e) => setWinner(e.target.value)}
            className="input-field"
          />
          <p className="text-xs text-stone-500 mt-1">
            Bonus if that contestant wins the season.
          </p>
        </div>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  );
}
