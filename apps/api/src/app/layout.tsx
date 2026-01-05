import './globals.css';

export const metadata = {
  title: 'Navi API',
  description: 'Backend API for Navi desktop app',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
