import { useState } from 'react';
import { api, Contestant, Episode, Prediction } from '../api';
import ContestantCard from './ContestantCard';

type Props = {
  episode: Episode;
  contestants: Contestant[];
  existingPrediction?: Prediction | null;
  onSaved: (prediction: Prediction) => void;
};

export default function EpisodePicker({ episode, contestants, existingPrediction, onSaved }: Props) {
  const [selected, setSelected] = useState<number | null>(
    existingPrediction?.contestant_id ?? null
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLocked =
    episode.is_locked ||
    (episode.deadline ? new Date() > new Date(episode.deadline) : false);

  const activeContestants = contestants.filter((c) => !c.is_eliminated);

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const prediction = await api.post<Prediction>('/predictions', {
        episode_id: episode.id,
        contestant_id: selected,
      });
      onSaved(prediction);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (isLocked) {
    return (
      <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
        <div className="flex items-center gap-2 text-stone-400 text-sm mb-3">
          <span>🔒</span>
          <span>Picks are locked for Episode {episode.episode_number}</span>
        </div>
        {existingPrediction && (
          <p className="text-stone-300 text-sm">
            Your pick: <strong>{existingPrediction.contestant_name}</strong>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-lg p-4">
      <h3 className="font-semibold text-stone-200 mb-1">
        Your pick for Episode {episode.episode_number}
      </h3>
      {episode.deadline && (
        <p className="text-xs text-stone-500 mb-3">
          Deadline:{' '}
          {new Date(episode.deadline).toLocaleString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        {activeContestants.map((c) => (
          <ContestantCard
            key={c.id}
            contestant={c}
            size="sm"
            selected={selected === c.id}
            onClick={() => setSelected(c.id)}
          />
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <button
        onClick={handleSave}
        disabled={!selected || saving}
        className="bg-torch-600 hover:bg-torch-500 disabled:bg-stone-700 disabled:text-stone-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
      >
        {saving ? 'Saving...' : existingPrediction ? 'Update Pick' : 'Save Pick'}
      </button>

      {existingPrediction && selected === existingPrediction.contestant_id && (
        <p className="text-xs text-stone-500 mt-2">
          Current pick: <strong className="text-stone-300">{existingPrediction.contestant_name}</strong>
        </p>
      )}
    </div>
  );
}
