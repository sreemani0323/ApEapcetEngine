'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { MapPin, TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { BRANCH_MAP, COLLEGE_TYPE_MAP, AFFILIATION_MAP } from '@/lib/constants';
import { useCallback, memo } from 'react';

// ═══ FIX: Null-safe rendering — no more "--" for missing predictions ═══
export const CollegeCard = memo(function CollegeCard({ college }: { college: any }) {
  const rawProb = college.probability_percent;
  const hasProb = rawProb != null && !isNaN(rawProb);
  const prob = hasProb ? rawProb : rawProb;

  let color = '#94a3b8', label = 'Pending', bg = 'bg-phantom', ringGlow = '';
  if (hasProb) {
    if (prob >= 80) { color = '#10b981'; label = 'Safe'; bg = 'bg-validated/10'; ringGlow = 'shadow-[0_0_12px_rgba(16,185,129,0.15)]'; }
    else if (prob >= 40) { color = '#f59e0b'; label = 'Moderate'; bg = 'bg-caution/10'; ringGlow = 'shadow-[0_0_12px_rgba(245,158,11,0.15)]'; }
    else { color = '#ef4444'; label = 'Reach'; bg = 'bg-critical/10'; ringGlow = 'shadow-[0_0_12px_rgba(239,68,68,0.15)]'; }
  }

  const gap = college.rank_gap;
  const hasGap = gap != null && !isNaN(gap);
  const GapIcon = hasGap ? (gap > 0 ? TrendingUp : gap < 0 ? TrendingDown : Minus) : Minus;

  // Prefetch college detail on hover
  const prefetch = useCallback(() => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = `/college/${college.instcode}`;
    if (!document.querySelector(`link[href="${link.href}"]`)) document.head.appendChild(link);
  }, [college.instcode]);

  // Format package to human readable (strip "unavailable")
  const formatPackage = (pkg: string | null) => {
    if (!pkg || pkg === 'unavailable' || pkg === 'null') return null;
    return pkg;
  };

  return (
    <div className="group bg-surface border border-node-border rounded-2xl hover:border-signal/20 hover:shadow-lifted hover:-translate-y-0.5 transition-all duration-300">
      <Link href={`/college/${college.instcode}`} onMouseEnter={prefetch} className="p-5 flex flex-col md:flex-row gap-5 block">
        {/* Probability Ring */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center md:pr-5 md:border-r border-node-border/60 min-w-[88px]">
          <div className={`relative w-[72px] h-[72px] rounded-full ${ringGlow} transition-shadow duration-500`}>
            <svg className="w-[72px] h-[72px] -rotate-90" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="30" fill="none" stroke="#f1f5f9" strokeWidth="4" />
              <motion.circle cx="36" cy="36" r="30" fill="none" stroke={color} strokeWidth="4"
                strokeDasharray="188.5" strokeLinecap="round"
                initial={{ strokeDashoffset: 188.5 }}
                animate={{ strokeDashoffset: hasProb ? 188.5 - (188.5 * prob) / 100 : 188.5 }}
                transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold font-mono leading-none" style={{ color }}>
                {hasProb ? prob.toFixed(1) : '—'}
              </span>
              <span className="text-[8px] font-bold text-ink-ghost mt-0.5">%</span>
            </div>
          </div>
          <span className={`mt-2.5 text-[9px] font-bold uppercase tracking-[0.15em] px-2.5 py-0.5 rounded-full ${bg}`} style={{ color }}>{label}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1.5">
            <h3 className="font-display font-bold text-ink leading-tight text-[15px] group-hover:text-signal transition-colors pr-2">{college.college_name}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3 font-medium mb-4">
            <span className="flex items-center gap-1"><MapPin size={11} className="text-signal" /> {college.district}</span>
            <a
              href={`https://www.google.com/maps/search/${encodeURIComponent((college.college_name || '') + ', ' + (college.place || college.district || '') + ', Andhra Pradesh')}`}
              target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-signal/10 text-signal hover:bg-signal/20 transition-colors text-[10px] font-bold"
              title="View on Google Maps"
            >
              <MapPin size={10} />
              Map
            </a>
            {college.place && <>
              <span className="w-1 h-1 bg-ink-ghost rounded-full" />
              <span>{college.place}</span>
            </>}
            {college.branch_code && <>
              <span className="w-1 h-1 bg-ink-ghost rounded-full" />
              <span className="font-semibold">{BRANCH_MAP[college.branch_code] || college.branch_code}</span>
            </>}
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-3 sm:p-3.5 bg-canvas/80 rounded-xl border border-node-border/40">
            <Metric label="Cutoff '24" value={college.cutoff_rank_2024?.toLocaleString('en-IN')} />
            <Metric label="Gap" 
              value={hasGap ? `${gap > 0 ? '+' : ''}${gap.toLocaleString('en-IN')}` : undefined}
              color={hasGap ? (gap > 0 ? 'text-validated' : gap < 0 ? 'text-critical' : undefined) : undefined}
              icon={hasGap ? <GapIcon size={10} /> : undefined} />
            <Metric label="Avg Package" value={formatPackage(college.avg_package)} color="text-validated" />
            <Metric label="Top Package" value={formatPackage(college.highest_package)} color="text-signal" />
          </div>
        </div>

        {/* Hover arrow */}
        <div className="hidden md:flex items-center">
          <ArrowRight size={16} className="text-ink-ghost opacity-0 group-hover:opacity-100 group-hover:text-signal transition-all -translate-x-2 group-hover:translate-x-0" />
        </div>
      </Link>
    </div>
  );
});

function Metric({ label, value, color, icon }: { label: string; value?: string | null; color?: string; icon?: React.ReactNode }) {
  return (
    <div>
      <span className="block text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted mb-1">{label}</span>
      <span className={`font-mono text-sm font-bold flex items-center gap-1 ${color || 'text-ink'}`}>
        {icon}{value || '—'}
      </span>
    </div>
  );
}
