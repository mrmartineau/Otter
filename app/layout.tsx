import type { Viewport } from 'next';

import './globals.css';

export const runtime = 'edge';

export const metadata = {
  title: 'Otter',
  description: 'Bookmarking on your own terms',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  colorScheme: 'dark light',
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
