import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { Post } from "@/lib/posts";
import { tracks } from "@/lib/site";

export function PostRow({
  post,
  kicker,
}: {
  post: Post;
  kicker?: string;
}) {
  const label =
    kicker ??
    [
      tracks[post.track].label,
      post.series,
      post.part ? `Part ${post.part}` : undefined,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <li>
      <p className="kicker">{label}</p>
      <Link className="title" href={`/writing/${post.slug}`}>
        {post.title}
      </Link>
      {post.subtitle ? <p className="dek">{post.subtitle}</p> : null}
      <p className="meta">
        <time dateTime={post.date}>{formatDate(post.date)}</time>
      </p>
    </li>
  );
}
