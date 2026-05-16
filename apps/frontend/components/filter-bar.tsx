'use client';

export function FilterBar({ colleges, activeFilter, onFilterChange }: { colleges: any[]; activeFilter: string; onFilterChange: (f: string) => void }) {
  const counts = { all: colleges.length, safe: 0, borderline: 0, reach: 0 };
  colleges.forEach((c) => {
    const p = c.probability_percent;
    if (p == null) return;
    if (p >= 80) counts.safe++;
    else if (p >= 40) counts.borderline++;
    else counts.reach++;
  });

  const filters = [
    { key: 'all', label: 'All', count: counts.all, active: 'bg-ink text-white', idle: 'bg-phantom text-ink-3' },
    { key: 'safe', label: 'Safe', count: counts.safe, active: 'bg-validated text-white', idle: 'bg-validated/10 text-validated' },
    { key: 'borderline', label: 'Moderate', count: counts.borderline, active: 'bg-caution text-white', idle: 'bg-caution/10 text-caution' },
    { key: 'reach', label: 'Reach', count: counts.reach, active: 'bg-critical text-white', idle: 'bg-critical/10 text-critical' },
  ];

  return (
    <div className="flex gap-2">
      {filters.map((f) => (
        <button key={f.key} onClick={() => onFilterChange(f.key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border border-transparent ${
            activeFilter === f.key ? f.active : `${f.idle} hover:opacity-80`
          }`}>
          {f.label}
          <span className={`text-[10px] px-1.5 min-w-[18px] text-center rounded-full ${activeFilter === f.key ? 'bg-white/20' : 'bg-white/60'}`}>{f.count}</span>
        </button>
      ))}
    </div>
  );
}
