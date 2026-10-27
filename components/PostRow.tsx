import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { Post } from "@/lib/posts";
import { tracks } from "@/lib/site";

export function PostRow({
  post,
  kicker,
  edit = false,
}: {
  post: Post;
  kicker?: string;
  edit?: boolean;
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

  const href =
    edit && post.status === "draft"
      ? `/writing/${post.slug}/edit`
      : `/writing/${post.slug}`;

  return (
    <li>
      <p className="kicker">{label}</p>
      <Link className="title" href={href}>
        {post.title}
      </Link>
      {post.subtitle ? <p className="dek">{post.subtitle}</p> : null}
      <p className="meta">
        <time dateTime={post.date}>{formatDate(post.date)}</time>
        {edit && post.status === "published" && !post.emailed ? (
          <> · Not emailed</>
        ) : null}
        {" · "}
        <Link href={`/writing/${post.slug}/edit`}>Edit</Link>
      </p>
    </li>
  );
}
