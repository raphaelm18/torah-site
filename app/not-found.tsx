import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <h1>This page isn&apos;t here.</h1>
      <p className="page-intro">
        <Link href="/writing">Back to the writing</Link>
      </p>
    </>
  );
}
