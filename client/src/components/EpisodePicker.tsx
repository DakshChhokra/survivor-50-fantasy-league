import { useState } from 'react';
import { api, Contestant, Episode, Prediction } from '../api';
import { formatEasternDeadline } from '../utils/time';
import ContestantCard from './ContestantCard';
import { isEpisodeLocked } from '@app/constants';
import { multiBootNote } from '../utils/picks';

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

  const locked = isEpisodeLocked(episode);
  const activeContestants = contestants.filter((c) => !c.is_eliminated);
  const bootNote = multiBootNote(episode.num_eliminations);

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

  if (locked) {
    return (
      <div className="card p-4">
        <p className="text-stone-400 text-sm mb-3">
          Picks are locked for Episode {episode.episode_number}
        </p>
        {existingPrediction && (
          <p className="text-stone-300 text-sm">
            Your pick: <strong>{existingPrediction.contestant_name}</strong>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="card p-4">
      <h3 className="font-semibold text-stone-200 mb-1">
        Your pick for Episode {episode.episode_number}
      </h3>
      {(bootNote || episode.deadline) && (
        <div className="mb-3 space-y-1">
          {bootNote && (
            <p className="text-sm text-torch-400">{bootNote}</p>
          )}
          {episode.deadline && (
            <p className="text-xs text-stone-500">
              Deadline: {formatEasternDeadline(episode.deadline)}
            </p>
          )}
        </div>
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
        className="btn-primary"
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
