import { useEffect, useState } from 'react';
import { api, Episode, Contestant, Elimination } from '../../api';

export default function AdminResults() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [eliminations, setEliminations] = useState<Record<number, Elimination[]>>({});
  const [selectedEp, setSelectedEp] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [eps, conts] = await Promise.all([
        api.get<Episode[]>('/episodes'),
        api.get<Contestant[]>('/contestants'),
      ]);
      setEpisodes(eps);
      setContestants(conts);

      const elimMap: Record<number, Elimination[]> = {};
      await Promise.all(
        eps.map(async (ep) => {
          const elims = await api.get<Elimination[]>(`/eliminations/episode/${ep.id}`);
          elimMap[ep.id] = elims;
        })
      );
      setEliminations(elimMap);

      if (eps.length > 0 && selectedEp === null) {
        setSelectedEp(eps[eps.length - 1].id);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleMarkEliminated(episodeId: number, contestantId: number) {
    setMarking(contestantId);
    try {
      const elim = await api.post<Elimination>('/eliminations', {
        episode_id: episodeId,
        contestant_id: contestantId,
      });
      setEliminations((prev) => ({
        ...prev,
        [episodeId]: [...(prev[episodeId] ?? []), elim],
      }));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setMarking(null);
    }
  }

  async function handleUndoElimination(episodeId: number, elimId: number) {
    if (!confirm('Undo this elimination?')) return;
    try {
      await api.delete(`/eliminations/${elimId}`);
      setEliminations((prev) => ({
        ...prev,
        [episodeId]: (prev[episodeId] ?? []).filter((e) => e.id !== elimId),
      }));
    } catch (e) {
      alert((e as Error).message);
    }
  }

  if (loading) return <div className="text-center py-12 text-stone-500">Loading...</div>;

  const currentEp = episodes.find((e) => e.id === selectedEp);
  const currentElims = selectedEp ? (eliminations[selectedEp] ?? []) : [];
  const eliminatedIds = new Set(
    Object.values(eliminations)
      .flat()
      .map((e) => e.contestant_id)
  );
  const currentEpEliminatedIds = new Set(currentElims.map((e) => e.contestant_id));

  const availableToMark = contestants.filter(
    (c) => !currentEpEliminatedIds.has(c.id)
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-100">Mark Results</h1>

      {episodes.length === 0 ? (
        <p className="text-stone-500">No episodes yet. Create episodes first.</p>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-2">
              Select Episode
            </label>
            <div className="flex flex-wrap gap-2">
              {episodes.map((ep) => (
                <button
                  key={ep.id}
                  onClick={() => setSelectedEp(ep.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedEp === ep.id
                      ? 'bg-torch-600 text-white'
                      : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Episode {ep.episode_number}
                  {(eliminations[ep.id] ?? []).length > 0 && (
                    <span className="ml-1 text-xs opacity-70">
                      ({(eliminations[ep.id] ?? []).length} out)
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {currentEp && (
            <div className="space-y-6">
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-stone-200">
                    Episode {currentEp.episode_number} — Eliminations
                  </h2>
                  <span className="text-xs text-stone-500">
                    {currentElims.length} / {currentEp.num_eliminations} expected
                  </span>
                </div>

                {currentElims.length > 0 ? (
                  <div className="space-y-2 mb-5">
                    <h3 className="text-sm font-medium text-red-400 mb-2">Eliminated:</h3>
                    {currentElims.map((elim) => {
                      const contestant = contestants.find((c) => c.id === elim.contestant_id);
                      return (
                        <div
                          key={elim.id}
                          className="flex items-center gap-3 bg-red-950/20 border border-red-900/30 rounded-lg px-4 py-2.5"
                        >
                          {contestant?.headshot_url && (
                            <img
                              src={contestant.headshot_url}
                              alt={elim.contestant_name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          )}
                          <span className="flex-1 text-red-300 font-medium">
                            {elim.contestant_name}
                          </span>
                          <button
                            onClick={() => handleUndoElimination(currentEp.id, elim.id)}
                            className="text-xs text-stone-500 hover:text-red-400 transition-colors"
                          >
                            Undo
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-stone-500 text-sm mb-4">No eliminations marked yet.</p>
                )}

                <h3 className="text-sm font-medium text-stone-400 mb-3">
                  Mark who was eliminated:
                </h3>
                <div className="flex flex-wrap gap-2">
                  {availableToMark.map((c) => {
                    const alreadyOut = eliminatedIds.has(c.id) && !currentEpEliminatedIds.has(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => !alreadyOut && handleMarkEliminated(currentEp.id, c.id)}
                        disabled={marking === c.id || alreadyOut}
                        className={`
                          flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border
                          ${alreadyOut
                            ? 'bg-stone-800/40 border-stone-700 text-stone-600 cursor-not-allowed line-through'
                            : 'bg-stone-800 border-stone-700 text-stone-200 hover:border-red-700 hover:bg-red-950/30 hover:text-red-300 cursor-pointer'
                          }
                          ${marking === c.id ? 'opacity-50' : ''}
                        `}
                      >
                        {c.headshot_url && (
                          <img
                            src={c.headshot_url}
                            alt={c.name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        )}
                        {c.name}
                        {alreadyOut && <span className="text-xs text-stone-600 ml-1">(prev ep)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
