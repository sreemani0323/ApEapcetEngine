'use client';

import { Toaster } from 'react-hot-toast';
import { NotificationProvider, useNetworkNotifications } from '@/components/notification-system';

function NetworkWatcher() {
  useNetworkNotifications();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      <NetworkWatcher />
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '16px',
            padding: '12px 20px',
            background: '#ffffff',
            color: '#0f172a',
            boxShadow: '0 8px 32px rgba(15,23,42,0.08)',
            border: '1px solid #e5e7eb',
            fontSize: '14px',
            fontWeight: '500',
          },
        }}
      />
      {children}
    </NotificationProvider>
  );
}
