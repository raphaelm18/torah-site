import Link from "next/link";
import { Suspense } from "react";
import { Header } from "@/components/Header";
import { navLinks } from "@/lib/nav";
import { siteName } from "@/lib/site";

function HeaderShell() {
  return (
    <header className="column site-header">
      <Link href="/" className="site-name">
        {siteName}
      </Link>
      <nav className="nav" aria-label="Pages">
        {navLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function SiteHeader() {
  return (
    <Suspense fallback={<HeaderShell />}>
      <Header />
    </Suspense>
  );
}
