'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { compareBranches, trendingBranches } from '@/lib/api';
import { BRANCH_MAP } from '@/lib/constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { motion } from 'framer-motion';
import { DataNode } from '@/components/liquid/data-node';
import { TrendingUp, TrendingDown, Banknote, ArrowUp, ArrowDown, Minus } from 'lucide-react';

export default function AnalyticsPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, t] = await Promise.all([
          compareBranches().catch(() => ({ data: [] })),
          trendingBranches().catch(() => ({ data: [] })),
        ]);
        setPackages(p.data);
        setTrends(t.data);
      } catch { toast.error('Analytics stream failed.'); }
      finally { setLoading(false); }
    })();
  }, []);

  const ttStyle: React.CSSProperties = { borderRadius: '14px', border: '1px solid #e5e7eb', boxShadow: '0 8px 32px rgba(0,0,0,0.06)', fontFamily: 'Inter', fontSize: '12px' };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="text-center mb-12 max-w-2xl mx-auto">
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-ink mb-4">Market Intelligence</h1>
        <p className="text-ink-3 text-lg">Placement economics and cutoff trajectories across branches.</p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="bg-surface border border-node-border rounded-2xl p-6 h-[420px] animate-pulse"><div className="h-full bg-phantom rounded-xl" /></div>
          <div className="bg-surface border border-node-border rounded-2xl p-6 h-[420px] animate-pulse"><div className="h-full bg-phantom rounded-xl" /></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Placement Economics */}
          <DataNode title="Placement Economics" icon={<Banknote size={18} />} status={packages.length > 0 ? 'validated' : 'idle'}
            summary={<span>{packages.length} branches</span>}>
            {packages.length > 0 ? (() => {
                const hasPlacement = packages.some((p: any) => p.avg_lpa_aggregate > 0);
                return (
                <>
                <div className="h-[380px] mt-4">
                  <ResponsiveContainer>
                    <BarChart data={packages.slice(0, 15)} margin={{ top: 10, right: 0, left: -20, bottom: 20 }}>
                      <XAxis dataKey="branch_code" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} dy={8} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v: number) => hasPlacement ? `₹${v}L` : `${v}`} />
                      <Tooltip cursor={{ fill: '#f8fafc', radius: 8 }} labelFormatter={(l: any) => BRANCH_MAP[l] || l}
                        formatter={(v: any, n: any) => hasPlacement ? [`₹${v} LPA`, n === 'avg_lpa_aggregate' ? 'Average' : 'Peak'] : [`${v} colleges`, 'Count']}
                        contentStyle={ttStyle} />
                      {hasPlacement ? (
                        <>
                          <Bar dataKey="avg_lpa_aggregate" fill="#2563eb" radius={[6, 6, 6, 6]} barSize={14} />
                          <Bar dataKey="max_lpa_recorded" fill="#bfdbfe" radius={[6, 6, 6, 6]} barSize={14} />
                        </>
                      ) : (
                        <Bar dataKey="college_count" fill="#2563eb" radius={[6, 6, 6, 6]} barSize={18} />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 mt-2 -mx-1 px-1">
                  {packages.slice(0, 5).map((p: any, i: number) => (
                    <div key={p.branch_code} className="flex-shrink-0 p-3 bg-canvas rounded-xl border border-node-border min-w-[140px]">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[9px] font-bold bg-signal/10 text-signal px-1.5 py-0.5 rounded">#{i + 1}</span>
                        <span className="font-mono text-xs font-bold text-ink">{p.branch_code}</span>
                      </div>
                      <p className="text-lg font-bold font-mono text-validated">{hasPlacement ? `₹${p.avg_lpa_aggregate}L` : `${p.college_count} colleges`}</p>
                      <p className="text-[9px] text-ink-muted font-semibold uppercase tracking-widest">{hasPlacement ? 'Avg LPA' : 'Branch Density'}</p>
                    </div>
                  ))}
                </div>
                </>
                );
              })() : <p className="text-ink-3 py-10 text-center">Insufficient placement data.</p>}
          </DataNode>

          {/* Cutoff Velocity */}
          <DataNode title="Cutoff Velocity" icon={<TrendingUp size={18} />} status={trends.length > 0 ? 'active' : 'idle'}
            summary={<span>{trends.length} trajectories</span>}>
            {trends.length > 0 ? (
              <>
                <div className="h-[380px] mt-4">
                  <ResponsiveContainer>
                    <ComposedChart data={trends.slice(0, 15)} margin={{ top: 10, right: 0, left: 10, bottom: 20 }}>
                      <XAxis dataKey="branch_code" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} dy={8} />
                      <YAxis hide reversed domain={['auto', 'auto']} />
                      <Tooltip cursor={{ fill: '#f8fafc', radius: 8 }} labelFormatter={(l: any) => BRANCH_MAP[l] || l}
                        formatter={(v: any, n: any) => [v != null && !isNaN(v) ? Number(v).toLocaleString('en-IN') : '—', String(n).includes('2022') ? '2022' : '2024']}
                        contentStyle={ttStyle} />
                      <Bar dataKey="median_cutoff_2022" fill="#e2e8f0" barSize={10} radius={[6, 6, 6, 6]} />
                      <Bar dataKey="median_cutoff_2024" fill="#94a3b8" barSize={10} radius={[6, 6, 6, 6]} />
                      <Line type="monotone" dataKey="median_cutoff_2024" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2.5, fill: '#fff' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Trend cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-6">
                  {trends.slice(0, 9).map((t: any) => {
                    const hot = t.competition_increase > 3000;
                    const cold = t.competition_increase < -3000;
                    const Icon = hot ? ArrowUp : cold ? ArrowDown : Minus;
                    return (
                      <motion.div key={t.branch_code} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-xl border transition-all hover:shadow-float ${hot ? 'bg-critical/5 border-critical/15' : cold ? 'bg-validated/5 border-validated/15' : 'bg-surface border-node-border'}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="font-display font-bold text-ink text-sm">{BRANCH_MAP[t.branch_code] || t.branch_code}</span>
                            <span className="block font-mono text-[10px] text-ink-muted">{t.branch_code}</span>
                          </div>
                          <span className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${hot ? 'bg-critical/10 text-critical' : cold ? 'bg-validated/10 text-validated' : 'bg-phantom text-ink-3'}`}>
                            <Icon size={10} /> {hot ? 'Heating' : cold ? 'Cooling' : 'Stable'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div><span className="block text-ink-ghost font-bold text-[9px] uppercase tracking-widest">2022</span><span className="font-mono text-ink-3">{t.median_cutoff_2022?.toLocaleString('en-IN')}</span></div>
                          <div><span className="block text-ink-ghost font-bold text-[9px] uppercase tracking-widest">2024</span><span className="font-mono font-bold text-ink">{t.median_cutoff_2024?.toLocaleString('en-IN')}</span></div>
                          <div className="text-right"><span className="block text-ink-ghost font-bold text-[9px] uppercase tracking-widest">Shift</span><span className={`font-mono font-bold ${t.competition_increase > 0 ? 'text-critical' : 'text-validated'}`}>{t.competition_increase > 0 ? '+' : ''}{t.competition_increase?.toLocaleString('en-IN')}</span></div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            ) : <p className="text-ink-3 py-10 text-center">Requires 2022 + 2024 baseline data.</p>}
          </DataNode>
        </div>
      )}
    </div>
  );
}
