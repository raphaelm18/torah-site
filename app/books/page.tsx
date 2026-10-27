import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getBook, getBooks } from "@/lib/books";

export const metadata = {
  title: "Books",
  description: "Pamphlets from the longer writing.",
};

export default function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ book?: string }>;
}) {
  return (
    <Suspense fallback={<p className="empty">Opening the shelf.</p>}>
      <Books searchParams={searchParams} />
    </Suspense>
  );
}

async function Books({
  searchParams,
}: {
  searchParams: Promise<{ book?: string }>;
}) {
  const { book: slug } = await searchParams;
  const books = getBooks();
  const book = slug ? getBook(slug) : undefined;
  if (slug && !book) notFound();

  return book ? <BookDetail book={book} /> : (
    <>
      <h1>Books</h1>
      <Shelf books={books} />
    </>
  );
}

function Shelf({
  books,
}: {
  books: ReturnType<typeof getBooks>;
}) {
  if (books.length === 0) {
    return (
      <p className="page-intro">
        Nothing here yet. When a pamphlet is ready, this is where you’ll read
        what it is, then take an ebook or order a printed copy.
      </p>
    );
  }

  return (
    <>
      <p className="page-intro">
        Longer pieces, gathered. Read what a book is before you take an ebook
        or order a printed copy.
      </p>
      <ul className="post-list section">
        {books.map((book) => (
          <li key={book.slug}>
            <p className="kicker">
              {book.status === "available" ? "Available" : "Forthcoming"}
            </p>
            <Link className="title" href={`/books?book=${book.slug}`}>
              {book.title}
            </Link>
            {book.summary ? <p className="dek">{book.summary}</p> : null}
          </li>
        ))}
      </ul>
    </>
  );
}

function BookDetail({ book }: { book: NonNullable<ReturnType<typeof getBook>> }) {
  const Content = book.Content;
  return (
    <article>
      <p className="kicker">
        {book.status === "available" ? "Available" : "Forthcoming"}
      </p>
      <h1>{book.title}</h1>
      {book.subtitle ? <p className="subtitle">{book.subtitle}</p> : null}
      <div className="prose">
        <Content />
      </div>
      <div className="book-actions">
        {book.read ? <a href={book.read}>Read</a> : null}
        {book.ebook ? <a href={book.ebook}>Ebook</a> : null}
        {book.print ? <a href={book.print}>Printed copy</a> : null}
        {book.status === "forthcoming" && !book.read && !book.ebook && !book.print ? (
          <p className="empty">Not for sale yet.</p>
        ) : null}
      </div>
      <p className="edit-row">
        <Link href="/books">All books</Link>
      </p>
    </article>
  );
}
