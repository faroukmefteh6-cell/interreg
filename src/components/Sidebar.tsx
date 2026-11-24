"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Tableau de bord", mod: "8" },
  { href: "/kpi", label: "KPI par axe", mod: "6" },
  { href: "/twin", label: "Jumeau numérique", mod: "3, 4" },
  { href: "/data", label: "Données et connectivité", mod: "1, 2" },
  { href: "/simulation", label: "Simulation", mod: "5" },
  { href: "/reporting", label: "Reporting ESRS", mod: "7" },
];

export function Sidebar() {
  const path = usePathname() ?? "/";
  return (
    <nav aria-label="Navigation principale" className="flex gap-1 overflow-x-auto p-3 md:flex-col md:overflow-visible">
      {NAV.map((n) => {
        const on = n.href === "/" ? path === "/" : path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined} className={`flex shrink-0 items-center justify-between gap-3 rounded-md px-3 py-2 text-sm ${on ? "bg-accent text-bg" : "text-ink hover:bg-accent-soft"}`}>
            <span>{n.label}</span>
            {n.mod && <span className={`font-mono text-xs ${on ? "opacity-80" : "text-muted"}`}>{n.mod}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
