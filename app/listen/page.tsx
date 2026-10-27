import Link from "next/link";
import { formatDate } from "@/lib/format";
import { postsWithAudio } from "@/lib/posts";
import { spotifyShowUrl, tracks } from "@/lib/site";

export const metadata = {
  title: "Listen",
  description: "Recordings of the writing.",
};

export default function ListenPage() {
  const posts = postsWithAudio();

  return (
    <>
      <h1>Listen</h1>
      <p className="page-intro">
        Recordings of the pieces, when they exist.
        {spotifyShowUrl ? (
          <>
            {" "}
            The same files are on{" "}
            <a href={spotifyShowUrl}>Spotify</a>.
          </>
        ) : (
          <> The Spotify show will be linked here once it exists.</>
        )}
      </p>

      {posts.length === 0 ? (
        <p className="empty section">No recordings yet.</p>
      ) : (
        <div className="section">
          {posts.map((post) => (
            <article className="listen-item" key={post.slug}>
              <p className="kicker">
                {tracks[post.track].label}
                {post.series
                  ? ` · ${post.series}${post.part ? ` · Part ${post.part}` : ""}`
                  : ""}
              </p>
              <Link className="title" href={`/writing/${post.slug}`}>
                {post.title}
              </Link>
              <p className="meta">
                <time dateTime={post.date}>{formatDate(post.date)}</time>
              </p>
              <audio controls preload="none" src={post.audio}>
                Your browser does not play this audio.
              </audio>
              <p className="read">
                <Link href={`/writing/${post.slug}`}>Read the piece</Link>
              </p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
