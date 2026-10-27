import Link from "next/link";
import { Suspense } from "react";
import { PasswordForm } from "@/components/PasswordForm";
import { PostEditor } from "@/components/PostEditor";
import { canEdit } from "@/lib/edit-auth";

export const metadata = {
  title: "New piece",
  robots: { index: false, follow: false },
};

async function NewPiece() {
  if (!(await canEdit())) {
    return <PasswordForm next="/writing/new" />;
  }
  return (
    <>
      <p className="edit-row">
        <Link href="/writing">Back to the writing</Link>
      </p>
      <PostEditor />
    </>
  );
}

export default function NewPostPage() {
  return (
    <>
      <h1>New piece</h1>
      <Suspense fallback={<p className="empty">Opening a blank piece.</p>}>
        <NewPiece />
      </Suspense>
    </>
  );
}
