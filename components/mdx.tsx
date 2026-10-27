import Link from "next/link";
import type { ReactNode } from "react";

export function PullQuote({ children }: { children?: ReactNode }) {
  return <blockquote className="pullquote">{children}</blockquote>;
}

export function He({ children }: { children?: ReactNode }) {
  return (
    <span className="he" dir="rtl" lang="he">
      {children}
    </span>
  );
}

export function Wrestling({ children }: { children?: ReactNode }) {
  return (
    <aside className="box">
      <p className="kicker">What I&apos;m still wrestling with</p>
      <div className="prose">{children}</div>
    </aside>
  );
}

export function YourTurn({
  postTitle,
  children,
}: {
  postTitle: string;
  children?: ReactNode;
}) {
  const href = postTitle
    ? `/contact?post=${encodeURIComponent(postTitle)}`
    : "/contact";

  return (
    <aside className="box">
      <p className="kicker">Your turn</p>
      <div className="prose">{children}</div>
      <p className="send-thoughts">
        <Link href={href}>Send me your thoughts</Link>
      </p>
    </aside>
  );
}

export function Sources({ children }: { children?: ReactNode }) {
  return (
    <aside className="box sources">
      <p className="kicker">Sources</p>
      {children}
    </aside>
  );
}

export const mdxComponents = {
  PullQuote,
  He,
  Wrestling,
  Sources,
};
