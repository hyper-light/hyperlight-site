import type { Metadata, Viewport } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Reveal } from "@/components/reveal";
import { MotionProvider } from "@/components/motion-provider";
import { site } from "@/lib/site";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Hyperlight — Infrastructure for agents and humans",
    template: "%s — Hyperlight",
  },
  description: site.description,
  alternates: { types: { "application/rss+xml": "/feed.xml" } },
  openGraph: {
    type: "website",
    siteName: "Hyperlight",
    title: "Hyperlight — Any scale. Any place.",
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Hyperlight — Any scale. Any place.",
    description: site.description,
  },
};

export const viewport: Viewport = {
  themeColor: "#08090a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <MotionProvider>
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <Header />
          {children}
          <Footer />
          <Reveal />
        </MotionProvider>
      </body>
    </html>
  );
}
