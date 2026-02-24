import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, Episode, Elimination, Prediction, Contestant } from '../api';
import { useAuth } from '../context/AuthContext';
import EpisodePicker from '../components/EpisodePicker';
import ContestantCard from '../components/ContestantCard';

type EpisodePrediction = Prediction & {
  username: string;
  is_correct: number;
};

export default function EpisodePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [eliminations, setEliminations] = useState<Elimination[]>([]);
  const [predictions, setPredictions] = useState<EpisodePrediction[]>([]);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [ep, elims, preds, conts] = await Promise.all([
        api.get<Episode>(`/episodes/${id}`),
        api.get<Elimination[]>(`/eliminations/episode/${id}`),
        api.get<EpisodePrediction[]>(`/predictions/episode/${id}`),
        api.get<Contestant[]>('/contestants'),
      ]);
      setEpisode(ep);
      setEliminations(elims);
      setPredictions(preds);
      setContestants(conts);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="text-center py-12 text-stone-500">Loading episode...</div>;
  if (error) return <div className="text-center py-12 text-red-400">{error}</div>;
  if (!episode) return null;

  const myPrediction = predictions.find((p) => p.username === user?.username) ?? null;
  const isLocked =
    episode.is_locked || (episode.deadline ? new Date() > new Date(episode.deadline) : false);

  function handlePickSaved(prediction: Prediction) {
    const updated = { ...prediction, username: user!.username, is_correct: 0 } as EpisodePrediction;
    setPredictions((prev) => {
      const idx = prev.findIndex((p) => p.username === user?.username);
      if (idx >= 0) {
        const arr = [...prev];
        arr[idx] = updated;
        return arr;
      }
      return [...prev, updated];
    });
  }

  const eliminatedIds = new Set(eliminations.map((e) => e.contestant_id));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link to="/dashboard" className="text-stone-500 hover:text-stone-300 transition-colors">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-stone-100">
          Episode {episode.episode_number}
        </h1>
        {episode.is_locked ? (
          <span className="text-xs bg-stone-800 text-stone-400 px-2 py-1 rounded-full">🔒 Locked</span>
        ) : (
          <span className="text-xs bg-green-900/50 text-green-400 border border-green-800 px-2 py-1 rounded-full">
            Picks Open
          </span>
        )}
      </div>

      <div className="flex gap-4 text-sm text-stone-400 flex-wrap">
        {episode.air_date && (
          <span>
            📅 {new Date(episode.air_date).toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        )}
        {episode.deadline && (
          <span>
            ⏰ Deadline:{' '}
            {new Date(episode.deadline).toLocaleString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>

      {eliminations.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-red-400 mb-3">
            Eliminated This Episode ({eliminations.length})
          </h2>
          <div className="flex flex-wrap gap-4">
            {eliminations.map((elim) => {
              const contestant = contestants.find((c) => c.id === elim.contestant_id);
              return (
                <div key={elim.id} className="flex flex-col items-center">
                  {contestant ? (
                    <ContestantCard
                      contestant={{ ...contestant, is_eliminated: 1 }}
                      size="md"
                    />
                  ) : (
                    <div className="text-stone-300 font-medium">{elim.contestant_name}</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {user && !isLocked && (
        <EpisodePicker
          episode={episode}
          contestants={contestants}
          existingPrediction={myPrediction}
          onSaved={handlePickSaved}
        />
      )}

      {predictions.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-stone-100 mb-3">
            All Picks ({predictions.length})
          </h2>
          <div className="space-y-2">
            {predictions.map((pred) => {
              const isMe = pred.username === user?.username;
              const correct = eliminatedIds.has(pred.contestant_id);
              return (
                <div
                  key={pred.id}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg border
                    ${isMe
                      ? 'bg-torch-900/40 border-torch-800'
                      : 'bg-stone-900 border-stone-800'
                    }
                  `}
                >
                  <div className="w-6 text-center">
                    {episode.is_locked || eliminations.length > 0 ? (
                      correct ? (
                        <span className="text-emerald-400">✓</span>
                      ) : (
                        <span className="text-red-400">✕</span>
                      )
                    ) : (
                      <span className="text-stone-600">○</span>
                    )}
                  </div>
                  <span className={`flex-1 font-medium ${isMe ? 'text-torch-300' : 'text-stone-200'}`}>
                    {pred.username}
                    {isMe && (
                      <span className="ml-2 text-xs text-torch-500 font-normal">you</span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    {pred.headshot_url && (
                      <img
                        src={pred.headshot_url}
                        alt={pred.contestant_name}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    )}
                    <span className="text-stone-300 text-sm">{pred.contestant_name}</span>
                  </div>
                  {(episode.is_locked || eliminations.length > 0) && (
                    <span
                      className={`text-sm font-bold shrink-0 ${
                        correct ? 'text-emerald-400' : 'text-stone-600'
                      }`}
                    >
                      {correct ? '+10' : '0'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {predictions.length === 0 && isLocked && (
        <div className="text-center text-stone-500 py-8">No picks were submitted for this episode.</div>
      )}
    </div>
  );
}
