import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ShowStatus, Contestant, Prediction, PreseasonPick, Episode } from '../api';
import { useAuth } from '../context/AuthContext';
import ContestantCard from '../components/ContestantCard';
import EpisodePicker from '../components/EpisodePicker';
import Leaderboard from '../components/Leaderboard';

export default function Dashboard() {
  const { user } = useAuth();
  const [status, setStatus] = useState<ShowStatus | null>(null);
  const [myPredictions, setMyPredictions] = useState<Prediction[]>([]);
  const [preseasonPick, setPreseasonPick] = useState<PreseasonPick | null>(null);
  const [allEpisodes, setAllEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [statusData, preds, prePick, episodes] = await Promise.all([
        api.get<ShowStatus>('/show-status'),
        api.get<Prediction[]>('/predictions/mine'),
        api.get<PreseasonPick | null>('/preseason-picks/mine'),
        api.get<Episode[]>('/episodes'),
      ]);
      setStatus(statusData);
      setMyPredictions(preds);
      setPreseasonPick(prePick);
      setAllEpisodes(episodes);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-center py-12 text-stone-500">Loading your dashboard...</div>;
  if (error) return <div className="text-center py-12 text-red-400">{error}</div>;
  if (!status) return null;

  const stillIn = status.contestants.filter((c) => !c.is_eliminated);
  const eliminated = status.contestants.filter((c) => c.is_eliminated);
  const myEntry = status.leaderboard.find((e) => e.username === user?.username);
  const currentEp = status.currentEpisode;

  const myPickForCurrentEp = currentEp
    ? myPredictions.find((p) => p.episode_id === currentEp.id) ?? null
    : null;

  function handlePickSaved(prediction: Prediction) {
    setMyPredictions((prev) => {
      const existing = prev.findIndex((p) => p.episode_id === prediction.episode_id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = prediction;
        return updated;
      }
      return [...prev, prediction];
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">
            Hey, {user?.username}! 👋
          </h1>
          <p className="text-stone-400 text-sm mt-0.5">
            You have{' '}
            <span className="text-torch-400 font-semibold">{myEntry?.total_points ?? 0} points</span>
            {' '}({myEntry?.correct_picks ?? 0} correct picks)
          </p>
        </div>
        <Link
          to="/profile"
          className="text-sm text-torch-400 hover:text-torch-300 transition-colors"
        >
          View full history →
        </Link>
      </div>

      {currentEp && (
        <section>
          <h2 className="text-lg font-semibold text-stone-200 mb-3">
            Episode {currentEp.episode_number} — Make Your Pick
          </h2>
          <EpisodePicker
            episode={currentEp}
            contestants={status.contestants}
            existingPrediction={myPickForCurrentEp}
            onSaved={handlePickSaved}
          />
        </section>
      )}

      {!preseasonPick && stillIn.length > 0 && (
        <PreseasonSection
          contestants={stillIn}
          onSaved={(pick) => setPreseasonPick(pick)}
        />
      )}

      {preseasonPick && (
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-4">
          <h3 className="font-semibold text-stone-200 mb-1">Your Winner Pick</h3>
          <div className="flex items-center gap-3 mt-2">
            <ContestantCard contestant={{ ...preseasonPick, is_eliminated: 0 } as unknown as Contestant} size="sm" />
            <div>
              <p className="font-medium text-stone-200">{preseasonPick.contestant_name}</p>
              <p className="text-xs text-stone-500">+50 pts if they win the season</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <ContestantSection title="Still In" contestants={stillIn} myPredictions={myPredictions} accent="emerald" />
        <ContestantSection title="Eliminated" contestants={eliminated} myPredictions={myPredictions} accent="red" />
      </div>

      <section>
        <h2 className="text-lg font-semibold text-stone-100 mb-3">Leaderboard</h2>
        <Leaderboard entries={status.leaderboard} highlightUsername={user?.username} />
      </section>

      {allEpisodes.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-stone-100 mb-3">All Episodes</h2>
          <div className="space-y-2">
            {allEpisodes.map((ep) => {
              const myPick = myPredictions.find((p) => p.episode_id === ep.id);
              return (
                <Link
                  key={ep.id}
                  to={`/episode/${ep.id}`}
                  className="flex items-center justify-between bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-lg px-4 py-3 transition-colors"
                >
                  <div>
                    <span className="font-medium text-stone-200">Episode {ep.episode_number}</span>
                    {ep.air_date && (
                      <span className="text-stone-500 text-sm ml-2">
                        {new Date(ep.air_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    {myPick && (
                      <span
                        className={`${
                          myPick.is_correct ? 'text-emerald-400' : 'text-stone-400'
                        }`}
                      >
                        {myPick.is_correct ? '✓' : '○'} {myPick.contestant_name}
                      </span>
                    )}
                    {ep.is_locked ? (
                      <span className="text-stone-600 text-xs">🔒</span>
                    ) : (
                      <span className="text-xs text-green-500">Open</span>
                    )}
                    <span className="text-stone-600">→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function ContestantSection({
  title,
  contestants,
  myPredictions,
  accent,
}: {
  title: string;
  contestants: Contestant[];
  myPredictions: Prediction[];
  accent: 'emerald' | 'red';
}) {
  const accentClasses = {
    emerald: 'text-emerald-400 border-emerald-900/50 bg-emerald-950/20',
    red: 'text-red-400 border-red-900/50 bg-red-950/20',
  };

  const myPickIds = new Set(myPredictions.map((p) => p.contestant_id));

  return (
    <div className={`border rounded-lg p-4 ${accentClasses[accent]}`}>
      <h2 className="font-bold text-lg mb-3">
        {title}{' '}
        <span className="text-sm font-normal opacity-70">({contestants.length})</span>
      </h2>
      {contestants.length === 0 ? (
        <p className="text-stone-500 text-sm">None yet</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {contestants.map((c) => (
            <ContestantCard
              key={c.id}
              contestant={c}
              size="sm"
              badge={
                myPickIds.has(c.id) ? (
                  <span className="bg-torch-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    ★
                  </span>
                ) : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PreseasonSection({
  contestants,
  onSaved,
}: {
  contestants: Contestant[];
  onSaved: (pick: PreseasonPick) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const pick = await api.post<PreseasonPick>('/preseason-picks', {
        contestant_id: selected,
      });
      onSaved(pick);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-amber-950/30 border border-amber-900/50 rounded-lg p-4">
      <h3 className="font-semibold text-amber-400 mb-1">🏆 Pick the Winner</h3>
      <p className="text-stone-400 text-sm mb-4">
        Pick who you think will win the season for a +50 point bonus. This cannot be changed once locked.
      </p>
      <div className="flex flex-wrap gap-3 mb-4">
        {contestants.map((c) => (
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
        className="bg-amber-700 hover:bg-amber-600 disabled:bg-stone-700 disabled:text-stone-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
      >
        {saving ? 'Saving...' : 'Lock In Winner Pick'}
      </button>
    </div>
  );
}
