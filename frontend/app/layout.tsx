import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";

// No Google Fonts – use system font stack for offline builds

export const metadata: Metadata = {
  title: "DSA CT Master — AI-Powered DSA Learning Platform",
  description: "Master Data Structures & Algorithms with AI tutoring, visual learning, adaptive practice, and exam simulation. Transform from average to university topper.",
  keywords: ["DSA", "Data Structures", "Algorithms", "AI Tutor", "CT Exam", "University", "Stack", "Queue", "Tree", "AVL", "Hashing"],
  authors: [{ name: "DSA CT Master" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#030712] text-slate-100 overflow-x-hidden">
        <Providers>
          {children}
        </Providers>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#f1f5f9',
            },
          }}
        />
      </body>
    </html>
  );
}
