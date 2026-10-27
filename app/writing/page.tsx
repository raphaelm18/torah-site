import Link from "next/link";
import { Suspense } from "react";
import { PostRow } from "@/components/PostRow";
import { canEdit } from "@/lib/edit-auth";
import { getDraftPosts, getPublishedPosts, groupPosts } from "@/lib/posts";
import { tracks, type Track } from "@/lib/site";

export const metadata = {
  title: "Writing",
  description: "Published pieces, newest first, in two tracks.",
};

const filters = [
  { id: "all", label: "All", href: "/writing" },
  { id: "wrestling", label: "Wrestling", href: "/writing?track=wrestling" },
  { id: "connecting", label: "Connecting", href: "/writing?track=connecting" },
] as const;

function isTrack(value: string | undefined): value is Track {
  return value === "wrestling" || value === "connecting";
}

async function WritingIndex({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  const { track } = await searchParams;
  const active = isTrack(track) ? track : "all";
  const posts = getPublishedPosts().filter((post) =>
    active === "all" ? true : post.track === active,
  );
  const groups = groupPosts(posts);
  const editing = await canEdit();

  return (
    <>
      {editing ? (
        <p className="edit-row">
          <Link href="/writing/new">New piece</Link>
        </p>
      ) : null}
      <nav className="filters" aria-label="Filter by track">
        {filters.map((filter) => (
          <Link
            key={filter.id}
            href={filter.href}
            aria-current={filter.id === active ? "page" : undefined}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      {groups.length === 0 ? (
        <p className="empty section">Nothing in this track yet.</p>
      ) : (
        <div className="section">
          {groups.map((group) =>
            group.type === "post" ? (
              <ul className="post-list" key={group.post.slug}>
                <PostRow post={group.post} edit={editing} />
              </ul>
            ) : (
              <section className="series-block" key={group.name}>
                <h2 className="kicker series-name">{group.name}</h2>
                <ol className="series-parts">
                  {group.posts.map((post) => (
                    <PostRow
                      key={post.slug}
                      post={post}
                      edit={editing}
                      kicker={[
                        post.part ? `Part ${post.part}` : "Part",
                        tracks[post.track].label,
                      ].join(" · ")}
                    />
                  ))}
                </ol>
              </section>
            ),
          )}
        </div>
      )}
      {editing ? <Drafts /> : null}
    </>
  );
}

function Drafts() {
  const drafts = getDraftPosts();
  if (drafts.length === 0) return null;
  return (
    <section className="section">
      <h2 className="kicker series-name">Drafts</h2>
      <ul className="post-list">
        {drafts.map((post) => (
          <PostRow key={post.slug} post={post} edit kicker="Draft" />
        ))}
      </ul>
    </section>
  );
}

export default function WritingPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  return (
    <>
      <h1>Writing</h1>
      <p className="page-intro">Newest first. Two tracks.</p>
      <Suspense fallback={<p className="empty">Loading the list.</p>}>
        <WritingIndex searchParams={searchParams} />
      </Suspense>
    </>
  );
}
