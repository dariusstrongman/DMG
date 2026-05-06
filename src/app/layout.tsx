import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans"
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono"
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://dmg.stromation.com"),
  title: {
    default: "DMG Analytics — AI-powered creator intelligence",
    template: "%s · DMG Analytics"
  },
  description:
    "Real-time YouTube analytics with AI virality prediction, retention analysis, competitor tracking, and automated insights. Built by Stromation.",
  applicationName: "DMG Analytics",
  authors: [{ name: "Stromation" }],
  openGraph: {
    type: "website",
    siteName: "DMG Analytics",
    title: "DMG Analytics — AI-powered creator intelligence",
    description:
      "Predict virality before you publish. Spot retention drop-offs. Track competitors. Built for serious YouTube creators."
  },
  twitter: {
    card: "summary_large_image",
    title: "DMG Analytics",
    description: "AI-powered creator intelligence for YouTube."
  },
  robots: { index: true, follow: true }
};

export const viewport: Viewport = {
  themeColor: "#070810",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrains.variable}`}>
      <body className="bg-app min-h-screen antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "hsl(228 18% 10%)",
              color: "hsl(220 12% 96%)",
              border: "1px solid hsl(228 14% 18%)",
              fontSize: "0.9rem"
            }
          }}
        />
      </body>
    </html>
  );
}
