import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  api,
  ShowStatus,
  Contestant,
  Prediction,
  PreseasonPick,
  Episode,
  Season,
} from '../api';
import { useAuth } from '../context/AuthContext';
import { formatAirDate, formatEasternDeadline } from '../utils/time';
import ContestantCard from '../components/ContestantCard';
import EpisodePicker from '../components/EpisodePicker';
import Leaderboard from '../components/Leaderboard';
import { CORRECT_PICK_POINTS, PRESEASON_WINNER_BONUS, isEpisodeLocked } from '@app/constants';
import { pickResult } from '../utils/picks';
import { contestantBio } from '../data/season51Bios';

export default function League() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [status, setStatus] = useState<ShowStatus | null>(null);
  const [myPredictions, setMyPredictions] = useState<Prediction[]>([]);
  const [preseasonPick, setPreseasonPick] = useState<PreseasonPick | null>(null);
  const [allEpisodes, setAllEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Contestant | null>(null);

  const requested = searchParams.get('season');

  async function load(seasonId?: number) {
    setLoading(true);
    setError(null);
    try {
      const seasonList = await api.get<Season[]>('/seasons');
      setSeasons(seasonList);

      const current = seasonList.find((s) => s.is_current);
      const id = seasonId ?? (requested ? Number(requested) : current?.id);
      const q = id ? `?season_id=${id}` : '';

      if (!id) {
        setStatus({
          season: null,
          contestants: [],
          currentEpisode: null,
          latestEpisode: null,
          leaderboard: [],
        });
        setMyPredictions([]);
        setPreseasonPick(null);
        setAllEpisodes([]);
        return;
      }

      const fetches: Promise<unknown>[] = [
        api.get<ShowStatus>(`/show-status${q}`),
        api.get<Episode[]>(`/episodes${q}`),
      ];
      if (user) {
        fetches.push(
          api.get<Prediction[]>(`/predictions/mine${q}`),
          api.get<PreseasonPick | null>(`/preseason-picks/mine${q}`)
        );
      }

      const results = await Promise.all(fetches);
      setStatus(results[0] as ShowStatus);
      setAllEpisodes(results[1] as Episode[]);
      if (user) {
        setMyPredictions(results[2] as Prediction[]);
        setPreseasonPick(results[3] as PreseasonPick | null);
      } else {
        setMyPredictions([]);
        setPreseasonPick(null);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username, requested]);

  function selectSeason(id: number) {
    const current = seasons.find((s) => s.is_current);
    if (current && current.id === id) {
      setSearchParams({});
    } else {
      setSearchParams({ season: String(id) });
    }
  }

  if (loading) return <PageSkeleton />;
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={() => load()} className="text-torch-400 text-sm">
          Try again
        </button>
      </div>
    );
  }
  if (!status) return null;

  const season = status.season;
  const stillIn = status.contestants.filter((c) => !c.is_eliminated);
  const eliminated = status.contestants.filter((c) => c.is_eliminated);
  const myEntry = status.leaderboard.find((e) => e.username === user?.username);
  const currentEp = status.currentEpisode;
  const playing = Boolean(season?.is_current);
  const firstEpisode = allEpisodes[0] ?? null;
  const winnerPickOpen = playing && (!firstEpisode || !isEpisodeLocked(firstEpisode));

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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-torch-400">
            {season?.name ?? 'Survivor Fantasy'}
          </h1>
          {user ? (
            <p className="text-stone-400 text-sm mt-1">
              Hey {user.username} —{' '}
              <span className="text-torch-400 font-semibold">{myEntry?.total_points ?? 0} points</span>
              {myEntry ? ` (${myEntry.correct_picks} correct)` : ''}
            </p>
          ) : (
            <p className="text-stone-400 text-sm mt-1">
              Pick who gets voted off each week
            </p>
          )}
        </div>
        {seasons.length > 1 && (
          <label className="flex items-center gap-2 shrink-0 text-sm text-stone-400">
            Season
            <select
              className="bg-stone-800 border border-stone-700 text-stone-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-torch-600"
              value={season?.id ?? ''}
              onChange={(e) => selectSeason(Number(e.target.value))}
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
      </div>

      {!season && (
        <p className="text-stone-500">No season set up yet.</p>
      )}

      {user && playing && currentEp && (
        <section>
          <h2 className="text-lg font-semibold text-stone-200 mb-3">
            Episode {currentEp.episode_number} — this week
          </h2>
          <EpisodePicker
            episode={currentEp}
            contestants={status.contestants}
            existingPrediction={myPickForCurrentEp}
            onSaved={handlePickSaved}
          />
        </section>
      )}

      {user && playing && winnerPickOpen && (
        <PreseasonSection
          contestants={stillIn}
          existing={preseasonPick}
          onSaved={setPreseasonPick}
        />
      )}

      {preseasonPick && !winnerPickOpen && (
        <div className="card p-4">
          <h3 className="font-semibold text-stone-200 mb-1">Your winner pick</h3>
          <div className="flex items-center gap-3 mt-2">
            <ContestantCard
              contestant={{ ...preseasonPick, is_eliminated: 0 } as unknown as Contestant}
              size="sm"
            />
            <div>
              <p className="font-medium text-stone-200">{preseasonPick.contestant_name}</p>
              <p className="text-xs text-stone-500">
                +{PRESEASON_WINNER_BONUS} pts if they win
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <ContestantGroup
          title="Still In"
          contestants={stillIn}
          accent="emerald"
          emptyMsg="Season hasn't started yet"
          onOpen={setProfile}
        />
        <ContestantGroup
          title="Eliminated"
          contestants={eliminated}
          accent="red"
          emptyMsg="Nobody out yet"
          showEpisode
          onOpen={setProfile}
        />
      </div>

      {profile && status.contestants.some((c) => c.id === profile.id) && (
        <ContestantBioModal contestant={profile} onClose={() => setProfile(null)} />
      )}

      <section>
        <h2 className="text-lg font-semibold text-stone-100 mb-3">Leaderboard</h2>
        <Leaderboard
          entries={status.leaderboard}
          highlightUsername={user?.username}
        />
      </section>

      {user && myPredictions.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-stone-100 mb-3">Your picks</h2>
          <div className="space-y-2">
            {myPredictions.map((pred) => {
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
                      ? `+${CORRECT_PICK_POINTS}`
                      : result === 'wrong'
                        ? '0'
                        : '—'}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {allEpisodes.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-stone-100 mb-3">Episodes</h2>
          <div className="space-y-2">
            {allEpisodes.map((ep) => {
              const myPick = myPredictions.find((p) => p.episode_id === ep.id);
              const result = myPick ? pickResult(myPick) : null;
              const open = playing && !isEpisodeLocked(ep);
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
                        {formatAirDate(ep.air_date)}
                      </span>
                    )}
                    {ep.deadline && (
                      <span className="text-stone-600 text-xs ml-2">
                        {formatEasternDeadline(ep.deadline)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    {myPick && (
                      <span
                        className={
                          result === 'correct'
                            ? 'text-emerald-400'
                            : result === 'wrong'
                              ? 'text-red-400'
                              : 'text-stone-400'
                        }
                      >
                        {result === 'correct' ? '✓' : result === 'wrong' ? '✕' : '○'}{' '}
                        {myPick.contestant_name}
                      </span>
                    )}
                    {open ? (
                      <span className="text-xs text-green-500">Open</span>
                    ) : (
                      <span className="text-stone-600 text-xs">Locked</span>
                    )}
                    <span className="text-stone-600">→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {!user && (
        <div className="text-center pb-4">
          <Link to="/login" className="text-torch-400 hover:text-torch-300 text-sm">
            Log in to make your picks →
          </Link>
        </div>
      )}
    </div>
  );
}

function ContestantGroup({
  title,
  contestants,
  accent,
  emptyMsg,
  showEpisode,
  onOpen,
}: {
  title: string;
  contestants: Contestant[];
  accent: 'emerald' | 'red';
  emptyMsg: string;
  showEpisode?: boolean;
  onOpen: (contestant: Contestant) => void;
}) {
  const accentClasses = {
    emerald: 'text-emerald-400 border-emerald-900/50 bg-emerald-950/20',
    red: 'text-red-400 border-red-900/50 bg-red-950/20',
  };
  const canOpen = contestants.some((c) => contestantBio(c.name));

  return (
    <div className={`border rounded-lg p-4 ${accentClasses[accent]}`}>
      <div className="mb-4">
        <h2 className="font-bold text-lg">
          {title} <span className="text-sm font-normal opacity-70">({contestants.length})</span>
        </h2>
        {canOpen && (
          <p className="relative group/tip w-fit mt-1 text-xs font-normal text-stone-500 cursor-help border-b border-dotted border-stone-600">
            Click a player to see more
            <span className="pointer-events-none absolute left-0 top-full mt-1 z-20 w-56 rounded-md bg-stone-800 border border-stone-700 px-2 py-1.5 text-xs text-stone-300 opacity-0 group-hover/tip:opacity-100 transition-opacity shadow-lg">
              Click to see more photos and read about them
            </span>
          </p>
        )}
      </div>
      {contestants.length === 0 ? (
        <p className="text-stone-500 text-sm">{emptyMsg}</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {contestants.map((c) => {
            const bio = contestantBio(c.name);
            return (
              <div key={c.id} className="relative group/bio flex flex-col items-center hover:z-30">
                <ContestantCard
                  contestant={c}
                  size="sm"
                  onClick={bio ? () => onOpen(c) : undefined}
                />
                {bio && (
                  <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-20 hidden group-hover/bio:block w-44 rounded-md bg-stone-800 border border-stone-700 px-2 py-1 text-[11px] text-stone-300 text-center shadow-lg">
                    Click to see more photos and read about them
                  </span>
                )}
                {showEpisode && c.eliminated_episode && (
                  <span className="text-xs text-stone-500 mt-0.5">Ep {c.eliminated_episode}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ContestantBioModal({
  contestant,
  onClose,
}: {
  contestant: Contestant;
  onClose: () => void;
}) {
  const bio = contestantBio(contestant.name);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!bio) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contestant-bio-title"
        className="bg-stone-900 border border-stone-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 id="contestant-bio-title" className="text-xl font-bold text-stone-100">
              {contestant.name}
            </h3>
            <p className="text-sm text-stone-400 mt-0.5">
              {bio.age} · {bio.occupation}
            </p>
            <p className="text-xs text-stone-500">
              {bio.residence}
              {bio.hometown && bio.hometown !== bio.residence ? ` · From ${bio.hometown}` : ''}
            </p>
            {contestant.eliminated_episode ? (
              <p className="text-xs text-red-400 mt-1">Eliminated episode {contestant.eliminated_episode}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-500 hover:text-stone-200 text-lg leading-none px-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex gap-2 mb-4 h-44 sm:h-56">
          <img
            src={bio.images[0]}
            alt={`${bio.name} on Survivor 51`}
            className="h-full aspect-square object-cover object-top rounded-lg bg-stone-800"
          />
          <img
            src={bio.images[1]}
            alt={`${bio.name} portrait`}
            className="h-full flex-1 min-w-0 object-cover rounded-lg bg-stone-800"
          />
        </div>

        <div className="space-y-4">
          {bio.qa.map((item) => (
            <div key={item.q}>
              <p className="text-sm font-semibold text-torch-400 mb-1">{item.q}</p>
              <p className="text-sm text-stone-200 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-stone-600 mt-5">
          From{' '}
          <a
            href="https://parade.com/tv/survivor-51-cast-2026"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-stone-400"
          >
            Parade’s Survivor 51 cast guide
          </a>
          . Photos: Robert Voets/CBS.
        </p>
      </div>
    </div>
  );
}

function PreseasonSection({
  contestants,
  existing,
  onSaved,
}: {
  contestants: Contestant[];
  existing: PreseasonPick | null;
  onSaved: (pick: PreseasonPick) => void;
}) {
  const [selected, setSelected] = useState<number | null>(existing?.contestant_id ?? null);
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
      <h3 className="font-semibold text-amber-400 mb-1">Pick the winner</h3>
      <p className="text-stone-400 text-sm mb-4">
        +{PRESEASON_WINNER_BONUS} if they take the season. You can change this until episode 1
        locks.
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
        {saving ? 'Saving...' : existing ? 'Update winner pick' : 'Lock in winner pick'}
      </button>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-10 bg-stone-800 rounded w-64" />
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-stone-900 rounded-lg h-48" />
        <div className="bg-stone-900 rounded-lg h-48" />
      </div>
    </div>
  );
}
