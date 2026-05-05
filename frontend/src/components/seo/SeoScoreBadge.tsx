interface Props {
  score: number | null | undefined;
  size?: 'sm' | 'md' | 'lg';
}

function tone(score: number) {
  if (score >= 90) return { ring: 'stroke-emerald-400', text: 'text-emerald-400' };
  if (score >= 70) return { ring: 'stroke-amber-400', text: 'text-amber-400' };
  return { ring: 'stroke-red-400', text: 'text-red-400' };
}

const SIZES = {
  sm: { box: 40, stroke: 4, font: 'text-[11px]' },
  md: { box: 64, stroke: 5, font: 'text-base' },
  lg: { box: 96, stroke: 6, font: 'text-2xl' },
};

export function SeoScoreBadge({ score, size = 'md' }: Props) {
  const dim = SIZES[size];
  if (score == null) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-white/[0.04] border border-white/[0.06] text-slate-500 ${dim.font}`}
        style={{ width: dim.box, height: dim.box }}
      >
        —
      </div>
    );
  }
  const safe = Math.max(0, Math.min(100, Math.round(score)));
  const t = tone(safe);
  const r = (dim.box - dim.stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - safe / 100);
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: dim.box, height: dim.box }}
    >
      <svg width={dim.box} height={dim.box} className="-rotate-90">
        <circle
          cx={dim.box / 2}
          cy={dim.box / 2}
          r={r}
          strokeWidth={dim.stroke}
          className="stroke-white/[0.06]"
          fill="none"
        />
        <circle
          cx={dim.box / 2}
          cy={dim.box / 2}
          r={r}
          strokeWidth={dim.stroke}
          className={t.ring}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className={`absolute font-bold ${t.text} ${dim.font} tabular-nums`}>{safe}</span>
    </div>
  );
}
