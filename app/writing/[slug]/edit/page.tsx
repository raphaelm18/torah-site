import Link from "next/link";
import { Suspense } from "react";
import { PasswordForm } from "@/components/PasswordForm";
import { PostEditor } from "@/components/PostEditor";
import { canEdit } from "@/lib/edit-auth";
import { getPostSource } from "@/lib/posts";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Edit a piece",
  robots: { index: false, follow: false },
};

async function Editor({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!(await canEdit())) {
    return <PasswordForm next={`/writing/${slug}/edit`} />;
  }
  const source = getPostSource(slug);
  if (!source) notFound();
  return (
    <>
      <p className="edit-row">
        <Link href={`/writing/${slug}`}>View</Link>
      </p>
      <PostEditor initial={source} previousSlug={slug} />
    </>
  );
}

export default function EditPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <>
      <h1>Edit</h1>
      <Suspense fallback={<p className="empty">Opening the piece.</p>}>
        <Editor params={params} />
      </Suspense>
    </>
  );
}
