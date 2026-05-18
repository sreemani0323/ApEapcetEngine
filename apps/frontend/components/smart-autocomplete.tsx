'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getCollegeNames } from '@/lib/api';
import { Search, Building, MapPin, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══ Trie Node for O(prefix) search ═══
interface TrieNode {
  children: Map<string, TrieNode>;
  entries: CollegeEntry[];
}

interface CollegeEntry {
  instcode: string;
  name: string;
  district: string;
  typeLabel: string;
}

function normalizeCollegeEntry(raw: Record<string, string>): CollegeEntry {
  return {
    instcode: raw.instcode,
    name: raw.name,
    district: raw.district,
    typeLabel: raw.typeLabel || raw.type_label || '',
  };
}

function createTrieNode(): TrieNode {
  return { children: new Map(), entries: [] };
}

function insertTrie(root: TrieNode, key: string, entry: CollegeEntry) {
  let node = root;
  for (const ch of key.toLowerCase()) {
    if (!node.children.has(ch)) node.children.set(ch, createTrieNode());
    node = node.children.get(ch)!;
    node.entries.push(entry); // store at every prefix level for instant results
  }
}

function searchTrie(root: TrieNode, prefix: string, limit = 8): CollegeEntry[] {
  let node = root;
  for (const ch of prefix.toLowerCase()) {
    if (!node.children.has(ch)) return [];
    node = node.children.get(ch)!;
  }
  // Return unique entries up to limit (deduplicated by instcode)
  const seen = new Set<string>();
  const results: CollegeEntry[] = [];
  for (const entry of node.entries) {
    if (!seen.has(entry.instcode)) {
      seen.add(entry.instcode);
      results.push(entry);
      if (results.length >= limit) break;
    }
  }
  return results;
}

// ═══ Exported Hook: Singleton Trie, loaded once ═══
let globalTrie: TrieNode | null = null;
let trieLoading = false;
let triePromise: Promise<void> | null = null;

async function ensureTrieLoaded(): Promise<TrieNode> {
  if (globalTrie) return globalTrie;
  if (!triePromise) {
    trieLoading = true;
    triePromise = (async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const { data } = await getCollegeNames();
          const root = createTrieNode();
          for (const raw of data as Record<string, string>[]) {
            const c = normalizeCollegeEntry(raw);
            insertTrie(root, c.name, c);
            for (const word of c.name.split(/\s+/)) {
              if (word.length > 2) insertTrie(root, word, c);
            }
            insertTrie(root, c.instcode, c);
          }
          globalTrie = root;
          trieLoading = false;
          return;
        } catch {
          if (attempt === 2) throw new Error('Failed to load college names');
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    })();
  }
  await triePromise;
  return globalTrie!;
}

// ═══ Smart Autocomplete Component ═══
interface SmartAutocompleteProps {
  value: string;
  onChange: (instcode: string, name: string) => void;
  placeholder?: string;
  label?: string;
}

export function SmartAutocomplete({ value, onChange, placeholder = 'Search college...', label }: SmartAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<CollegeEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [trie, setTrie] = useState<TrieNode | null>(globalTrie);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load Trie on mount (singleton, loads once across entire app)
  useEffect(() => {
    ensureTrieLoaded().then(setTrie);
  }, []);

  // Sync external value changes
  useEffect(() => {
    if (value !== query) setQuery(value);
  }, [value]);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    setActiveIdx(-1);
    if (q.length < 1) {
      onChange('', '');
    }
    if (!trie || q.length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }
    const hits = searchTrie(trie, q, 8);
    setResults(hits);
    setOpen(hits.length > 0);
  }, [trie]);

  const handleSelect = useCallback((entry: CollegeEntry) => {
    setQuery(entry.name);
    setOpen(false);
    onChange(entry.instcode, entry.name);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); handleSelect(results[activeIdx]); }
    if (e.key === 'Escape') { setOpen(false); }
  }, [open, activeIdx, results, handleSelect]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-1.5">{label}</label>}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-ghost pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => handleSearch(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="liquid-input pr-8 text-sm"
          style={{ paddingLeft: '2.5rem' }}
          autoComplete="off"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(''); setResults([]); setOpen(false); onChange('', ''); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-ghost hover:text-ink-3 cursor-pointer">
            <X size={14} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-surface border border-node-border rounded-xl shadow-command overflow-hidden max-h-[320px] overflow-y-auto"
          >
            {results.map((entry, idx) => (
              <button
                key={entry.instcode}
                type="button"
                onClick={() => handleSelect(entry)}
                onMouseEnter={() => setActiveIdx(idx)}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer ${
                  idx === activeIdx ? 'bg-signal/5' : 'hover:bg-phantom'
                } ${idx > 0 ? 'border-t border-node-border/40' : ''}`}
              >
                <div className="flex-shrink-0 w-8 h-8 bg-phantom rounded-lg flex items-center justify-center mt-0.5">
                  <Building size={14} className="text-ink-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-ink truncate leading-tight">{entry.name}</div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-ink-3">
                    <span className="flex items-center gap-1"><MapPin size={10} className="text-signal" />{entry.district}</span>
                    <span className="w-1 h-1 rounded-full bg-ink-ghost" />
                    <span className="font-mono text-ink-muted">{entry.instcode}</span>
                    {entry.typeLabel && <>
                      <span className="w-1 h-1 rounded-full bg-ink-ghost" />
                      <span>{entry.typeLabel}</span>
                    </>}
                  </div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
