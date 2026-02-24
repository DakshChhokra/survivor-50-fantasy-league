import { useEffect, useState } from 'react';
import { api, Contestant } from '../api';
import ContestantCard from '../components/ContestantCard';

export default function ContestantsPage() {
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Contestant[]>('/contestants')
      .then(setContestants)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-stone-500">Loading contestants...</div>;
  if (error) return <div className="text-center py-12 text-red-400">{error}</div>;

  const stillIn = contestants.filter((c) => !c.is_eliminated);
  const eliminated = contestants.filter((c) => c.is_eliminated);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-stone-100">All Contestants</h1>

      <section>
        <h2 className="text-lg font-semibold text-emerald-400 mb-4">
          Still In ({stillIn.length})
        </h2>
        {stillIn.length === 0 ? (
          <p className="text-stone-500 text-sm">No contestants yet.</p>
        ) : (
          <div className="flex flex-wrap gap-6">
            {stillIn.map((c) => (
              <ContestantCard key={c.id} contestant={c} size="md" />
            ))}
          </div>
        )}
      </section>

      {eliminated.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-red-400 mb-4">
            Eliminated ({eliminated.length})
          </h2>
          <div className="flex flex-wrap gap-6">
            {eliminated.map((c) => (
              <div key={c.id} className="flex flex-col items-center">
                <ContestantCard contestant={c} size="md" />
                {c.eliminated_episode && (
                  <span className="text-xs text-stone-500 mt-1">
                    Eliminated Ep {c.eliminated_episode}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
