import { connection } from "next/server";
import { Suspense } from "react";
import { ContactForm } from "@/components/ContactForm";

export const metadata = {
  title: "Contact",
  description: "Send a note to Raphael ben Avraham.",
};

async function contactProps(searchParams: Promise<{ post?: string }>) {
  await connection();
  const { post } = await searchParams;
  // The spam check compares this request time with the later submit.
  const loadedAt = Date.now();
  return { post, loadedAt };
}

async function ContactGate({
  searchParams,
}: {
  searchParams: Promise<{ post?: string }>;
}) {
  const { post, loadedAt } = await contactProps(searchParams);
  return <ContactForm key={post ?? ""} postTitle={post} loadedAt={loadedAt} />;
}

export default function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ post?: string }>;
}) {
  return (
    <>
      <h1>Contact</h1>
      <p className="page-intro">
        Send a thought about a piece, or anything else you want me to read.
      </p>
      <Suspense fallback={<p className="empty">Opening the form.</p>}>
        <ContactGate searchParams={searchParams} />
      </Suspense>
    </>
  );
}
