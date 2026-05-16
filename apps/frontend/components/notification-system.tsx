'use client';

import { useEffect, useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Info, X, WifiOff, Shield, Clock } from 'lucide-react';

// ─── Types ───
export type NotificationType = 'success' | 'warning' | 'error' | 'info';
export type NotificationPriority = 'low' | 'normal' | 'critical';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  priority: NotificationPriority;
  duration?: number; // ms, 0 = sticky. Defaults calculated in notify().
  timestamp: number;
  action?: { label: string; onClick: () => void };
}

// ─── Context ───
interface NotificationContextType {
  notify: (opts: Omit<Notification, 'id' | 'timestamp'> & { duration?: number }) => void;
  success: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  error: (title: string, message?: string, action?: Notification['action']) => void;
  info: (title: string, message?: string) => void;
  clear: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be within NotificationProvider');
  return ctx;
}

// ─── Provider ───
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const notify = useCallback((opts: Omit<Notification, 'id' | 'timestamp'> & { duration?: number }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const duration = opts.duration ?? (opts.priority === 'critical' ? 0 : opts.type === 'error' ? 8000 : 4000);
    const notification: Notification = { ...opts, id, duration, timestamp: Date.now() };

    setNotifications(prev => {
      // Deduplicate by title within 2 seconds
      const isDupe = prev.some(n => n.title === notification.title && Date.now() - n.timestamp < 2000);
      if (isDupe) return prev;
      // Max 5 visible
      const trimmed = prev.length >= 5 ? prev.slice(1) : prev;
      return [...trimmed, notification];
    });

    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
  }, [dismiss]);

  const success = useCallback((title: string, message?: string) =>
    notify({ type: 'success', title, message, priority: 'low' }), [notify]);
  const warning = useCallback((title: string, message?: string) =>
    notify({ type: 'warning', title, message, priority: 'normal', duration: 6000 }), [notify]);
  const error = useCallback((title: string, message?: string, action?: Notification['action']) =>
    notify({ type: 'error', title, message, priority: 'critical', action }), [notify]);
  const info = useCallback((title: string, message?: string) =>
    notify({ type: 'info', title, message, priority: 'low' }), [notify]);
  const clear = useCallback(() => setNotifications([]), []);

  return (
    <NotificationContext.Provider value={{ notify, success, warning, error, info, clear }}>
      {children}
      <NotificationStack notifications={notifications} onDismiss={dismiss} />
    </NotificationContext.Provider>
  );
}

// ─── Visual Stack ───
function NotificationStack({ notifications, onDismiss }: { notifications: Notification[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 max-w-[420px] w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {notifications.map((n) => (
          <NotificationCard key={n.id} notification={n} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

const styleMap: Record<NotificationType, {
  icon: typeof CheckCircle;
  border: string;
  iconColor: string;
  bg: string;
  glow: string;
}> = {
  success: {
    icon: CheckCircle,
    border: 'border-emerald-200',
    iconColor: 'text-emerald-500',
    bg: 'bg-gradient-to-r from-emerald-50/90 to-white/90',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.08)]',
  },
  warning: {
    icon: AlertTriangle,
    border: 'border-amber-200',
    iconColor: 'text-amber-500',
    bg: 'bg-gradient-to-r from-amber-50/90 to-white/90',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.08)]',
  },
  error: {
    icon: XCircle,
    border: 'border-red-200',
    iconColor: 'text-red-500',
    bg: 'bg-gradient-to-r from-red-50/90 to-white/90',
    glow: 'shadow-[0_0_20px_rgba(239,68,68,0.1)]',
  },
  info: {
    icon: Info,
    border: 'border-blue-200',
    iconColor: 'text-blue-500',
    bg: 'bg-gradient-to-r from-blue-50/90 to-white/90',
    glow: 'shadow-[0_0_20px_rgba(37,99,235,0.08)]',
  },
};

function NotificationCard({ notification: n, onDismiss }: { notification: Notification; onDismiss: (id: string) => void }) {
  const s = styleMap[n.type];
  const Icon = s.icon;
  const isCritical = n.priority === 'critical';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`pointer-events-auto ${s.bg} backdrop-blur-xl border ${s.border} ${s.glow} rounded-2xl p-4 flex gap-3 items-start shadow-lifted relative overflow-hidden`}
    >
      {/* Critical pulse indicator */}
      {isCritical && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-2xl"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* Progress bar for auto-dismiss */}
      {(n.duration ?? 0) > 0 && (
        <motion.div
          className="absolute bottom-0 left-0 h-[2px] bg-current opacity-20"
          style={{ color: s.iconColor.replace('text-', '') }}
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: (n.duration ?? 4000) / 1000, ease: 'linear' }}
        />
      )}

      <div className={`flex-shrink-0 mt-0.5 ${s.iconColor}`}>
        <Icon size={18} strokeWidth={2.5} />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm text-ink leading-tight">{n.title}</h4>
        {n.message && <p className="text-xs text-ink-3 mt-0.5 leading-relaxed">{n.message}</p>}
        {n.action && (
          <button
            onClick={n.action.onClick}
            className="mt-2 text-xs font-bold text-signal hover:text-signal-hover transition-colors cursor-pointer"
          >
            {n.action.label} →
          </button>
        )}
      </div>

      <button
        onClick={() => onDismiss(n.id)}
        className="flex-shrink-0 text-ink-ghost hover:text-ink-3 transition-colors p-0.5 cursor-pointer rounded-full hover:bg-phantom"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

// ─── Pre-built Contextual Triggers ───
export function useNetworkNotifications() {
  const { error, success } = useNotifications();

  useEffect(() => {
    const handleOffline = () => error('Connection Lost', 'Check your internet connection.', {
      label: 'Retry', onClick: () => window.location.reload()
    });
    const handleOnline = () => success('Connection Restored', 'You are back online.');

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [error, success]);
}
