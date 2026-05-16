'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { getCollegeDetail } from '@/lib/api';
import { BRANCH_MAP } from '@/lib/constants';
import { ComposedChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { DataNode } from '@/components/liquid/data-node';
import { ArrowLeft, MapPin, Building, GraduationCap, IndianRupee, TrendingUp, TrendingDown, Minus, ExternalLink, Users } from 'lucide-react';

export default function CollegeDetailPage() {
  const params = useParams();
  const instcode = params.instcode as string;
  const [college, setCollege] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const { data } = await getCollegeDetail(instcode); setCollege(data); }
      catch { toast.error('Failed to resolve institution.'); }
      finally { setLoading(false); }
    })();
  }, [instcode]);

  if (loading) return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="h-4 w-20 bg-phantom rounded mb-8 animate-pulse" />
      <div className="h-10 w-2/3 bg-phantom rounded mb-4 animate-pulse" />
      <div className="h-4 w-1/3 bg-phantom rounded mb-10 animate-pulse" />
      <div className="grid grid-cols-4 gap-4">{[1, 2, 3, 4].map(n => <div key={n} className="h-24 bg-phantom rounded-xl animate-pulse" />)}</div>
    </div>
  );

  if (!college) return (
    <div className="max-w-5xl mx-auto px-6 py-24 text-center">
      <div className="w-20 h-20 bg-phantom rounded-2xl flex items-center justify-center text-ink-ghost mx-auto mb-6"><Building size={36} /></div>
      <h2 className="font-display font-bold text-2xl text-ink mb-2">Unknown Entity</h2>
      <p className="text-ink-3 mb-8">&quot;{instcode}&quot; not resolved in the registry.</p>
      <Link href="/explore" className="bg-signal text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-signal-hover transition-colors inline-flex items-center gap-2"><ArrowLeft size={16} /> Back to Index</Link>
    </div>
  );

  const cutoffData = college.branches?.filter((b: any) => b.cutoff_2022 || b.cutoff_2024).map((b: any) => ({ branch: b.branch_code, c2022: b.cutoff_2022, c2024: b.cutoff_2024 })) || [];
  const parseP = (p: string) => { if (!p || p === 'unavailable') return null; const n = parseFloat(p.replace(/[^0-9.]/g, '')); return isNaN(n) ? null : n; };
  const placementData = college.branches?.filter((b: any) => parseP(b.avg_package) || parseP(b.highest_package)).map((b: any) => ({ branch: b.branch_code, avg: parseP(b.avg_package), top: parseP(b.highest_package) })) || [];
  const ttStyle: React.CSSProperties = { borderRadius: '14px', border: '1px solid #e5e7eb', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', fontFamily: 'Inter', fontSize: '12px' };

  const metaCards = [
    { label: 'Type', val: college.type === 'PVT' ? 'Private' : college.type === 'UNIV' ? 'University' : college.type, icon: Building, color: 'text-signal bg-signal/10' },
    { label: 'Affiliation', val: college.affiliation, icon: GraduationCap, color: 'text-processing bg-processing/10' },
    { label: 'Established', val: college.estd, icon: Building, color: 'text-caution bg-caution/10' },
    { label: 'Co-Ed', val: college.coed === 'GIRLS' ? 'Women Only' : 'Co-Education', icon: Users, color: 'text-validated bg-validated/10' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto px-6 py-8">
      <Link href="/explore" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-3 hover:text-signal transition-colors mb-8 group">
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> Institution Index
      </Link>

      {/* Header */}
      <div className="mb-8">

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="font-mono text-xs font-bold text-ink-muted bg-phantom px-2.5 py-1 rounded-lg border border-node-border">{college.instcode}</span>
          {college.coed && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-processing bg-processing/10 px-2.5 py-1 rounded-full border border-processing/20">
              <Users size={10} /> {college.coed === 'GIRLS' ? 'Women Only' : 'Co-Education'}
            </span>
          )}
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-ink mb-3 leading-tight">{college.name}</h1>
        <p className="text-ink-3 text-lg flex items-center gap-2">
          <MapPin size={18} className="text-signal flex-shrink-0" />
          {college.place ? `${college.place}, ` : ''}{college.district} · {college.region}
        </p>
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {metaCards.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-surface border border-node-border rounded-xl p-4 hover:shadow-float transition-shadow">
            <div className={`w-8 h-8 rounded-lg ${m.color} flex items-center justify-center mb-3`}><m.icon size={15} /></div>
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted mb-0.5">{m.label}</p>
            <p className="font-semibold text-ink text-sm">{m.val || '—'}</p>
          </motion.div>
        ))}
      </div>



      {/* Branch Matrix */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <DataNode title="Branch Matrix" icon={<GraduationCap size={18} />} status="validated" summary={<span>{college.branches?.length || 0} branches</span>}>
          <div className="overflow-x-auto mt-4 -mx-5">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="border-b border-node-border bg-canvas/50">
                  <th className="py-3 px-5 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Branch</th>
                  <th className="py-3 px-5 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted text-right">Cut '22</th>
                  <th className="py-3 px-5 text-[9px] font-bold uppercase tracking-[0.15em] text-ink text-right">Cut '24</th>
                  <th className="py-3 px-5 text-[9px] font-bold uppercase tracking-[0.15em] text-validated text-right">Avg Pkg</th>
                  <th className="py-3 px-5 text-[9px] font-bold uppercase tracking-[0.15em] text-signal text-right">Top Pkg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-node-border/50">
                {college.branches?.map((b: any) => {
                  const shift = b.cutoff_2022 && b.cutoff_2024 ? b.cutoff_2022 - b.cutoff_2024 : null;
                  const ShiftIcon = shift && shift > 0 ? TrendingUp : shift && shift < 0 ? TrendingDown : Minus;
                  const shiftColor = shift && shift > 0 ? 'text-validated' : shift && shift < 0 ? 'text-critical' : 'text-ink-muted';
                  return (
                    <tr key={b.branch_code} className="hover:bg-phantom/30 transition-colors group">
                      <td className="py-3.5 px-5">
                        <span className="font-semibold text-ink text-sm group-hover:text-signal transition-colors">{BRANCH_MAP[b.branch_code] || b.branch_code}</span>
                        <span className="block text-[10px] font-mono text-ink-muted">{b.branch_code}</span>
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono text-sm text-ink-3">{b.cutoff_2022?.toLocaleString('en-IN') || '—'}</td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {shift != null && <ShiftIcon size={10} className={shiftColor} />}
                          <span className="font-mono font-bold text-sm text-ink">{b.cutoff_2024?.toLocaleString('en-IN') || '—'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-right text-sm font-semibold text-validated">{b.avg_package && b.avg_package !== 'unavailable' ? b.avg_package : '—'}</td>
                      <td className="py-3.5 px-5 text-right text-sm font-semibold text-signal">{b.highest_package && b.highest_package !== 'unavailable' ? b.highest_package : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DataNode>
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {cutoffData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <DataNode title="Cutoff Trajectory" icon={<TrendingUp size={18} />}>
              <div className="h-[280px] mt-4">
                <ResponsiveContainer>
                  <ComposedChart data={cutoffData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <XAxis dataKey="branch" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} dy={8} />
                    <YAxis hide reversed domain={['auto', 'auto']} />
                    <Tooltip contentStyle={ttStyle} />
                    <Bar dataKey="c2022" fill="#e2e8f0" radius={[6, 6, 6, 6]} barSize={10} name="2022" />
                    <Bar dataKey="c2024" fill="#3b82f6" radius={[6, 6, 6, 6]} barSize={10} name="2024" />
                    <Line type="monotone" dataKey="c2024" stroke="#1d4ed8" strokeWidth={2.5} dot={{ r: 3, fill: '#fff', stroke: '#1d4ed8', strokeWidth: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </DataNode>
          </motion.div>
        )}
        {placementData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <DataNode title="Placement Economics" icon={<IndianRupee size={18} />}>
              <div className="h-[280px] mt-4">
                <ResponsiveContainer>
                  <BarChart data={placementData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <XAxis dataKey="branch" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} dy={8} />
                    <YAxis hide />
                    <Tooltip contentStyle={ttStyle} formatter={(v: any, n: any) => [`₹${v}L`, n === 'avg' ? 'Average' : 'Highest']} />
                    <Bar dataKey="avg" fill="#10b981" radius={[6, 6, 6, 6]} barSize={12} name="avg" />
                    <Bar dataKey="top" fill="#3b82f6" radius={[6, 6, 6, 6]} barSize={12} name="top" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DataNode>
          </motion.div>
        )}
      </div>

      {/* Quick action */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        className="mt-10 p-6 bg-gradient-to-r from-signal/5 to-processing/5 border border-signal/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-bold text-ink mb-1">Check your admission chances</h3>
          <p className="text-ink-3 text-sm">Run a prediction simulation for this institution.</p>
        </div>
        <Link href={`/search?rank=`} className="bg-signal text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-signal-hover transition-colors flex items-center gap-2 flex-shrink-0">
          Open Predictor <ExternalLink size={14} />
        </Link>
      </motion.div>
    </motion.div>
  );
}
