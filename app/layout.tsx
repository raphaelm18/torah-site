import type { Metadata } from "next";
import { Frank_Ruhl_Libre, IBM_Plex_Sans, Newsreader } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getSiteUrl, siteDescription, siteName } from "@/lib/site";
import "./globals.css";

const body = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-newsreader",
});

const hebrew = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-frank",
});

const label = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: siteName,
    template: `%s · ${siteName}`,
  },
  description: siteDescription,
  alternates: {
    types: {
      "application/rss+xml": "/rss.xml",
    },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${hebrew.variable} ${label.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a className="skip" href="#content">
          Skip to content
        </a>
        <Header />
        <main id="content" className="column flex-1 pt-8 pb-16">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
