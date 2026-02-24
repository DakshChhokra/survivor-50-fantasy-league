import { Contestant } from '../api';

type Props = {
  contestant: Contestant;
  size?: 'sm' | 'md' | 'lg';
  badge?: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  dimmed?: boolean;
};

export default function ContestantCard({
  contestant,
  size = 'md',
  badge,
  onClick,
  selected,
  dimmed,
}: Props) {
  const sizeClasses = {
    sm: 'w-20',
    md: 'w-28',
    lg: 'w-36',
  };

  const imgSizeClasses = {
    sm: 'h-20 w-20',
    md: 'h-28 w-28',
    lg: 'h-36 w-36',
  };

  return (
    <div
      onClick={onClick}
      className={`
        flex flex-col items-center gap-1.5 group
        ${sizeClasses[size]}
        ${onClick ? 'cursor-pointer' : ''}
        ${dimmed ? 'opacity-40' : ''}
      `}
    >
      <div
        className={`
          relative rounded-full overflow-hidden border-2 transition-all
          ${imgSizeClasses[size]}
          ${selected ? 'border-torch-500 ring-2 ring-torch-400 ring-offset-2 ring-offset-stone-950' : 'border-stone-700'}
          ${onClick ? 'group-hover:border-torch-600' : ''}
        `}
      >
        {contestant.headshot_url ? (
          <img
            src={contestant.headshot_url}
            alt={contestant.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-stone-700 flex items-center justify-center text-stone-400">
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </div>
        )}
        {contestant.is_eliminated ? (
          <div className="absolute inset-0 bg-stone-950/70 flex items-center justify-center">
            <span className="text-red-400 text-2xl font-bold">✕</span>
          </div>
        ) : null}
        {badge && (
          <div className="absolute bottom-0 right-0">{badge}</div>
        )}
      </div>
      <span
        className={`text-center font-medium leading-tight ${size === 'sm' ? 'text-xs' : 'text-sm'
          } ${contestant.is_eliminated ? 'text-stone-500 line-through' : 'text-stone-200'}`}
      >
        {contestant.name}
      </span>
    </div>
  );
}
