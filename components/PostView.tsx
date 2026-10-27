import Link from "next/link";
import { formatDate } from "@/lib/format";
import { seriesSiblings, type Post } from "@/lib/posts";
import { tracks } from "@/lib/site";
import { mdxComponents, YourTurn } from "@/components/mdx";
import type { ReactNode } from "react";

export function PostView({ post }: { post: Post }) {
  const siblings = seriesSiblings(post);
  const index = siblings.findIndex((item) => item.slug === post.slug);
  const previous = index > 0 ? siblings[index - 1] : undefined;
  const next =
    index >= 0 && index < siblings.length - 1
      ? siblings[index + 1]
      : undefined;
  const Content = post.Content;
  const badge = [
    tracks[post.track].label,
    post.series,
    post.part ? `Part ${post.part}` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article>
      <p className="kicker">{badge}</p>
      <h1>{post.title}</h1>
      {post.subtitle ? <p className="subtitle">{post.subtitle}</p> : null}
      <p className="meta">
        <time dateTime={post.date}>{formatDate(post.date)}</time>
      </p>

      <aside className="box">
        <p className="kicker">TL;DR</p>
        <p className="tldr">{post.tldr}</p>
      </aside>

      {post.audio ? (
        <figure className="audio-block">
          <figcaption className="kicker">Listen</figcaption>
          <audio controls preload="none" src={post.audio}>
            Your browser does not play this audio.
          </audio>
        </figure>
      ) : null}

      {post.ideaMap ? (
        <figure className="idea-map">
          {/* Authored SVG maps stay vectors; the image optimizer would rasterize them. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.ideaMap}
            alt={`Idea map for ${post.title}`}
            width={640}
            height={280}
          />
          <figcaption className="kicker">Idea map</figcaption>
        </figure>
      ) : null}

      <div className="prose">
        <Content
          components={{
            ...mdxComponents,
            YourTurn: function BoundYourTurn({
              children,
            }: {
              children?: ReactNode;
            }) {
              return <YourTurn postTitle={post.title}>{children}</YourTurn>;
            },
          }}
        />
      </div>

      <p className="signature">Raphael ben Avraham</p>

      {previous || next ? (
        <nav className="series-nav" aria-label="Other parts in this series">
          <div>
            {previous ? (
              <Link href={`/writing/${previous.slug}`}>
                <span className="kicker">Previous</span>
                <span className="title">{previous.title}</span>
              </Link>
            ) : null}
          </div>
          <div>
            {next ? (
              <Link className="next" href={`/writing/${next.slug}`}>
                <span className="kicker">Next</span>
                <span className="title">{next.title}</span>
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </article>
  );
}
