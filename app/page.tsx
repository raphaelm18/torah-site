import Link from "next/link";
import { AppCard } from "@/components/AppCard";
import { PostRow } from "@/components/PostRow";
import { getPublishedPosts } from "@/lib/posts";
import { siteName, tracks } from "@/lib/site";

export default function HomePage() {
  const latest = getPublishedPosts().slice(0, 3);

  return (
    <>
      <h1 className="sr-only">{siteName}</h1>
      <p className="page-intro">
        Torah writing, and the recordings that belong with it. Wrestling is
        for ideas still in motion. Connecting is for meeting a mitzvah
        somewhere past the argument, where it can actually be kept. I write
        them for my sons and grandchildren. They are here for anyone who
        wants to read.
      </p>

      <section className="section">
        <h2 className="kicker">Latest</h2>
        {latest.length === 0 ? (
          <p className="empty">No pieces published yet.</p>
        ) : (
          <ul className="post-list">
            {latest.map((post) => (
              <PostRow key={post.slug} post={post} />
            ))}
          </ul>
        )}
      </section>

      <section className="section">
        <h2 className="kicker">Tracks</h2>
        <div className="tracks">
          {(Object.keys(tracks) as Array<keyof typeof tracks>).map((id) => (
            <div key={id}>
              <h3>{tracks[id].label}</h3>
              <p>{tracks[id].description}</p>
              <Link href={`/writing?track=${id}`}>Read the track</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="kicker">An app</h2>
        <AppCard />
      </section>
    </>
  );
}
