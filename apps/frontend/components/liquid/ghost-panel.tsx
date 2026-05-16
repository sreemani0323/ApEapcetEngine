'use client';

import { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface GhostPanelProps {
  children: ReactNode;
  side: 'left' | 'right';
  triggerLabel?: string;
  triggerIcon?: ReactNode;
}

export function GhostPanel({ children, side, triggerLabel, triggerIcon }: GhostPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-surface rounded-xl border border-node-border shadow-float text-sm font-semibold text-ink-2 hover:border-signal/30 hover:shadow-node transition-all cursor-pointer"
      >
        {triggerIcon}
        {triggerLabel}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink/5 backdrop-blur-[2px] z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: side === 'left' ? -340 : 340, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: side === 'left' ? -340 : 340, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={`fixed top-0 ${side === 'left' ? 'left-0' : 'right-0'} h-full w-[340px] bg-surface shadow-lifted z-50 flex flex-col border-r border-node-border`}
            >
              <div className="flex items-center justify-between p-4 border-b border-node-border">
                <span className="font-display font-bold text-ink">{triggerLabel}</span>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-phantom text-ink-muted cursor-pointer">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {children}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
