import "server-only";

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { evaluateSync } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import * as runtime from "react/jsx-runtime";
import type { ComponentType, ReactNode } from "react";
import { isSlug } from "@/lib/posts";

export type BookStatus = "forthcoming" | "available";

export type Book = {
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  status: BookStatus;
  read?: string;
  ebook?: string;
  print?: string;
  Content: (props: {
    components?: Record<string, ComponentType<{ children?: ReactNode }>>;
  }) => ReactNode;
};

const BOOKS_DIR = path.join(process.cwd(), "content", "books");

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function loadBook(filename: string): Book {
  const slug = filename.replace(/\.mdx$/, "");
  const raw = fs.readFileSync(path.join(BOOKS_DIR, filename), "utf8");
  const { data, content } = matter(raw);
  const status = text(data.status);
  if (status !== "forthcoming" && status !== "available") {
    throw new Error(`${filename}: status must be "forthcoming" or "available"`);
  }
  const title = text(data.title);
  if (!title) throw new Error(`${filename}: title is required`);

  const evaluated = evaluateSync(content, {
    ...runtime,
    development: false,
    remarkPlugins: [remarkGfm],
  });

  return {
    slug,
    title,
    subtitle: text(data.subtitle),
    summary: text(data.summary),
    status,
    read: text(data.read) || undefined,
    ebook: text(data.ebook) || undefined,
    print: text(data.print) || undefined,
    Content: evaluated.default as Book["Content"],
  };
}

export function getBooks() {
  if (!fs.existsSync(BOOKS_DIR)) return [];
  return fs
    .readdirSync(BOOKS_DIR)
    .filter((name) => name.endsWith(".mdx"))
    .sort()
    .map(loadBook)
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function getBook(slug: string) {
  if (!isSlug(slug)) return undefined;
  return getBooks().find((book) => book.slug === slug);
}
