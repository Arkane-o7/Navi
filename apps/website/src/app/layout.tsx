import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Navi',
  description: 'Navi AI — Your intelligent assistant on the web',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
