"use client";

import { useRef, useState, type CSSProperties } from "react";
import type { SceneItem } from "@/lib/twin3d";

const COLS = 5;
const CELL = 92;
const SIZE = 60;
const H_MIN = 26;
const H_MAX = 90;
const TILT = 58;

const color = (tone: SceneItem["tone"]) => `rgb(var(--${tone === "ok" ? "ok" : tone === "warn" ? "warn" : tone === "bad" ? "bad" : "muted"}))`;

function Block({ item, x, y, h, on, onPick }: { item: SceneItem; x: number; y: number; h: number; on: boolean; onPick: () => void }) {
  const empty = item.count === 0;
  const c = color(item.tone);
  const face = (extra: CSSProperties, shade: number): CSSProperties => ({
    position: "absolute",
    background: empty ? "transparent" : c,
    border: empty ? "1.5px dashed rgb(var(--muted))" : "1px solid rgb(var(--bg) / 0.35)",
    filter: `brightness(${shade})`,
    boxSizing: "border-box",
    ...extra,
  });
  return (
    <div onClick={onPick} style={{ position: "absolute", left: x, top: y, width: SIZE, height: SIZE, transformStyle: "preserve-3d", cursor: "pointer" }}>
      <div style={face({ width: SIZE, height: SIZE, transform: "translateZ(0)", opacity: 0.55 }, 0.7)} />
      <div style={face({ width: SIZE, height: h, top: SIZE, transformOrigin: "0 0", transform: "rotateX(90deg)" }, 0.8)} />
      <div style={face({ width: SIZE, height: h, top: 0, transformOrigin: "0 0", transform: "rotateX(90deg)" }, 0.65)} />
      <div style={face({ width: h, height: SIZE, left: 0, transformOrigin: "0 0", transform: "rotateY(-90deg)" }, 0.9)} />
      <div style={face({ width: h, height: SIZE, left: SIZE, transformOrigin: "0 0", transform: "rotateY(-90deg)" }, 0.7)} />
      <div style={face({ width: SIZE, height: SIZE, transform: `translateZ(${h}px)`, outline: on ? "3px solid rgb(var(--ink))" : "none", outlineOffset: -3 }, 1.12)} />
    </div>
  );
}

export default function TwinScene({ items }: { items: SceneItem[] }) {
  const [rz, setRz] = useState(-35);
  const [sel, setSel] = useState<string>(items[0].id);
  const drag = useRef<{ x: number; rz: number; moved: boolean } | null>(null);
  const rows = Math.ceil(items.length / COLS);
  const W = COLS * CELL;
  const D = rows * CELL;
  const cur = items.find((i) => i.id === sel) ?? items[0];
  const heightOf = (i: SceneItem) => (i.count === 0 ? 3 : i.score === null ? H_MIN : H_MIN + ((H_MAX - H_MIN) * i.score) / 100);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div>
        <div
          role="img"
          aria-label="Modèle 3D du site : un bloc par type de données, hauteur proportionnelle au score moyen des KPI"
          className="relative h-[380px] cursor-grab touch-none select-none overflow-hidden rounded-lg border border-line bg-bg active:cursor-grabbing"
          onPointerDown={(e) => { drag.current = { x: e.clientX, rz, moved: false }; }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || e.buttons === 0) return;
            if (Math.abs(e.clientX - d.x) > 4) d.moved = true;
            setRz(d.rz + (e.clientX - d.x) * 0.5);
          }}
          onPointerUp={() => { setTimeout(() => { drag.current = null; }, 0); }}
          onPointerLeave={() => { drag.current = null; }}
          onClickCapture={(e) => { if (drag.current?.moved) e.stopPropagation(); }}
        >
          <div style={{ position: "absolute", left: "50%", top: "60%", width: 0, height: 0, transformStyle: "preserve-3d", transform: `rotateX(${TILT}deg) rotateZ(${rz}deg)` }}>
            <div style={{ position: "absolute", left: -W / 2 - 14, top: -D / 2 - 14, width: W + 28, height: D + 28, transform: "translateZ(-1px)", background: "rgb(var(--surface))", border: "1px solid rgb(var(--line))", backgroundImage: `linear-gradient(rgb(var(--line)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--line)) 1px, transparent 1px)`, backgroundSize: `${CELL}px ${CELL}px`, backgroundPosition: "14px 14px" }} />
            {items.map((it, i) => (
              <Block key={it.id} item={it} h={heightOf(it)} on={it.id === sel}
                x={-W / 2 + (i % COLS) * CELL + (CELL - SIZE) / 2} y={-D / 2 + Math.floor(i / COLS) * CELL + (CELL - SIZE) / 2} onPick={() => setSel(it.id)} />
            ))}
          </div>
          <div className="absolute bottom-2 left-2 flex gap-1.5">
            <button type="button" className="rounded border border-line bg-surface px-2 py-1 text-xs" onClick={() => setRz((v) => v - 30)} aria-label="Tourner à gauche">⟲</button>
            <button type="button" className="rounded border border-line bg-surface px-2 py-1 text-xs" onClick={() => setRz((v) => v + 30)} aria-label="Tourner à droite">⟳</button>
            <button type="button" className="rounded border border-line bg-surface px-2 py-1 text-xs" onClick={() => setRz(-35)}>Réinitialiser</button>
          </div>
          <p className="pointer-events-none absolute left-2 top-2 text-sm font-semibold">{cur.name}</p>
          <p className="pointer-events-none absolute right-2 top-2 text-xs text-muted">Glisser pour tourner · cliquer un bloc</p>
        </div>
        <p className="mt-2 text-xs text-muted">Hauteur du bloc = score moyen des KPI du type. Vert : 80 et plus · orange : 60 à 79 · rouge : moins de 60 · gris : indicatif ou option non activée.</p>
      </div>

      <div>
        <ul className="mb-3 flex flex-wrap gap-1.5" aria-label="Types de données">
          {items.map((i) => (
            <li key={i.id}>
              <button type="button" onClick={() => setSel(i.id)} aria-pressed={i.id === sel} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${i.id === sel ? "border-accent bg-accent text-bg" : "border-line bg-surface"}`}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: i.count ? color(i.tone) : "transparent", border: i.count ? "none" : "1px dashed currentColor" }} />
                {i.name}
              </button>
            </li>
          ))}
        </ul>
        <div className="rounded-lg border border-line bg-surface p-3">
          <div className="text-sm font-semibold">{cur.name}</div>
          <div className="mb-2 text-xs text-muted">{cur.examples}</div>
          {cur.count === 0 ? (
            <p className="text-sm text-muted">Option non activée : aucune donnée collectée.</p>
          ) : (
            <>
              <div className="mb-2 text-xs text-muted">{cur.count} KPI · score moyen {cur.score === null ? "indicatif" : Math.round(cur.score)}</div>
              <ul className="max-h-52 space-y-1 overflow-auto text-sm">
                {cur.kpis.map((k) => (
                  <li key={k.label} className="flex justify-between gap-2"><span>{k.label}</span><span className="tnum whitespace-nowrap text-muted">{k.value} {k.unit}</span></li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
