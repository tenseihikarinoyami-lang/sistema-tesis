import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ThesisForge AI | Sistema de Generación Académica Superior",
  description: "Plataforma de investigación académica con rigor humano e IA avanzada.",
};

import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className="h-full antialiased"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Merriweather:ital,wght@0,400;0,700;0,900;1,400&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>
          <Toaster 
            position="top-right" 
            toastOptions={{
              className: 'glass rounded-2xl border border-white/10 text-white font-medium',
            }}
          />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
