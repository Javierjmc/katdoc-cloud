// app/layout.tsx — VERSIÓN FINAL con ToastProvider
import type { Metadata, Viewport } from 'next';
import { ToastProvider } from '@/components/ui/Toast';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title:       'VetCare Pro — Historias Clínicas Veterinarias',
  description: 'Sistema de gestión de historias clínicas veterinarias',
  manifest:    '/manifest.json',
  appleWebApp: {
    capable:         true,
    statusBarStyle:  'default',
    title:           'VetCare Pro',
  },
};

export const viewport: Viewport = {
  width:        'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)',  color: '#020617' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('katdoc_theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
