'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getDashboardStats, getDistrictSummary } from '@/lib/api';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Building, TrendingUp, Calculator, Database, MapPin, ArrowRight } from 'lucide-react';
import { DataNode } from '@/components/liquid/data-node';

export default function HomePage() {
  const [stats, setStats] = useState<any>(null);
  const [districts, setDistricts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, d] = await Promise.all([
          getDashboardStats().catch(() => ({ data: null })),
          getDistrictSummary().catch(() => ({ data: [] })),
        ]);
        setStats(s.data);
        setDistricts([...(d.data || [])].sort((a: any, b: any) => b.college_count - a.college_count));
      } finally { setLoading(false); }
    })();
  }, []);

  // Predictive prefetch on hover
  const prefetch = useCallback((href: string) => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    if (!document.querySelector(`link[href="${href}"]`)) document.head.appendChild(link);
  }, []);

  const c = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
  const i = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100, damping: 14 } } };

  const tools = [
    { href: '/search', icon: Search, title: 'Rank Predictor', desc: 'ML-powered admission probability simulation across all institutions.', gradient: 'from-blue-500/10 to-indigo-500/10', border: 'hover:border-blue-300', iconBg: 'bg-blue-500/10 text-blue-600', tag: 'AI-Powered' },
    { href: '/explore', icon: Building, title: 'Institution Index', desc: 'Searchable registry of 200+ engineering colleges with metadata.', gradient: 'from-violet-500/10 to-purple-500/10', border: 'hover:border-violet-300', iconBg: 'bg-violet-500/10 text-violet-600', tag: 'Database' },
    { href: '/analytics', icon: TrendingUp, title: 'Market Trends', desc: 'Cutoff velocity, placement economics, and competition analysis.', gradient: 'from-emerald-500/10 to-teal-500/10', border: 'hover:border-emerald-300', iconBg: 'bg-emerald-500/10 text-emerald-600', tag: 'Analytics' },
    { href: '/calculator', icon: Calculator, title: 'Reverse Matrix', desc: 'Target a probability threshold — engine solves for required rank.', gradient: 'from-amber-500/10 to-orange-500/10', border: 'hover:border-amber-300', iconBg: 'bg-amber-500/10 text-amber-600', tag: 'Solver' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Hero */}
      <motion.div initial="hidden" animate="visible" variants={c} className="flex flex-col items-center text-center mb-20 pt-8">
        <motion.div variants={i} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-signal text-sm font-semibold rounded-full border border-blue-100 mb-8">
          <motion.div className="w-2 h-2 rounded-full bg-validated" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
          AP EAPCET 2024 · Live Data
        </motion.div>
        <motion.h1 variants={i} className="font-display text-5xl md:text-[3.5rem] font-extrabold tracking-tight text-ink mb-6 leading-[1.08] max-w-3xl">
          Your Rank. Your Seat.<br />
          <span className="relative">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500">Predicted in Seconds.</span>
            <motion.span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-600 to-violet-500 rounded-full" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.8, duration: 0.6 }} />
          </span>
        </motion.h1>
        <motion.p variants={i} className="text-lg text-ink-3 max-w-xl leading-relaxed">
          Multi-year cutoff analysis. Use the tools below to find your best-fit college.
        </motion.p>
      </motion.div>

      {/* Metrics Strip */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="flex flex-wrap justify-center gap-3 mb-16">
        <MetricPill icon={<Building size={15} />} value={stats?.total_colleges} label="Institutions" loading={loading} />
        <MetricPill icon={<Database size={15} />} value={stats?.total_cutoff_records} label="Data Points" loading={loading} suffix="+" />
        <MetricPill icon={<MapPin size={15} />} value={stats?.districts_covered} label="Districts" loading={loading} />
        <MetricPill icon={<TrendingUp size={15} />} value={stats?.categories_available} label="Categories" loading={loading} />
      </motion.div>

      {/* Tool Grid — Elite Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
        {tools.map((tool, idx) => (
          <motion.div key={tool.href} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + idx * 0.08 }}>
            <Link href={tool.href}
              onMouseEnter={() => { setHoveredTool(tool.href); prefetch(tool.href); }}
              onMouseLeave={() => setHoveredTool(null)}
              className={`group relative bg-surface border border-node-border rounded-2xl p-6 ${tool.border} hover:shadow-lifted transition-all duration-300 block overflow-hidden`}>
              {/* Gradient glow on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${tool.iconBg} group-hover:scale-110 transition-transform duration-300`}>
                    <tool.icon size={22} />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted bg-phantom px-2 py-1 rounded-md">{tool.tag}</span>
                </div>
                <h3 className="font-display font-bold text-lg text-ink mb-1.5 group-hover:text-ink transition-colors">{tool.title}</h3>
                <p className="text-sm text-ink-3 leading-relaxed mb-4">{tool.desc}</p>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-signal opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-4px] group-hover:translate-x-0">
                  Launch <ArrowRight size={12} />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* District Density Chart */}
      {!loading && districts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <DataNode title="Regional Density" icon={<MapPin size={18} />} status="validated" summary={<span>{districts.length} districts</span>}>
            <div className="h-[220px] w-full mt-4">
              <ResponsiveContainer>
                <AreaChart data={districts} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="district" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} dy={8} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '14px', border: '1px solid #e5e7eb', boxShadow: '0 8px 32px rgba(0,0,0,0.06)', fontFamily: 'Inter', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="college_count" stroke="#2563eb" strokeWidth={2.5} fill="url(#grd)" animationDuration={1200}
                    activeDot={{ r: 5, strokeWidth: 0, fill: '#2563eb' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </DataNode>
        </motion.div>
      )}

      {/* Trust signals */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        className="flex flex-wrap justify-center gap-3 mt-16 mb-4">
        {['200+ Institutions', '25 Districts', '2022–2024 Cutoff Data', 'ML Predictions', 'Source: APSCHE'].map(t => (
          <span key={t} className="px-3 py-1.5 bg-phantom/70 text-ink-muted text-[10px] font-bold uppercase tracking-widest rounded-lg border border-node-border/50">{t}</span>
        ))}
      </motion.div>
    </div>
  );
}

function MetricPill({ icon, value, label, loading, suffix = '' }: any) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 bg-surface rounded-2xl border border-node-border shadow-float hover:shadow-node transition-shadow group">
      <div className="text-signal group-hover:scale-110 transition-transform">{icon}</div>
      <div>
        <div className="font-mono font-bold text-lg text-ink leading-none">
          {loading ? <div className="h-5 w-14 skeleton rounded" /> : <>{value?.toLocaleString('en-IN')}{suffix}</>}
        </div>
        <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted mt-0.5">{label}</div>
      </div>
    </div>
  );
}
