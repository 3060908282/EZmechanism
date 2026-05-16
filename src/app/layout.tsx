import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MechFind - De Novo Prediction of Enzyme Mechanisms",
  description: "MechFind is a computational framework for de novo prediction of enzyme mechanisms using parsimony search and similarity re-ranking.",
  keywords: ["MechFind", "enzyme mechanisms", "de novo prediction", "parsimony search", "M-CSA", "bioinformatics", "computational chemistry"],
  authors: [{ name: "The Pennsylvania State University" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "MechFind - De Novo Prediction of Enzyme Mechanisms",
    description: "A computational framework for de novo prediction of enzyme mechanisms",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MechFind - De Novo Prediction of Enzyme Mechanisms",
    description: "A computational framework for de novo prediction of enzyme mechanisms",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
