import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, Contestant, Prediction, Season } from '../api';
import { useAuth } from '../context/AuthContext';
import ContestantCard from '../components/ContestantCard';
import { pickResult } from '../utils/picks';

type SeasonSlice = {
  season: Season;
  total_points: number;
  correct_picks: number;
  total_picks: number;
  preseason_bonus: number;
  preseason_pick: {
    contestant_id: number;
    contestant_name: string;
    headshot_url: string | null;
  } | null;
  picks: Prediction[];
};

type PlayerProfile = {
  username: string;
  seasons: SeasonSlice[];
};

export default function Player() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setError(null);
    api
      .get<PlayerProfile>(`/leaderboard/player/${encodeURIComponent(username)}`)
      .then(setProfile)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return <div className="text-center py-12 text-stone-500">Loading...</div>;
  if (error) return <div className="text-center py-12 text-red-400">{error}</div>;
  if (!profile) return null;

  const me = user?.username === profile.username;
  const current = profile.seasons.find((s) => s.season.is_current) ?? profile.seasons[0];
  const past = profile.seasons.filter((s) => s !== current);

  return (
    <div className="space-y-10">
      <div>
        <Link to="/" className="text-stone-500 hover:text-stone-300 text-sm">
          ← League
        </Link>
        <h1 className="text-2xl font-bold text-stone-100 mt-2">
          {profile.username}
          {me && <span className="ml-2 text-sm font-normal text-torch-400">you</span>}
        </h1>
      </div>

      {current && <SeasonBlock slice={current} />}

      {past.length > 0 && (
        <section className="border-t border-stone-800 pt-10">
          <h2 className="text-2xl font-bold text-stone-100 mb-8">Previous seasons</h2>
          <div className="space-y-8">
            {past.map((slice) => (
              <div key={slice.season.id} className="border-b border-stone-800 pb-8">
                <SeasonBlock slice={slice} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SeasonBlock({ slice }: { slice: SeasonSlice }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-stone-100">{slice.season.name}</h2>
        <div className="flex gap-6 mt-2 text-sm">
          <div>
            <div className="text-2xl font-bold text-torch-400">{slice.total_points}</div>
            <div className="text-xs text-stone-500">points</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">{slice.correct_picks}</div>
            <div className="text-xs text-stone-500">correct</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-stone-300">{slice.total_picks}</div>
            <div className="text-xs text-stone-500">picks</div>
          </div>
          {slice.preseason_bonus > 0 && (
            <div>
              <div className="text-2xl font-bold text-amber-400">+{slice.preseason_bonus}</div>
              <div className="text-xs text-stone-500">winner bonus</div>
            </div>
          )}
        </div>
      </div>

      {slice.preseason_pick && (
        <div className="bg-amber-950/30 border border-amber-900/50 rounded-lg p-4">
          <h3 className="font-semibold text-amber-400 mb-2">Winner pick</h3>
          <div className="flex items-center gap-3">
            <ContestantCard
              contestant={
                {
                  ...slice.preseason_pick,
                  name: slice.preseason_pick.contestant_name,
                  is_eliminated: 0,
                } as unknown as Contestant
              }
              size="sm"
            />
            <div>
              <p className="font-medium text-stone-200">{slice.preseason_pick.contestant_name}</p>
              <p className="text-xs text-stone-500">
                {slice.preseason_bonus > 0
                  ? `+${slice.season.winner_pick_points} they won`
                  : `+${slice.season.winner_pick_points} if they win`}
              </p>
            </div>
          </div>
        </div>
      )}

      {slice.picks.length === 0 ? (
        <p className="text-stone-500 text-sm">No weekly picks this season.</p>
      ) : (
        <div className="space-y-2">
          {slice.picks.map((pred) => {
            const result = pickResult(pred);
            return (
              <Link
                key={pred.id}
                to={`/episode/${pred.episode_id}`}
                className="flex items-center gap-3 px-4 py-3 bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-lg transition-colors"
              >
                <span className="w-6 text-center">
                  {result === 'correct' && <span className="text-emerald-400 font-bold">✓</span>}
                  {result === 'wrong' && <span className="text-red-400">✕</span>}
                  {result === 'pending' && <span className="text-stone-600">○</span>}
                </span>
                {pred.headshot_url && (
                  <img
                    src={pred.headshot_url}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )}
                <span className="flex-1 font-medium text-stone-200">
                  Episode {pred.episode_number}
                  <span className="text-stone-500 text-sm ml-2">{pred.contestant_name}</span>
                </span>
                <span
                  className={`text-sm font-bold ${
                    result === 'correct' ? 'text-emerald-400' : 'text-stone-600'
                  }`}
                >
                  {result === 'correct'
                    ? `+${slice.season.weekly_pick_points}`
                    : result === 'wrong'
                      ? '0'
                      : '—'}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
