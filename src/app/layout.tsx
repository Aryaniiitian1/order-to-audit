import type { Metadata } from 'next';
import './globals.css';
import { Navigation } from '../components/Navigation';

export const metadata: Metadata = {
  title: 'Order-to-Audit System | Packaged Food Manufacturing',
  description: 'Connected sales, GST billing, inventory, production, costing and audit system for NIT Tiruchirappalli.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased">
        <Navigation />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 no-print">
          Order-to-Audit Business System • Centre for Digital Infrastructure, NIT Tiruchirappalli
        </footer>
      </body>
    </html>
  );
}
