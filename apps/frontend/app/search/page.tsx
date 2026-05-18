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
import { SlidersHorizontal, Search, Sparkles, Brain, ChevronDown, Download, FileText } from 'lucide-react';

import { BRANCH_MAP as DL_BRANCH_MAP } from '@/lib/constants';

// ═══ WINDOW_SIZE: Only render this many cards at a time ═══
const WINDOW_SIZE = 20;

// ═══ Download Helpers ═══
function downloadCSV(data: any[]) {
  const headers = ['College Name', 'District', 'Branch', 'Cutoff 2024', 'Probability %', 'Rank Gap', 'Avg Package', 'Top Package'];
  const rows = data.map(c => [
    `"${(c.college_name || '').replace(/"/g, '""')}"`,
    c.district || '',
    DL_BRANCH_MAP[c.branch_code] || c.branch_code || '',
    c.cutoff_rank_2024 ?? '',
    c.probability_percent != null ? c.probability_percent.toFixed(1) : '',
    c.rank_gap ?? '',
    c.avg_package && c.avg_package !== 'unavailable' ? c.avg_package : '',
    c.highest_package && c.highest_package !== 'unavailable' ? c.highest_package : '',
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `eapcet_results_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

function downloadPDF(data: any[]) {
  // Generate a clean printable HTML table and trigger print-to-PDF
  const rows = data.map(c => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:12px">${c.college_name || ''}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:12px">${c.district || ''}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:12px">${DL_BRANCH_MAP[c.branch_code] || c.branch_code || ''}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:center">${c.cutoff_rank_2024?.toLocaleString('en-IN') ?? '—'}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:center;font-weight:bold;color:${
        (c.probability_percent ?? 0) >= 80 ? '#10b981' : (c.probability_percent ?? 0) >= 40 ? '#f59e0b' : '#ef4444'
      }">${c.probability_percent != null ? c.probability_percent.toFixed(1) + '%' : '—'}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><title>EAPCET Results</title></head><body style="font-family:Inter,system-ui,sans-serif;padding:24px;max-width:900px;margin:auto">
    <h1 style="font-size:20px;margin-bottom:4px">EAPCET Intelligence Engine — Search Results</h1>
    <p style="font-size:12px;color:#64748b;margin-bottom:16px">${data.length} colleges · Generated ${new Date().toLocaleDateString('en-IN')}</p>
    <table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f8fafc">
      <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e5e7eb">College</th>
      <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e5e7eb">District</th>
      <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e5e7eb">Branch</th>
      <th style="padding:8px 10px;text-align:center;font-size:11px;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e5e7eb">Cutoff '24</th>
      <th style="padding:8px 10px;text-align:center;font-size:11px;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e5e7eb">Probability</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <p style="font-size:10px;color:#94a3b8;margin-top:16px;text-align:center">© 2026 EAPCET Intelligence Engine · Data: APSCHE</p>
  </body></html>`;

  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); win.print(); }
}

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
  const [sortBy, setSortBy] = useState<'probability' | 'cutoff' | 'name' | 'rank_gap' | 'district' | 'package' | 'random'>('probability');
  const [expandedAdvanced, setExpandedAdvanced] = useState(false);
  const [visibleCount, setVisibleCount] = useState(WINDOW_SIZE);
  // ── Result-level filters ──
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterPackage, setFilterPackage] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const rankInputRef = useRef<HTMLInputElement>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchSeqRef = useRef(0);

  const update = useCallback((k: string, v: string) => {
    setForm(p => ({ ...p, [k]: v }));
  }, []);

  useEffect(() => () => { setTaskState('idle'); }, [setTaskState]);

  // Deep-link: /search?rank=15000 auto-runs search
  useEffect(() => {
    const r = searchParams.get('rank');
    if (r && r !== form.rank) {
      setForm(f => ({ ...f, rank: r }));
    }
  }, [searchParams, form.rank]);

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
      toast.error('Enter your EAPCET rank and/or at least one filter.');
      return;
    }
    if (form.rank) {
      const r = Number(form.rank);
      if (r < 1 || r > 500000) {
        toast.error('Enter a valid rank between 1 and 5,00,000.', { duration: 4000, icon: '⚠️' });
        return;
      }
    }
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    const seq = ++searchSeqRef.current;

    setTaskState('processing');
    setSearched(true);
    setFilter('all');
    setFilterDistrict('');
    setFilterBranch('');
    setFilterPackage('');
    setVisibleCount(WINDOW_SIZE);
    setShuffleSeed(Date.now());
    try {
      const payload: Record<string, unknown> = {};
      if (form.rank) payload.rank = Number(form.rank);
      if (form.caste && form.gender) payload.category = `${form.caste}_${form.gender}`;
      if (form.district) payload.district = form.district;
      if (form.region) payload.region = form.region;
      if (form.branchCode) payload.branchCode = form.branchCode;

      const { data } = await searchColleges(payload);
      if (controller.signal.aborted || seq !== searchSeqRef.current) return;

      setResults(data);
      setTaskState(data.length > 0 ? 'complete' : 'idle');
      if (!data.length) toast('No pathways matched.', { icon: '🔍' });
      else toast.success(`${data.length} projections computed`);
    } catch (err: any) {
      if (controller.signal.aborted || seq !== searchSeqRef.current) return;
      const msg = err?.userMessage || 'Engine disconnected.';
      toast.error(msg);
      setResults([]);
      setTaskState('error');
    }
  }, [form, setTaskState]);

  useEffect(() => {
    const r = searchParams.get('rank');
    if (r && /^\d+$/.test(r)) {
      const timer = setTimeout(() => { handleSearch(); }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('rank')]);

  // ── Unique values for result-level filter dropdowns ──
  const resultDistricts = useMemo(() => [...new Set(results.map(c => c.district).filter(Boolean))].sort(), [results]);
  const resultBranches = useMemo(() => [...new Set(results.map(c => c.branch_code).filter(Boolean))].sort(), [results]);

  // ── Seeded shuffle for deterministic "random" per search ──
  const [shuffleSeed, setShuffleSeed] = useState(0);

  // ── Filtered + sorted results ──
  const filtered = useMemo(() => {
    let arr = results;

    // Probability tier filter
    if (filter === 'safe') arr = arr.filter(c => (c.probability_percent ?? 0) >= 80);
    else if (filter === 'borderline') arr = arr.filter(c => (c.probability_percent ?? 0) >= 40 && (c.probability_percent ?? 0) < 80);
    else if (filter === 'reach') arr = arr.filter(c => (c.probability_percent ?? 0) < 40);

    // Result-level filters
    if (filterDistrict) arr = arr.filter(c => c.district === filterDistrict);
    if (filterBranch) arr = arr.filter(c => c.branch_code === filterBranch);
    if (filterPackage === 'available') arr = arr.filter(c => c.avg_package && c.avg_package !== 'unavailable');
    else if (filterPackage === 'premium') arr = arr.filter(c => {
      if (!c.avg_package || c.avg_package === 'unavailable') return false;
      const val = parseFloat(c.avg_package.replace(/[^0-9.]/g, ''));
      return !isNaN(val) && val >= 5;
    });

    // Sort
    if (sortBy === 'random') {
      // Fisher-Yates shuffle with seed for consistency
      const shuffled = [...arr];
      let seed = shuffleSeed || Date.now();
      const rng = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }

    return [...arr].sort((a, b) => {
      if (sortBy === 'probability') return (b.probability_percent ?? 0) - (a.probability_percent ?? 0);
      if (sortBy === 'cutoff') return (a.cutoff_rank_2024 ?? 999999) - (b.cutoff_rank_2024 ?? 999999);
      if (sortBy === 'rank_gap') return (b.rank_gap ?? -999999) - (a.rank_gap ?? -999999);
      if (sortBy === 'district') return (a.district || '').localeCompare(b.district || '');
      if (sortBy === 'package') {
        const parseP = (s: string | null) => { if (!s || s === 'unavailable') return 0; return parseFloat(s.replace(/[^0-9.]/g, '')) || 0; };
        return parseP(b.avg_package) - parseP(a.avg_package);
      }
      return (a.college_name || '').localeCompare(b.college_name || '');
    });
  }, [results, filter, sortBy, filterDistrict, filterBranch, filterPackage, shuffleSeed]);

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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
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
                  className="bg-surface rounded-2xl border border-node-border shadow-float overflow-hidden">
                  {/* Top row: count + sort + downloads */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <span className="font-display font-bold text-xl text-ink">{filtered.length}</span>
                      <span className="text-ink-3 text-sm font-medium">results</span>
                      {rankTier && <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${tierMessages[rankTier].color}`}>{tierMessages[rankTier].label}</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <FilterBar colleges={filtered} activeFilter={filter} onFilterChange={setFilter} />
                      <button onClick={() => setShowFilters(f => !f)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                          showFilters || filterDistrict || filterBranch || filterPackage
                            ? 'bg-signal/10 text-signal border-signal/30'
                            : 'bg-phantom text-ink-3 border-node-border hover:border-ink-ghost'
                        }`}>
                        <SlidersHorizontal size={12} />
                        Filters
                        {(filterDistrict || filterBranch || filterPackage) && (
                          <span className="w-4 h-4 rounded-full bg-signal text-white text-[9px] flex items-center justify-center font-bold">
                            {[filterDistrict, filterBranch, filterPackage].filter(Boolean).length}
                          </span>
                        )}
                      </button>
                      <select value={sortBy} onChange={e => { setSortBy(e.target.value as any); if (e.target.value === 'random') setShuffleSeed(Date.now()); }}
                        className="text-xs font-semibold bg-phantom text-ink-2 px-3 py-1.5 rounded-full border border-node-border cursor-pointer outline-none">
                        <option value="probability">Probability ↓</option>
                        <option value="cutoff">Cutoff ↑</option>
                        <option value="name">Name A-Z</option>
                        <option value="rank_gap">Rank Gap ↓</option>
                        <option value="district">District A-Z</option>
                        <option value="package">Package ↓</option>
                        <option value="random">🎲 Shuffle</option>
                      </select>
                      <button onClick={() => downloadCSV(filtered)} title="Download CSV"
                        className="p-1.5 bg-phantom border border-node-border rounded-full text-ink-3 hover:text-validated hover:border-validated/30 transition-all cursor-pointer">
                        <Download size={14} />
                      </button>
                      <button onClick={() => downloadPDF(filtered)} title="Download PDF"
                        className="p-1.5 bg-phantom border border-node-border rounded-full text-ink-3 hover:text-signal hover:border-signal/30 transition-all cursor-pointer">
                        <FileText size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Expandable filter row */}
                  <AnimatePresence>
                    {showFilters && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-1 border-t border-node-border/50 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                          <select value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)}
                            className="liquid-input py-2 text-xs w-full sm:w-40">
                            <option value="">All Districts</option>
                            {resultDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                          <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
                            className="liquid-input py-2 text-xs w-full sm:w-40">
                            <option value="">All Branches</option>
                            {resultBranches.map(b => <option key={b} value={b}>{BRANCH_MAP[b] || b}</option>)}
                          </select>
                          <select value={filterPackage} onChange={e => setFilterPackage(e.target.value)}
                            className="liquid-input py-2 text-xs w-full sm:w-40">
                            <option value="">Any Package</option>
                            <option value="available">Has Package Data</option>
                            <option value="premium">₹5+ LPA Only</option>
                          </select>
                          {(filterDistrict || filterBranch || filterPackage) && (
                            <button onClick={() => { setFilterDistrict(''); setFilterBranch(''); setFilterPackage(''); }}
                              className="text-xs font-semibold text-critical hover:text-critical/80 px-3 py-2 cursor-pointer whitespace-nowrap">
                              Clear All
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}



              <div className="space-y-3">
                {isProcessing ? (
                  Array.from({ length: 3 }).map((_, n) => (
                    <div key={n} className="bg-surface border border-node-border rounded-2xl p-6 flex gap-5 animate-pulse">
                      <div className="w-16 h-16 rounded-full bg-phantom flex-shrink-0 hidden sm:block" />
                      <div className="flex-1">
                        <div className="h-5 w-3/5 bg-phantom rounded mb-3" />
                        <div className="h-3 w-2/5 bg-phantom rounded mb-5" />
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[1, 2, 3, 4].map(k => <div key={k} className="h-10 bg-phantom rounded-lg" />)}</div>
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
