
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/AuthContext'; 

export const metadata: Metadata = {
  title: 'NailStudio AI – Gestão Inteligente',
  description: 'Painel administrativo para salão de beleza com React, TypeScript e Firebase.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Belleza&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@400;500;700&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#E62E7B" />
        <link rel="apple-touch-icon" href="https://placehold.co/180x180.png" /> 
      </head>
      <body className="font-body antialiased">
        <AuthProvider> 
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}

