'use client';

import { useState, useMemo, useEffect, useCallback, useRef, memo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { searchColleges } from '@/lib/api';
import { CollegeCard } from '@/components/college-card';
import { FilterBar } from '@/components/filter-bar';
import { GhostPanel } from '@/components/liquid/ghost-panel';
import { BRANCH_MAP, CATEGORIES, GENDERS, REGIONS, DISTRICTS } from '@/lib/constants';
import { useAppStore } from '@/stores/app-store';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, Search, Sparkles, Brain, ChevronDown } from 'lucide-react';



// ═══ WINDOW_SIZE: Only render this many cards at a time ═══
const WINDOW_SIZE = 20;

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { taskState, setTaskState } = useAppStore();

  // ── Stable form state (no re-render cascade) ──
  const [form, setForm] = useState({
    rank: searchParams.get('rank') || '', caste: 'OC', gender: 'BOYS', district: '', region: '', branchCode: ''
  });
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'probability' | 'cutoff' | 'name'>('probability');
  const [expandedAdvanced, setExpandedAdvanced] = useState(false);
  const [visibleCount, setVisibleCount] = useState(WINDOW_SIZE);

  // ── FIX #1: useRef for rank input to prevent focus hijacking ──
  const rankInputRef = useRef<HTMLInputElement>(null);

  const update = useCallback((k: string, v: string) => {
    setForm(p => ({ ...p, [k]: v }));
  }, []);

  // Auto-trigger search if rank param present
  useEffect(() => {
    const r = searchParams.get('rank');
    if (r && r !== form.rank) {
      setForm(f => ({ ...f, rank: r }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ── Rank tier detection (memoized, non-blocking) ──
  const rankTier = useMemo(() => {
    const r = Number(form.rank);
    if (!r) return null;
    if (r <= 5000) return 'elite';
    if (r <= 25000) return 'competitive';
    if (r <= 60000) return 'moderate';
    return 'broad';
  }, [form.rank]);

  const tierMessages: Record<string, { label: string; color: string; desc: string }> = {
    elite: { label: 'Elite Tier', color: 'text-validated bg-validated/10 border-validated/20', desc: 'Top institutions within range.' },
    competitive: { label: 'Competitive', color: 'text-signal bg-signal/10 border-signal/20', desc: 'Strong positioning across Tier-1 and Tier-2.' },
    moderate: { label: 'Moderate', color: 'text-caution bg-caution/10 border-caution/20', desc: 'Diverse options available across regions.' },
    broad: { label: 'Broad Search', color: 'text-ink-3 bg-phantom border-node-border', desc: 'Wide coverage. Consider branch flexibility.' },
  };

  // ── Optimistic metadata while user types ──
  const rankMeta = useMemo(() => {
    const r = Number(form.rank);
    if (!r) return null;
    const percentile = r <= 1000 ? 'Top 0.5%' : r <= 5000 ? 'Top 2.5%' : r <= 15000 ? 'Top 7%' : r <= 50000 ? 'Top 25%' : 'Top 50%+';
    return { percentile };
  }, [form.rank]);

  const handleSearch = useCallback(async () => {
    if (!form.rank && !form.district && !form.branchCode) {
      toast.error('Configure at least one parameter.');
      return;
    }
    setTaskState('processing');
    setSearched(true);
    setFilter('all');
    setVisibleCount(WINDOW_SIZE);
    try {
      const payload: any = {};
      if (form.rank) payload.rank = Number(form.rank);
      if (form.caste && form.gender) payload.category = `${form.caste}_${form.gender}`;
      if (form.district) payload.district = form.district;
      if (form.region) payload.region = form.region;
      if (form.branchCode) payload.branchCode = form.branchCode;

      const { data } = await searchColleges(payload);
      setResults(data);
      setTaskState(data.length > 0 ? 'complete' : 'idle');
      if (!data.length) toast('No pathways matched.', { icon: '🔍' });
      else toast.success(`${data.length} projections computed`);
    } catch (err: any) {
      const msg = err?.userMessage || 'Engine disconnected.';
      toast.error(msg);
      setResults([]);
      setTaskState('error');
    }
  }, [form, setTaskState]);

  // ── Filtered + sorted results ──
  const filtered = useMemo(() => {
    let arr = results;
    if (filter === 'safe') arr = arr.filter(c => c.probability_percent >= 80);
    else if (filter === 'borderline') arr = arr.filter(c => c.probability_percent >= 40 && c.probability_percent < 80);
    else if (filter === 'reach') arr = arr.filter(c => c.probability_percent < 40);
    return [...arr].sort((a, b) => {
      if (sortBy === 'probability') return (b.probability_percent ?? 0) - (a.probability_percent ?? 0);
      if (sortBy === 'cutoff') return (a.cutoff_rank_2024 ?? 999999) - (b.cutoff_rank_2024 ?? 999999);
      return (a.college_name || '').localeCompare(b.college_name || '');
    });
  }, [results, filter, sortBy]);

  // ── Windowed slice ──
  const visibleResults = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  // ── Load more on scroll near bottom ──
  useEffect(() => {
    if (!hasMore) return;
    const handler = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 600) {
        setVisibleCount(c => Math.min(c + WINDOW_SIZE, filtered.length));
      }
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [hasMore, filtered.length]);

  const isProcessing = taskState === 'processing';

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex gap-6">
        {/* Desktop sidebar */}
        <div className="w-[320px] flex-shrink-0 hidden lg:block">
          <div className="sticky top-6 bg-surface border border-node-border rounded-2xl p-5 shadow-node">
            <h2 className="font-display font-bold text-lg text-ink flex items-center gap-2 mb-6">
              <SlidersHorizontal size={18} className="text-signal" /> Parameters
              {isProcessing && <motion.div className="w-2 h-2 bg-processing rounded-full" animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} />}
            </h2>
            <FormFields
              form={form}
              update={update}
              rankInputRef={rankInputRef}
              rankTier={rankTier}
              rankMeta={rankMeta}
              tierMessages={tierMessages}
              expandedAdvanced={expandedAdvanced}
              setExpandedAdvanced={setExpandedAdvanced}
              handleSearch={handleSearch}
              isProcessing={isProcessing}
            />
          </div>
        </div>

        {/* Main canvas */}
        <div className="flex-1 min-w-0">
          <div className="lg:hidden mb-4">
            <GhostPanel side="left" triggerLabel="Parameters" triggerIcon={<SlidersHorizontal size={16} />}>
              <FormFields
                form={form}
                update={update}
                rankInputRef={rankInputRef}
                rankTier={rankTier}
                rankMeta={rankMeta}
                tierMessages={tierMessages}
                expandedAdvanced={expandedAdvanced}
                setExpandedAdvanced={setExpandedAdvanced}
                handleSearch={handleSearch}
                isProcessing={isProcessing}
              />
            </GhostPanel>
          </div>

          {searched ? (
            <div className="space-y-5">
              {results.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-surface rounded-2xl border border-node-border shadow-float">
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-xl text-ink">{filtered.length}</span>
                    <span className="text-ink-3 text-sm font-medium">results</span>
                    {rankTier && <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${tierMessages[rankTier].color}`}>{tierMessages[rankTier].label}</span>}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <FilterBar colleges={results} activeFilter={filter} onFilterChange={setFilter} />
                    <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                      className="text-xs font-semibold bg-phantom text-ink-2 px-3 py-1.5 rounded-full border border-node-border cursor-pointer outline-none">
                      <option value="probability">Probability ↓</option>
                      <option value="cutoff">Cutoff ↑</option>
                      <option value="name">Name A-Z</option>
                    </select>
                  </div>
                </motion.div>
              )}



              <div className="space-y-3">
                {isProcessing ? (
                  Array.from({ length: 3 }).map((_, n) => (
                    <div key={n} className="bg-surface border border-node-border rounded-2xl p-6 flex gap-5 animate-pulse">
                      <div className="w-16 h-16 rounded-full bg-phantom flex-shrink-0" />
                      <div className="flex-1">
                        <div className="h-5 w-3/5 bg-phantom rounded mb-3" />
                        <div className="h-3 w-2/5 bg-phantom rounded mb-5" />
                        <div className="grid grid-cols-4 gap-3">{[1, 2, 3, 4].map(k => <div key={k} className="h-10 bg-phantom rounded-lg" />)}</div>
                      </div>
                    </div>
                  ))
                ) : visibleResults.length > 0 ? (
                  <>
                    {visibleResults.map((c: any, i: number) => (
                      <div key={`${c.instcode}-${c.branch_code}-${i}`}>
                        <CollegeCard college={c} />
                      </div>
                    ))}
                    {hasMore && (
                      <div className="flex justify-center py-4">
                        <button onClick={() => setVisibleCount(c => Math.min(c + WINDOW_SIZE, filtered.length))}
                          className="px-6 py-2.5 bg-phantom border border-node-border rounded-xl text-xs font-bold text-ink-3 hover:bg-surface hover:border-signal/30 transition-all cursor-pointer">
                          Show {Math.min(WINDOW_SIZE, filtered.length - visibleCount)} More
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <Empty icon="🧠" title="No Viable Paths" desc="Parameters yielded no admission routes in historic data." />
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl flex items-center justify-center text-signal mb-6 border border-blue-100">
                <Search size={36} />
              </div>
              <h3 className="font-display font-bold text-2xl text-ink mb-2">Navigate Your Future</h3>
              <p className="text-ink-3 max-w-md leading-relaxed">Data-driven college admissions. Set parameters to simulate admission probabilities across institutions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══ FIX #1: Memoized FormFields — prevents parent re-renders from stealing rank input focus ═══
const FormFields = memo(function FormFields({
  form, update, rankInputRef, rankTier, rankMeta, tierMessages, expandedAdvanced, setExpandedAdvanced, handleSearch, isProcessing,
}: {
  form: any; update: (k: string, v: string) => void; rankInputRef: React.RefObject<HTMLInputElement | null>;
  rankTier: string | null; rankMeta: any; tierMessages: any;
  expandedAdvanced: boolean; setExpandedAdvanced: (v: boolean) => void;
  handleSearch: () => void; isProcessing: boolean;
}) {
  return (
    <div className="space-y-4">
      <Field label="Your EAPCET Rank">
        <input ref={rankInputRef} type="number" inputMode="numeric" placeholder="e.g. 15000"
          value={form.rank} onChange={e => update('rank', e.target.value)}
          className="liquid-input font-mono text-lg font-bold" />
        {rankMeta && (
          <span className="text-[10px] text-ink-muted font-semibold mt-1 block">{rankMeta.percentile} of candidates</span>
        )}
      </Field>

      {/* Tier indicator — no AnimatePresence to prevent focus steal */}
      {rankTier && (
        <div className={`p-3 rounded-xl border text-xs font-semibold transition-all duration-200 ${tierMessages[rankTier].color}`}>
          <div className="flex items-center gap-1.5 mb-0.5">
            <Brain size={12} /> {tierMessages[rankTier].label}
          </div>
          <p className="font-normal opacity-80">{tierMessages[rankTier].desc}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <select value={form.caste} onChange={e => update('caste', e.target.value)} className="liquid-input text-sm">
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, '-')}</option>)}
          </select>
        </Field>
        <Field label="Gender">
          <select value={form.gender} onChange={e => update('gender', e.target.value)} className="liquid-input text-sm">
            {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Branch">
        <select value={form.branchCode} onChange={e => update('branchCode', e.target.value)} className="liquid-input text-sm">
          <option value="">Any Branch</option>
          {Object.entries(BRANCH_MAP).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </select>
      </Field>



      {/* Advanced toggle */}
      <button type="button" onClick={() => setExpandedAdvanced(!expandedAdvanced)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-widest text-ink-muted hover:text-ink-2 transition-colors cursor-pointer">
        Advanced Filters
        <ChevronDown size={14} className={`transition-transform ${expandedAdvanced ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {expandedAdvanced && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-3" layout={false}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Affiliation">
                <select value={form.region} onChange={e => update('region', e.target.value)} className="liquid-input text-sm">
                  <option value="">Any</option>
                  {REGIONS.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
                </select>
              </Field>
              <Field label="District">
                <select value={form.district} onChange={e => update('district', e.target.value)} className="liquid-input text-sm">
                  <option value="">Any</option>
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button onClick={handleSearch} disabled={isProcessing}
        className="w-full py-3.5 bg-gradient-to-r from-signal to-indigo-600 text-white rounded-xl font-semibold hover:from-signal-hover hover:to-indigo-700 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-signal/20 hover:shadow-signal/30">
        {isProcessing ? <><Spinner /> Computing...</> : <><Sparkles size={16} /> Find Colleges</>}
      </button>
      <p className="text-[10px] text-center text-ink-ghost font-medium">Blended 2022 + 2024 cutoff model</p>
    </div>
  );
});

export default function SearchPage() {
  return <Suspense fallback={<div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-signal/20 border-t-signal rounded-full animate-spin" /></div>}><SearchContent /></Suspense>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-1.5">{label}</label>{children}</div>;
}
function Spinner() { return <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />; }
function Empty({ icon, title, desc }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 bg-phantom rounded-2xl flex items-center justify-center text-ink-ghost text-3xl mb-6">{icon}</div>
      <h3 className="font-display font-bold text-xl text-ink mb-2">{title}</h3>
      <p className="text-ink-3 max-w-sm">{desc}</p>
    </div>
  );
}
