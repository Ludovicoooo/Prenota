// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

// Configura Inter font (disponibile in Next.js 14)
const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-inter',
});

export const viewport: Viewport = {
    themeColor: '#2563eb',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export const metadata: Metadata = {
    title: 'PrenotaIlTavolo - Prenota il tuo ristorante in 30 secondi',
    description: 'Prenota un tavolo al ristorante in modo semplice e veloce. Nessun download, nessuna chiamata.',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'PrenotaIlTavolo',
    },
    formatDetection: {
        telephone: false,
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="it" className={inter.variable}>
            <body className={`${inter.className} antialiased bg-white text-gray-900`}>
                {children}
            </body>
        </html>
    );
}