'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Compass, Search, Map, BarChart3, Calculator, Building, ChevronRight, Menu, X } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';

const routeMap: Record<string, { label: string; icon: any }> = {
  '/': { label: 'Canvas', icon: Compass },
  '/search': { label: 'Predict', icon: Search },
  '/explore': { label: 'Explore', icon: Map },
  '/analytics': { label: 'Trends', icon: BarChart3 },
  '/calculator': { label: 'Compute', icon: Calculator },
};

export function BreadcrumbStream() {
  const pathname = usePathname();
  const { taskState } = useAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isCollegeDetail = pathname.startsWith('/college/');
  const segments: { label: string; icon: any; path: string; active: boolean }[] = [];
  segments.push({ ...routeMap['/'], path: '/', active: pathname === '/' });

  if (pathname !== '/') {
    if (isCollegeDetail) {
      segments.push({ ...routeMap['/explore'], path: '/explore', active: false });
      segments.push({ label: pathname.split('/').pop()?.toUpperCase() || 'Detail', icon: Building, path: pathname, active: true });
    } else if (routeMap[pathname]) {
      segments.push({ ...routeMap[pathname], path: pathname, active: true });
    }
  }

  const navItems = Object.entries(routeMap);

  return (
    <>
      {/* Desktop nav */}
      <div className="hidden md:flex items-center justify-center gap-1 px-4 py-2 text-sm">
        {segments.map((seg, idx) => (
          <div key={seg.path} className="flex items-center gap-1">
            {idx > 0 && <ChevronRight size={12} className="text-ink-ghost mx-1" />}
            <Link
              href={seg.path}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-medium ${
                seg.active
                  ? 'bg-signal/10 text-signal font-semibold'
                  : 'text-ink-muted hover:text-ink-2 hover:bg-phantom'
              }`}
            >
              <seg.icon size={14} />
              <span>{seg.label}</span>
              {seg.active && taskState === 'processing' && (
                <motion.div
                  className="w-2 h-2 rounded-full bg-processing"
                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </Link>
          </div>
        ))}
      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-2.5 border-b border-node-border/50">
        <Link href="/" className="font-display font-bold text-sm text-ink flex items-center gap-1.5">
          <Compass size={16} className="text-signal" />
          EAPCET Engine
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-ink-3 hover:bg-phantom transition-colors cursor-pointer"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden bg-surface border-b border-node-border/50"
          >
            <div className="py-2 px-4 space-y-1">
              {navItems.map(([path, { label, icon: Icon }]) => (
                <Link
                  key={path}
                  href={path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    pathname === path
                      ? 'bg-signal/10 text-signal font-semibold'
                      : 'text-ink-2 hover:bg-phantom'
                  }`}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
