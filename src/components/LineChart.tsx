type Series = { label: string; values: number[]; tone: "accent" | "muted" | "bad"; dashed?: boolean };
const stroke = { accent: "stroke-accent", muted: "stroke-muted", bad: "stroke-bad" } as const;
const fill = { accent: "bg-accent", muted: "bg-muted", bad: "bg-bad" } as const;

export function LineChart({ dates, series, unit, height = 200, markFrom }: { dates: string[]; series: Series[]; unit: string; height?: number; markFrom?: number }) {
  const W = 720;
  const H = height;
  const pad = { l: 48, r: 12, t: 10, b: 24 };
  const all = series.flatMap((s) => s.values);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const min = Math.max(0, lo - (hi - lo) * 0.1);
  const max = hi + (hi - lo) * 0.1 || 1;
  const n = dates.length;
  const x = (i: number) => pad.l + (i / Math.max(1, n - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
  const ticks = [0, 0.5, 1].map((t) => min + (max - min) * t);
  const xt = [0, Math.floor(n / 2), n - 1];
  const f = (v: number) => Math.round(v).toLocaleString("fr-FR");
  return (
    <figure className="min-w-0">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[480px]" role="img" aria-label={series.map((s) => s.label).join(", ") + ` en ${unit}`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={1} />
              <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" className="fill-muted text-[11px]">{f(t)}</text>
            </g>
          ))}
          {markFrom !== undefined && <rect x={x(markFrom)} y={pad.t} width={W - pad.r - x(markFrom)} height={H - pad.t - pad.b} className="fill-accent-soft" opacity={0.5} />}
          {series.map((s) => (
            <polyline key={s.label} fill="none" strokeWidth={s.tone === "accent" ? 2 : 1.5} strokeDasharray={s.dashed ? "5 4" : undefined} className={stroke[s.tone]} points={s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")} />
          ))}
          {xt.map((i) => (
            <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="fill-muted text-[11px]">{dates[i]}</text>
          ))}
        </svg>
      </div>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted">
        <span>{unit}</span>
        {series.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5"><span className={`inline-block h-0.5 w-4 ${fill[s.tone]}`} />{s.label}</span>
        ))}
      </figcaption>
    </figure>
  );
}
