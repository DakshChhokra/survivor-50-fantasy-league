import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Prediction, PreseasonPick, LeaderboardEntry } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [preseasonPick, setPreseasonPick] = useState<PreseasonPick | null>(null);
  const [allPreseasonPicks, setAllPreseasonPicks] = useState<PreseasonPick[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Prediction[]>('/predictions/mine'),
      api.get<PreseasonPick | null>('/preseason-picks/mine'),
      api.get<PreseasonPick[]>('/preseason-picks/all'),
      api.get<LeaderboardEntry[]>('/leaderboard/details'),
    ])
      .then(([preds, prePick, allPre, lb]) => {
        setPredictions(preds);
        setPreseasonPick(prePick);
        setAllPreseasonPicks(allPre);
        setLeaderboard(lb);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-stone-500">Loading profile...</div>;

  const myLeaderboardEntry = leaderboard.find((e) => e.username === user?.username);
  const correctPicks = predictions.filter((p) => p.is_correct);
  const totalPoints = (correctPicks.length * 10) + (myLeaderboardEntry?.preseason_bonus ?? 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">{user?.username}'s Profile</h1>
        <div className="flex gap-6 mt-3 text-sm">
          <Stat label="Total Points" value={totalPoints} accent="torch" />
          <Stat label="Correct Picks" value={correctPicks.length} accent="emerald" />
          <Stat label="Total Picks" value={predictions.length} accent="stone" />
          {myLeaderboardEntry?.preseason_bonus ? (
            <Stat label="Preseason Bonus" value={`+${myLeaderboardEntry.preseason_bonus}`} accent="amber" />
          ) : null}
        </div>
      </div>

      {preseasonPick && (
        <div className="bg-amber-950/30 border border-amber-900/50 rounded-lg p-4">
          <h3 className="font-semibold text-amber-400 mb-2">🏆 Your Winner Pick</h3>
          <div className="flex items-center gap-3">
            {preseasonPick.headshot_url && (
              <img
                src={preseasonPick.headshot_url}
                alt={preseasonPick.contestant_name}
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
            <div>
              <p className="font-medium text-stone-200">{preseasonPick.contestant_name}</p>
              <p className="text-xs text-stone-500">+50 pts if they win the season</p>
            </div>
          </div>
        </div>
      )}

      {predictions.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-stone-100 mb-3">Weekly Pick History</h2>
          <div className="space-y-2">
            {predictions.map((pred) => (
              <Link
                key={pred.id}
                to={`/episode/${pred.episode_id}`}
                className="flex items-center gap-3 px-4 py-3 bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-lg transition-colors"
              >
                <div className="w-6 text-center">
                  {pred.is_correct ? (
                    <span className="text-emerald-400 font-bold">✓</span>
                  ) : pred.is_locked ? (
                    <span className="text-red-400">✕</span>
                  ) : (
                    <span className="text-stone-600">○</span>
                  )}
                </div>
                <div className="flex-1">
                  <span className="font-medium text-stone-200">
                    Episode {pred.episode_number}
                  </span>
                  <span className="text-stone-500 text-sm ml-2">{pred.contestant_name}</span>
                </div>
                <span
                  className={`text-sm font-bold ${
                    pred.is_correct ? 'text-emerald-400' : 'text-stone-600'
                  }`}
                >
                  {pred.is_correct ? '+10 pts' : pred.is_locked ? '0 pts' : '—'}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {allPreseasonPicks.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-stone-100 mb-3">Everyone's Winner Picks</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {allPreseasonPicks.map((pick) => (
              <div
                key={pick.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
                  pick.username === user?.username
                    ? 'bg-torch-900/40 border-torch-800'
                    : 'bg-stone-900 border-stone-800'
                }`}
              >
                {pick.headshot_url && (
                  <img
                    src={pick.headshot_url}
                    alt={pick.contestant_name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-200 text-sm truncate">{pick.username}</p>
                  <p className="text-xs text-stone-500 truncate">{pick.contestant_name}</p>
                </div>
                {pick.username === user?.username && (
                  <span className="text-xs text-torch-400 shrink-0">you</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: 'torch' | 'emerald' | 'stone' | 'amber';
}) {
  const colors = {
    torch: 'text-torch-400',
    emerald: 'text-emerald-400',
    stone: 'text-stone-300',
    amber: 'text-amber-400',
  };
  return (
    <div>
      <div className={`text-2xl font-bold ${colors[accent]}`}>{value}</div>
      <div className="text-xs text-stone-500 mt-0.5">{label}</div>
    </div>
  );
}
