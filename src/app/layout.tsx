import type { Metadata, Viewport } from 'next';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './globals.css';
import '@/features/debrief/debrief.css';
import '@/features/quiz/quiz.css';
import './theme.css';
export const metadata: Metadata = {
  title: 'ArbiGo — Le terrain en tête',
  description: 'Votre carnet d’arbitre : préparation, sac, contrôles et débrief d’après-match.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'ArbiGo' },
  icons: { icon: '/icon.svg', apple: '/icons/apple-touch-icon.png' },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#003287',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
