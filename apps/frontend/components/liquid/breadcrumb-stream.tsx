'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Compass, Search, Map, BarChart3, Calculator, Building, ChevronRight } from 'lucide-react';
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

  return (
    <div className="flex items-center justify-center gap-1 px-4 py-2 text-sm">
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
  );
}
