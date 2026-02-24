type Entry = {
  user_id: number;
  username: string;
  total_points: number;
  correct_picks?: number;
  total_picks?: number;
  weekly_points?: number;
  preseason_bonus?: number;
  preseason_pick_name?: string | null;
};

type Props = {
  entries: Entry[];
  highlightUsername?: string;
};

const medals = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ entries, highlightUsername }: Props) {
  if (entries.length === 0) {
    return (
      <div className="text-center text-stone-500 py-8">No scores yet. Make your picks!</div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, idx) => {
        const isHighlighted = entry.username === highlightUsername;
        return (
          <div
            key={entry.user_id}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
              ${isHighlighted
                ? 'bg-torch-900/60 border border-torch-700'
                : 'bg-stone-900 border border-stone-800 hover:border-stone-700'
              }
            `}
          >
            <div className="w-8 text-center">
              {idx < 3 ? (
                <span className="text-lg">{medals[idx]}</span>
              ) : (
                <span className="text-stone-500 font-mono text-sm">{idx + 1}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`font-semibold truncate ${
                    isHighlighted ? 'text-torch-300' : 'text-stone-100'
                  }`}
                >
                  {entry.username}
                </span>
                {isHighlighted && (
                  <span className="text-xs bg-torch-800 text-torch-300 px-1.5 py-0.5 rounded shrink-0">
                    you
                  </span>
                )}
              </div>
              {entry.preseason_pick_name && (
                <div className="text-xs text-stone-500 mt-0.5">
                  Winner pick: {entry.preseason_pick_name}
                </div>
              )}
            </div>

            <div className="text-right shrink-0">
              <div className={`font-bold text-lg ${isHighlighted ? 'text-torch-400' : 'text-stone-100'}`}>
                {entry.total_points}
                <span className="text-xs font-normal text-stone-500 ml-1">pts</span>
              </div>
              {(entry.correct_picks !== undefined || entry.total_picks !== undefined) && (
                <div className="text-xs text-stone-500">
                  {entry.correct_picks ?? 0}/{entry.total_picks ?? 0} correct
                </div>
              )}
              {entry.preseason_bonus !== undefined && entry.preseason_bonus > 0 && (
                <div className="text-xs text-amber-500">+{entry.preseason_bonus} bonus</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
