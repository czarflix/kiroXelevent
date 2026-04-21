import type { Metadata } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap"
});

const space = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "VoiceGauntlet",
  description: "Kiro-ready QA and red-team lab for ElevenLabs voice agents."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${space.variable}`}>
      <body>{children}</body>
    </html>
  );
}
