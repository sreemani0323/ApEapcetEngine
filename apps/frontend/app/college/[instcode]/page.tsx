'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const instcode = params.instcode as string;
  const category = searchParams.get('category') || 'OC_BOYS';

  const [college, setCollege] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const fetchSeq = useRef(0);

  useEffect(() => {
    setLoading(true);
    setCollege(null);
    const seq = ++fetchSeq.current;

    (async () => {
      try {
        const { data } = await getCollegeDetail(instcode, category);
        if (seq !== fetchSeq.current) return;
        setCollege(data);
      } catch {
        if (seq !== fetchSeq.current) return;
        toast.error('Failed to resolve institution.');
        setCollege(null);
      } finally {
        if (seq === fetchSeq.current) setLoading(false);
      }
    })();
  }, [instcode, category]);

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto px-6 py-12">
        <motion.div className="h-4 w-20 bg-phantom rounded mb-8 animate-pulse" />
        <motion.div className="h-10 w-2/3 bg-phantom rounded mb-4 animate-pulse" />
        <motion.div className="h-4 w-1/3 bg-phantom rounded mb-10 animate-pulse" />
        <motion.div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => <motion.div key={n} className="h-24 bg-phantom rounded-xl animate-pulse" />)}
        </motion.div>
      </motion.div>
    );
  }

  if (!college) {
    return (
      <motion.div className="max-w-5xl mx-auto px-6 py-24 text-center">
        <motion.div className="w-20 h-20 bg-phantom rounded-2xl flex items-center justify-center text-ink-ghost mx-auto mb-6">
          <Building size={36} />
        </motion.div>
        <h2 className="font-display font-bold text-2xl text-ink mb-2">Unknown Entity</h2>
        <p className="text-ink-3 mb-8">&quot;{instcode}&quot; not resolved in the registry.</p>
        <Link href="/explore" className="bg-signal text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-signal-hover transition-colors inline-flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Index
        </Link>
      </motion.div>
    );
  }

  const cutoffData = college.branches?.filter((b: any) => b.cutoff_2022 || b.cutoff_2024).map((b: any) => ({
    branch: b.branch_code, c2022: b.cutoff_2022, c2024: b.cutoff_2024,
  })) || [];

  const parseP = (p: string) => {
    if (!p || p === 'unavailable') return null;
    const n = parseFloat(p.replace(/[^0-9.]/g, ''));
    return isNaN(n) ? null : n;
  };

  const placementData = college.branches?.filter((b: any) => parseP(b.avg_package) || parseP(b.highest_package)).map((b: any) => ({
    branch: b.branch_code, avg: parseP(b.avg_package), top: parseP(b.highest_package),
  })) || [];

  const ttStyle: React.CSSProperties = {
    borderRadius: '14px', border: '1px solid #e5e7eb',
    boxShadow: '0 8px 24px rgba(0,0,0,0.06)', fontFamily: 'Inter', fontSize: '12px',
  };

  const predictorHref = `/search?rank=${searchParams.get('rank') || ''}&category=${encodeURIComponent(category)}`;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto px-6 py-10">
      <Link href="/explore" className="inline-flex items-center gap-1.5 text-ink-3 hover:text-signal text-sm font-medium mb-6 transition-colors">
        <ArrowLeft size={14} /> Back to Index
      </Link>

      <motion.div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-ink leading-tight mb-2">{college.name}</h1>
        <motion.div className="flex flex-wrap items-center gap-3 text-sm text-ink-3">
          <span className="flex items-center gap-1">
            <MapPin size={13} className="text-signal" />
            {college.district}{college.place ? ` · ${college.place}` : ''}
          </span>
          <span className="font-mono text-xs bg-phantom px-2 py-0.5 rounded-md">{college.instcode}</span>
          {college.type && <span className="text-xs bg-signal/10 text-signal px-2 py-0.5 rounded-full font-semibold">{college.type}</span>}
          {college.category && <span className="text-xs bg-phantom text-ink-3 px-2 py-0.5 rounded-full font-mono">{college.category} cutoffs</span>}
        </motion.div>
      </motion.div>

      <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {[
          { icon: GraduationCap, label: 'Branches', value: college.branches?.length || 0 },
          { icon: Users, label: 'Co-ed', value: college.coed || '—' },
          { icon: Building, label: 'Region', value: college.region || '—' },
          { icon: IndianRupee, label: 'Est.', value: college.estd || '—' },
        ].map((s, i) => (
          <DataNode key={i} delay={0.15 + i * 0.05}>
            <motion.div className="flex items-center gap-2 mb-1">
              <s.icon size={14} className="text-signal" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">{s.label}</span>
            </motion.div>
            <motion.div className="font-display font-bold text-lg text-ink">{s.value}</motion.div>
          </DataNode>
        ))}
      </motion.div>

      <motion.div className="grid lg:grid-cols-2 gap-6 mb-10">
        {cutoffData.length > 0 && (
          <DataNode delay={0.3}>
            <h3 className="font-display font-bold text-ink mb-4 text-sm">Cutoff Trend (2022 → 2024)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={cutoffData}>
                <XAxis dataKey="branch" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={ttStyle} />
                <Line type="monotone" dataKey="c2022" stroke="#94a3b8" strokeWidth={2} dot={false} name="2022" />
                <Line type="monotone" dataKey="c2024" stroke="#6366f1" strokeWidth={2} dot={false} name="2024" />
              </ComposedChart>
            </ResponsiveContainer>
          </DataNode>
        )}
        {placementData.length > 0 && (
          <DataNode delay={0.35}>
            <h3 className="font-display font-bold text-ink mb-4 text-sm">Placement Overview (LPA)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={placementData}>
                <XAxis dataKey="branch" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={ttStyle} />
                <Bar dataKey="avg" fill="#6366f1" name="Avg" radius={[4, 4, 0, 0]} />
                <Bar dataKey="top" fill="#10b981" name="Top" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </DataNode>
        )}
      </motion.div>

      <DataNode delay={0.4}>
        <h3 className="font-display font-bold text-ink mb-4">Branch Matrix</h3>
        <motion.div className="bg-surface border border-node-border rounded-2xl overflow-hidden">
          <motion.div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-node-border bg-phantom/50">
                  <th className="py-3 px-5 text-[9px] font-bold uppercase tracking-[0.15em] text-ink">Branch</th>
                  <th className="py-3 px-5 text-[9px] font-bold uppercase tracking-[0.15em] text-ink text-right">Cut &apos;22</th>
                  <th className="py-3 px-5 text-[9px] font-bold uppercase tracking-[0.15em] text-ink text-right">Cut &apos;24</th>
                  <th className="py-3 px-5 text-[9px] font-bold uppercase tracking-[0.15em] text-validated text-right">Avg Pkg</th>
                  <th className="py-3 px-5 text-[9px] font-bold uppercase tracking-[0.15em] text-signal text-right">Top Pkg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-node-border/50">
                {college.branches?.map((b: any) => {
                  const shift = b.cutoff_2022 && b.cutoff_2024 ? b.cutoff_2022 - b.cutoff_2024 : null;
                  const ShiftIcon = shift && shift > 0 ? TrendingUp : shift && shift < 0 ? TrendingDown : Minus;
                  const shiftColor = shift && shift > 0 ? 'text-critical' : shift && shift < 0 ? 'text-validated' : 'text-ink-muted';
                  return (
                    <tr key={b.branch_code} className="hover:bg-phantom/30 transition-colors group">
                      <td className="py-3.5 px-5">
                        <span className="font-semibold text-ink text-sm group-hover:text-signal transition-colors">
                          {BRANCH_MAP[b.branch_code] || b.branch_code}
                        </span>
                        <span className="block text-[10px] font-mono text-ink-muted">{b.branch_code}</span>
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono text-sm text-ink-3">
                        {b.cutoff_2022?.toLocaleString('en-IN') || '—'}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <motion.div className="flex items-center justify-end gap-1.5">
                          {shift != null && <ShiftIcon size={10} className={shiftColor} />}
                          <span className="font-mono text-sm font-semibold text-ink">
                            {b.cutoff_2024?.toLocaleString('en-IN') || '—'}
                          </span>
                        </motion.div>
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono text-sm text-validated">
                        {b.avg_package && b.avg_package !== 'unavailable' ? b.avg_package : '—'}
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono text-sm text-signal">
                        {b.highest_package && b.highest_package !== 'unavailable' ? b.highest_package : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        </motion.div>
      </DataNode>

      <motion.div className="mt-10 p-6 bg-gradient-to-r from-signal/5 to-processing/5 border border-signal/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <motion.div>
          <h3 className="font-display font-bold text-ink mb-1">Check your admission chances</h3>
          <p className="text-ink-3 text-sm">Run a prediction for this institution ({category}).</p>
        </motion.div>
        <Link href={predictorHref} className="bg-signal text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-signal-hover transition-colors flex items-center gap-2 flex-shrink-0">
          Open Predictor <ExternalLink size={14} />
        </Link>
      </motion.div>
    </motion.div>
  );
}
