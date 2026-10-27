import Link from "next/link";
import { Suspense } from "react";
import { PasswordForm } from "@/components/PasswordForm";
import { canEdit } from "@/lib/edit-auth";

export const metadata = {
  title: "Edit",
  robots: { index: false, follow: false },
};

async function EditGate() {
  if (await canEdit()) {
    return (
      <>
        <p className="page-intro">
          You can edit a piece from its page, or start one from the writing list.
        </p>
        <p>
          <Link href="/writing">Go to the writing</Link>
        </p>
        <form action="/api/edit/logout" method="post">
          <LogoutButton />
        </form>
      </>
    );
  }

  return (
    <>
      <p className="page-intro">
        The password opens the editor. It is also on each piece, next to the date.
      </p>
      <PasswordForm next="/writing" />
    </>
  );
}

function LogoutButton() {
  return (
    <button className="send" type="submit">
      Sign out
    </button>
  );
}

export default function EditPage() {
  return (
    <>
      <h1>Edit</h1>
      <Suspense fallback={<p className="empty">Opening the editor.</p>}>
        <EditGate />
      </Suspense>
    </>
  );
}
