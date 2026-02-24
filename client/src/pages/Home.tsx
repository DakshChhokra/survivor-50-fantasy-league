import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ShowStatus, Contestant } from '../api';
import ContestantCard from '../components/ContestantCard';
import Leaderboard from '../components/Leaderboard';

export default function Home() {
  const [status, setStatus] = useState<ShowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<ShowStatus>('/show-status');
      setStatus(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!status) return null;

  const stillIn = status.contestants.filter((c) => !c.is_eliminated);
  const eliminated = status.contestants.filter((c) => c.is_eliminated);

  return (
    <div className="space-y-10">
      <div className="text-center pt-4">
        <h1 className="text-4xl font-bold text-torch-400 mb-2">🔥 Survivor Fantasy</h1>
        <p className="text-stone-400">Pick who gets voted off each week to earn points</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <ContestantGroup
          title="Still In"
          contestants={stillIn}
          accent="emerald"
          emptyMsg="Season hasn't started yet"
        />
        <ContestantGroup
          title="Eliminated"
          contestants={eliminated}
          accent="red"
          emptyMsg="Nobody out yet"
          showEpisode
        />
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-stone-100">Leaderboard</h2>
          <button
            onClick={load}
            className="text-xs text-stone-500 hover:text-stone-300 flex items-center gap-1 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
        <Leaderboard entries={status.leaderboard} />
      </section>

      {(status.currentEpisode || status.latestEpisode) && (
        <section className="bg-stone-900 border border-stone-800 rounded-lg p-4">
          {status.currentEpisode ? (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-green-900/60 text-green-400 border border-green-800 px-2 py-0.5 rounded-full font-medium">
                  Picks Open
                </span>
                <h3 className="font-semibold text-stone-200">
                  Episode {status.currentEpisode.episode_number}
                </h3>
              </div>
              {status.currentEpisode.air_date && (
                <p className="text-sm text-stone-400">
                  Airs: {new Date(status.currentEpisode.air_date).toLocaleDateString()}
                </p>
              )}
              {status.currentEpisode.deadline && (
                <p className="text-sm text-stone-400">
                  Deadline:{' '}
                  {new Date(status.currentEpisode.deadline).toLocaleString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              )}
              <div className="mt-3">
                <Link
                  to="/dashboard"
                  className="inline-block bg-torch-600 hover:bg-torch-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Make Your Pick →
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="font-semibold text-stone-200 mb-1">
                Episode {status.latestEpisode!.episode_number}
              </h3>
              <p className="text-sm text-stone-400">Picks are locked for this episode.</p>
            </div>
          )}
        </section>
      )}

      <div className="text-center pb-4">
        <Link to="/login" className="text-torch-400 hover:text-torch-300 text-sm transition-colors">
          Login to make your picks →
        </Link>
      </div>
    </div>
  );
}

function ContestantGroup({
  title,
  contestants,
  accent,
  emptyMsg,
  showEpisode,
}: {
  title: string;
  contestants: Contestant[];
  accent: 'emerald' | 'red';
  emptyMsg: string;
  showEpisode?: boolean;
}) {
  const accentClasses = {
    emerald: 'text-emerald-400 border-emerald-900/50 bg-emerald-950/20',
    red: 'text-red-400 border-red-900/50 bg-red-950/20',
  };

  return (
    <div className={`border rounded-lg p-4 ${accentClasses[accent]}`}>
      <h2 className="font-bold text-lg mb-4">
        {title}{' '}
        <span className="text-sm font-normal opacity-70">({contestants.length})</span>
      </h2>
      {contestants.length === 0 ? (
        <p className="text-stone-500 text-sm">{emptyMsg}</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {contestants.map((c) => (
            <div key={c.id} className="flex flex-col items-center">
              <ContestantCard contestant={c} size="sm" />
              {showEpisode && c.eliminated_episode && (
                <span className="text-xs text-stone-500 mt-0.5">
                  Ep {c.eliminated_episode}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="text-center pt-4">
        <div className="h-10 bg-stone-800 rounded w-64 mx-auto mb-2" />
        <div className="h-4 bg-stone-800 rounded w-48 mx-auto" />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-stone-900 rounded-lg h-48" />
        <div className="bg-stone-900 rounded-lg h-48" />
      </div>
      <div className="bg-stone-900 rounded-lg h-40" />
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center py-12">
      <p className="text-red-400 mb-4">{message}</p>
      <button onClick={onRetry} className="text-torch-400 hover:text-torch-300 text-sm">
        Try again
      </button>
    </div>
  );
}
