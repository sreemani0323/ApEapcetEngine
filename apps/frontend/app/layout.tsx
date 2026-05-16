import type { Metadata } from 'next';
import { Inter, Outfit, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { BreadcrumbStream } from '@/components/liquid/breadcrumb-stream';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'EAPCET Intelligence Engine',
  description: 'Data-driven college admission predictions for AP EAPCET',
  metadataBase: new URL('http://localhost:5173'),
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} ${jetbrains.variable}`}>
      <body className="antialiased min-h-screen flex flex-col bg-canvas text-ink">
        <Providers>
          <BreadcrumbStream />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-node-border/50 py-6 text-center mt-auto">
            <p className="text-xs text-ink-muted font-medium">&copy; 2026 EAPCET Intelligence Engine · Data: APSCHE</p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
