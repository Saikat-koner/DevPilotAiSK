import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { TopNav } from '@/components/top-nav';

export const metadata: Metadata = {
  title: 'Shadow Forge — The Shadow Engineering Guild',
  description: 'Enter the arena. Forge your next build. A shadow-inspired autonomous engineering studio.',
  applicationName: 'Shadow Forge',
  metadataBase: new URL('http://localhost:3000')
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body><TopNav /><main>{children}</main></body></html>;
}
