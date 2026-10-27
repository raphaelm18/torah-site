import Link from "next/link";
import { SubscribeForm } from "@/components/SubscribeForm";

export function Footer() {
  return (
    <footer className="column site-footer">
      <SubscribeForm compact />
      <p className="footer-links">
        <a href="/rss.xml">RSS</a>
        <Link href="/subscribe">About the emails</Link>
        <Link href="/edit">Edit</Link>
      </p>
    </footer>
  );
}
