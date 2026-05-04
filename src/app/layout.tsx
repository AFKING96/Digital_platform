import type { Metadata } from "next";
import { Lexend, Manrope } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";

const lexend = Lexend({
  variable: "--font-heading",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Coursat | Premium Learning Platform",
  description: "Accelerate your learning with Coursat - the premium practice and curriculum platform.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Coursat",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${lexend.variable} ${manrope.variable} dark`}>
      <body className="font-sans min-h-screen bg-[#0B1220] text-white antialiased relative">
        <AuthProvider>
          <div className="bg-blob-primary pointer-events-none" />
          <div className="bg-blob-secondary pointer-events-none" />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
