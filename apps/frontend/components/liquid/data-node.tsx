'use client';

import { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface DataNodeProps {
  title: string;
  icon: ReactNode;
  status?: 'idle' | 'active' | 'processing' | 'validated' | 'error';
  summary?: ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

const statusBorder: Record<string, string> = {
  idle: 'border-node-border',
  active: 'border-signal/30',
  processing: 'border-processing/30',
  validated: 'border-validated/30',
  error: 'border-critical/30',
};

export function DataNode({
  title, icon, status = 'idle', summary, children, defaultExpanded = true, className = ''
}: DataNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={`bg-surface rounded-node border ${statusBorder[status]} shadow-float transition-all duration-300 overflow-hidden ${className}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-phantom/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="text-signal">{icon}</div>
          <span className="font-display font-bold text-base text-ink">{title}</span>
          {status === 'processing' && (
            <motion.div
              className="w-2 h-2 rounded-full bg-processing"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>
        <div className="flex items-center gap-3">
          {!expanded && summary && <div className="text-sm text-ink-3">{summary}</div>}
          {expanded ? <ChevronUp size={16} className="text-ink-muted" /> : <ChevronDown size={16} className="text-ink-muted" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="px-5 pb-5 border-t border-node-border/50">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
