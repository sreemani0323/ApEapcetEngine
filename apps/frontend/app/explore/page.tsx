'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { exploreColleges } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Building, ArrowRight, Grid3X3, List, SlidersHorizontal, ExternalLink } from 'lucide-react';
import { DISTRICTS, COLLEGE_TYPE_MAP, AFFILIATION_MAP } from '@/lib/constants';

function ExploreContent() {
  const searchParams = useSearchParams();
  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [district, setDistrict] = useState('');
  const [type, setType] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (district) params.district = district;
        if (type) params.type = type;
        if (affiliation) params.affiliation = affiliation;
        const { data } = await exploreColleges(params);
        setColleges(data);
      } catch {
        toast.error('Failed to load institutions');
        setColleges([]);
      } finally { setLoading(false); }
    })();
  }, [district, type, affiliation]);

  const filtered = useMemo(() => {
    return [...colleges].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
  }, [colleges]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="text-center mb-10 max-w-2xl mx-auto">
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-ink mb-4">Institution Index</h1>
        <p className="text-ink-3 text-lg">Verified registry of AP EAPCET engineering institutions.</p>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-node-border rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center mb-6 shadow-float">
        <select value={district} onChange={e => setDistrict(e.target.value)} className="liquid-input py-2.5 text-sm w-full sm:w-44">
          <option value="">All Districts</option>
          {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={type} onChange={e => setType(e.target.value)} className="liquid-input py-2.5 text-sm w-full sm:w-44">
          <option value="">All Types</option>
          {Object.entries(COLLEGE_TYPE_MAP).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>
        <select value={affiliation} onChange={e => setAffiliation(e.target.value)} className="liquid-input py-2.5 text-sm w-full sm:w-52">
          <option value="">All Affiliations</option>
          {Object.entries(AFFILIATION_MAP).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>
        <div className="hidden md:flex items-center gap-1 bg-phantom rounded-lg p-0.5 border border-node-border">
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md cursor-pointer ${viewMode === 'grid' ? 'bg-surface shadow-float text-signal' : 'text-ink-muted'}`}><Grid3X3 size={14} /></button>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-md cursor-pointer ${viewMode === 'list' ? 'bg-surface shadow-float text-signal' : 'text-ink-muted'}`}><List size={14} /></button>
        </div>
      </div>

      <p className="text-sm text-ink-3 font-medium mb-5"><span className="font-mono font-bold text-signal">{filtered.length}</span> institutions indexed</p>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface border border-node-border rounded-2xl p-5 animate-pulse">
              <div className="h-4 w-1/4 bg-phantom rounded mb-3" />
              <div className="h-5 w-3/4 bg-phantom rounded mb-2" />
              <div className="h-3 w-1/2 bg-phantom rounded mb-4" />
              <div className="flex gap-2"><div className="h-7 w-16 bg-phantom rounded" /><div className="h-7 w-16 bg-phantom rounded" /></div>
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        viewMode === 'grid' ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c: any, i: number) => (
              <div key={c.instcode}>
                <Link href={`/college/${c.instcode}`}
                  className="group bg-surface border border-node-border rounded-2xl p-5 hover:border-signal/20 hover:shadow-lifted transition-all relative block">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-ink-muted bg-phantom px-2 py-0.5 rounded">{COLLEGE_TYPE_MAP[c.type] || c.type}</span>
                  </div>
                  <h3 className="font-display font-bold text-ink text-sm leading-tight mb-1.5 group-hover:text-signal transition-colors">{c.name}</h3>
                  <p className="text-xs text-ink-3 flex items-center gap-1 mb-4">
                    <MapPin size={11} className="text-ink-muted" /> {c.district}
                    <a
                      href={`https://www.google.com/maps/search/${encodeURIComponent((c.name || '') + ', ' + (c.district || '') + ', Andhra Pradesh')}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="ml-1 text-signal/60 hover:text-signal transition-colors"
                      title="View on Google Maps"
                    >
                      <ExternalLink size={10} />
                    </a>
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs pt-3 border-t border-node-border/50">
                    {c.type && <Stat label="Type" value={COLLEGE_TYPE_MAP[c.type] || c.type} />}
                    {c.branch_count && <Stat label="Branches" value={c.branch_count} />}
                    {c.avg_package && c.avg_package !== 'unavailable' && <Stat label="Avg Pkg" value={c.avg_package} />}
                  </div>
                  <ArrowRight size={14} className="absolute right-4 bottom-4 text-signal opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                </Link>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            {filtered.map((c: any, i: number) => (
              <Link key={c.instcode} href={`/college/${c.instcode}`}
                className="group flex items-center gap-4 bg-surface border border-node-border rounded-xl p-4 hover:border-signal/20 hover:shadow-node transition-all">
                <span className="font-mono text-[10px] font-bold text-ink-muted bg-phantom px-2 py-1 rounded min-w-[60px] text-center group-hover:text-signal group-hover:bg-signal/10 transition-colors">{COLLEGE_TYPE_MAP[c.type] || c.type}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-ink text-sm truncate group-hover:text-signal transition-colors">{c.name}</h3>
                  <p className="text-xs text-ink-3 flex items-center gap-1">
                    <MapPin size={10} /> {c.district}
                    <a
                      href={`https://www.google.com/maps/search/${encodeURIComponent((c.name || '') + ', ' + (c.district || '') + ', Andhra Pradesh')}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="ml-1 text-signal/60 hover:text-signal transition-colors"
                      title="View on Google Maps"
                    >
                      <ExternalLink size={10} />
                    </a>
                  </p>
                </div>
                <div className="hidden md:flex items-center gap-6 text-xs">
                  {c.branch_count && <Stat label="Branches" value={c.branch_count} />}
                  {c.avg_package && c.avg_package !== 'unavailable' && <Stat label="Avg Pkg" value={c.avg_package} />}
                </div>
                <ArrowRight size={14} className="text-ink-ghost group-hover:text-signal transition-colors flex-shrink-0" />
              </Link>
            ))}
          </motion.div>
        )
      ) : (
        <div className="py-20 text-center">
          <Building size={32} className="text-ink-ghost mx-auto mb-4" />
          <h3 className="font-display font-bold text-xl text-ink">No Match</h3>
          <p className="text-ink-3 mt-1">Adjust filters to see more.</p>
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return <Suspense fallback={<div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-signal/20 border-t-signal rounded-full animate-spin" /></div>}><ExploreContent /></Suspense>;
}

function Stat({ label, value }: { label: string; value: any }) {
  return <div><span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-ink-muted">{label}</span><span className="font-semibold text-ink-2">{value}</span></div>;
}
