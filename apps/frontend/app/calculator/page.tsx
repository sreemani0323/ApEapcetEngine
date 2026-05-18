'use client';

import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { reverseCalculate, getCollegeBranches } from '@/lib/api';
import { BRANCH_MAP, AFFILIATION_MAP, CATEGORIES, GENDERS } from '@/lib/constants';
import { SmartAutocomplete } from '@/components/smart-autocomplete';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Sparkles, Crosshair, HelpCircle, Check, Brain } from 'lucide-react';
import { DataNode } from '@/components/liquid/data-node';

// ═══ FIX: Each result card is a fully isolated component ═══
// Historical results do NOT react to current slider changes.

interface ReverseResult {
  id: string; // unique key per computation
  college_name: string;
  branch_code: string;
  predicted_cutoff: number;
  desired_probability: number;
  required_rank: number;
  frozenColor: { text: string; fill: string; bg: string }; // frozen at compute-time
}

function probColor(p: number) {
  if (p >= 85) return { text: 'text-validated', fill: '#10b981', bg: 'from-emerald-500 to-teal-600' };
  if (p >= 60) return { text: 'text-signal', fill: '#2563eb', bg: 'from-blue-500 to-indigo-600' };
  if (p >= 40) return { text: 'text-caution', fill: '#f59e0b', bg: 'from-amber-500 to-orange-600' };
  return { text: 'text-critical', fill: '#ef4444', bg: 'from-red-500 to-rose-600' };
}

export default function CalculatorPage() {
  const [form, setForm] = useState({
    instcode: '', collegeName: '', branch_code: '', caste: 'OC', gender: 'BOYS', desired_probability: 80,
  });
  const [results, setResults] = useState<ReverseResult[]>([]); // history stack
  const [isProcessing, setIsProcessing] = useState(false);
  const [collegeBranches, setCollegeBranches] = useState<string[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);

  const update = useCallback((k: string, v: any) => {
    setForm(p => ({ ...p, [k]: v }));
  }, []);

  useEffect(() => {
    if (!form.instcode) {
      setCollegeBranches([]);
      setForm(p => (p.branch_code ? { ...p, branch_code: '' } : p));
      return;
    }

    let cancelled = false;
    setBranchesLoading(true);

    (async () => {
      try {
        const { data } = await getCollegeBranches(form.instcode);
        if (cancelled) return;
        const codes = (data as { branch_code: string }[])
          .map(b => b.branch_code)
          .filter(Boolean)
          .sort();
        setCollegeBranches(codes);
        setForm(p => ({
          ...p,
          branch_code: codes.includes(p.branch_code) ? p.branch_code : '',
        }));
      } catch {
        if (cancelled) return;
        setCollegeBranches([]);
        setForm(p => ({ ...p, branch_code: '' }));
        toast.error('Could not load branches for this college.');
      } finally {
        if (!cancelled) setBranchesLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [form.instcode]);

  const currentColor = probColor(form.desired_probability);

  const handleCalc = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    if (!form.instcode || !form.branch_code) {
      toast.error('Select a college and branch.');
      return;
    }
    setIsProcessing(true);
    try {
      const { data } = await reverseCalculate({
        instcode: form.instcode.trim().toUpperCase(),
        branch_code: form.branch_code,
        category: `${form.caste}_${form.gender}`,
        desired_probability: Number(form.desired_probability),
      });
      // FIX: Freeze the color at the time of computation
      const frozen: ReverseResult = {
        id: `${form.instcode}-${form.branch_code}-${form.desired_probability}-${Date.now()}`,
        college_name: data.college_name,
        branch_code: data.branch_code,
        predicted_cutoff: data.predicted_cutoff,
        desired_probability: data.desired_probability,
        required_rank: data.required_rank,
        frozenColor: probColor(data.desired_probability),
      };
      setResults(prev => [frozen, ...prev]); // newest first
      toast.success('Projection complete');
    } catch (err: any) {
      toast.error(err?.userMessage || 'Projection failed.');
    } finally {
      setIsProcessing(false);
    }
  }, [form]);

  const presets = [
    { val: 50, label: 'Moderate' },
    { val: 70, label: 'Likely' },
    { val: 80, label: 'Safe' },
    { val: 90, label: 'Very Safe' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="text-center mb-12 max-w-2xl mx-auto">
        <div className="w-14 h-14 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl flex items-center justify-center text-amber-600 mx-auto mb-5 border border-amber-100">
          <Calculator size={28} />
        </div>
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-ink mb-4">Reverse Calculator</h1>
        <p className="text-ink-3 text-lg">Target a probability. The engine solves backwards for your required rank.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <DataNode title="Target Configuration" icon={<Crosshair size={18} />} status={isProcessing ? 'processing' : 'idle'}>
          <form onSubmit={handleCalc} className="space-y-5 mt-4">
            {/* Smart Autocomplete replaces raw instcode input */}
            <SmartAutocomplete
              label="College"
              value={form.collegeName}
              onChange={(instcode, name) => {
                setForm(p => ({
                  ...p,
                  instcode,
                  collegeName: name,
                  branch_code: instcode === p.instcode ? p.branch_code : '',
                }));
              }}
              placeholder="Start typing college name..."
            />

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-1.5">Branch</label>
              <select
                value={form.branch_code}
                onChange={e => update('branch_code', e.target.value)}
                className="liquid-input text-sm"
                required
                disabled={!form.instcode || branchesLoading}
              >
                <option value="">
                  {!form.instcode
                    ? 'Select a college first...'
                    : branchesLoading
                      ? 'Loading branches...'
                      : collegeBranches.length === 0
                        ? 'No branches found'
                        : 'Select branch...'}
                </option>
                {collegeBranches.map(code => (
                  <option key={code} value={code}>
                    {BRANCH_MAP[code] ? `${BRANCH_MAP[code]} (${code})` : code}
                  </option>
                ))}
              </select>
              {form.instcode && !branchesLoading && collegeBranches.length > 0 && (
                <p className="text-[10px] text-ink-muted mt-1.5">
                  {collegeBranches.length} branch{collegeBranches.length !== 1 ? 'es' : ''} at this college
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-1.5">Category</label>
                <select value={form.caste} onChange={e => update('caste', e.target.value)} className="liquid-input text-sm">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, '-')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-1.5">Gender</label>
                <select value={form.gender} onChange={e => update('gender', e.target.value)} className="liquid-input text-sm">
                  {GENDERS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Probability Section */}
            <div className="pt-4 pb-2">
              <div className="flex justify-between items-end mb-4">
                <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">Target Certainty</label>
                <motion.span key={form.desired_probability} initial={{ scale: 1.1, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className={`text-4xl font-bold font-mono tracking-tighter transition-colors ${currentColor.text}`}>{form.desired_probability}%</motion.span>
              </div>

              <div className="relative h-10 flex items-center mb-3">
                <div className="absolute inset-x-0 h-2.5 bg-phantom rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full"
                    animate={{ width: `${form.desired_probability}%`, backgroundColor: currentColor.fill }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                </div>
                <motion.div className="absolute h-6 w-6 bg-surface border-[3px] rounded-full shadow-node pointer-events-none"
                  animate={{ left: `calc(${form.desired_probability}% - 12px)`, borderColor: currentColor.fill }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                <input type="range" min="10" max="95" step="5" value={form.desired_probability} onChange={e => update('desired_probability', Number(e.target.value))}
                  className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
              <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-ink-ghost"><span>Reach</span><span>Safe</span></div>

              <div className="flex gap-2 mt-4">
                {presets.map(p => (
                  <button key={p.val} type="button" onClick={() => update('desired_probability', p.val)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      form.desired_probability === p.val ? 'bg-signal/10 border-signal/30 text-signal' : 'bg-phantom border-node-border text-ink-3 hover:border-ink-ghost'
                    }`}>{p.label}<br /><span className="font-mono text-[10px]">{p.val}%</span></button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={isProcessing}
              className={`w-full py-3.5 bg-gradient-to-r ${currentColor.bg} text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg mt-2`}>
              {isProcessing ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Computing...</> : <><Sparkles size={16} /> Compute Required Rank</>}
            </button>
          </form>
        </DataNode>

        {/* ═══ RESULTS STACK — Each card is fully isolated ═══ */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {results.length === 0 && !isProcessing && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="border-2 border-dashed border-node-border rounded-2xl flex flex-col items-center justify-center p-16 text-center min-h-[480px]">
                <div className="w-16 h-16 bg-phantom rounded-2xl flex items-center justify-center text-ink-ghost mb-5"><HelpCircle size={32} /></div>
                <h3 className="font-display font-bold text-xl text-ink mb-2">Ready to Compute</h3>
                <p className="text-ink-3 text-sm max-w-xs leading-relaxed">Select a college, branch, and desired probability. The engine solves for the rank you need.</p>
              </motion.div>
            )}

            {isProcessing && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="rounded-2xl flex flex-col items-center justify-center p-16 text-center min-h-[300px] bg-surface border border-node-border">
                <div className="relative w-20 h-20 mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-phantom" />
                  <motion.div className="absolute inset-0 rounded-full border-4 border-processing border-t-transparent"
                    animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
                </div>
                <h3 className="font-display font-bold text-ink">Running Projection...</h3>
                <p className="text-ink-3 text-sm mt-1">Evaluating historic cutoff baselines</p>
              </motion.div>
            )}

            {/* FIX: Each result card uses its OWN frozen color — no bleed from current slider */}
            {results.map((r) => (
              <ResultCard key={r.id} result={r} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ═══ Fully Isolated Result Card ═══
// Uses frozenColor from computation time. Does NOT reference parent state.
function ResultCard({ result }: { result: ReverseResult }) {
  const { frozenColor, college_name, branch_code, predicted_cutoff, desired_probability, required_rank } = result;

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      layout
      className={`bg-gradient-to-br ${frozenColor.bg} rounded-2xl p-6 text-white shadow-lifted relative overflow-hidden`}
    >
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full w-max mb-4 border border-white/20 text-xs font-semibold backdrop-blur-sm">
          <Check size={12} /> {desired_probability}% Target
        </div>

        <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.15em] mb-1">Institution</p>
        <h3 className="text-lg font-bold mb-1.5 leading-tight">{college_name}</h3>
        <span className="inline-block bg-white/15 backdrop-blur-sm px-2.5 py-0.5 rounded-lg font-mono text-xs font-bold mb-6 border border-white/10">
          {BRANCH_MAP[branch_code] || branch_code}
        </span>

        <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.15em] mb-1">Required Rank</p>
        <motion.div className="text-3xl sm:text-4xl md:text-5xl font-bold font-mono tracking-tighter leading-none"
          initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          {required_rank?.toLocaleString('en-IN')}
        </motion.div>

        <div className="border-t border-white/20 pt-3 mt-4 flex justify-between items-center text-xs text-white/70">
          <span>Base Cutoff: <strong className="text-white font-mono">{predicted_cutoff?.toLocaleString('en-IN')}</strong></span>
        </div>
      </div>
    </motion.div>
  );
}
