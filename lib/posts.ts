import "server-only";

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { evaluateSync } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import * as runtime from "react/jsx-runtime";
import type { ComponentType, ReactNode } from "react";
import { tracks, type Track } from "@/lib/site";

export type PostStatus = "draft" | "published";

export type PostContent = (props: {
  components?: Record<string, ComponentType<{ children?: ReactNode }>>;
}) => ReactNode;

export type Post = {
  title: string;
  subtitle: string;
  slug: string;
  date: string;
  track: Track;
  series?: string;
  part?: number;
  tldr: string;
  audio?: string;
  ideaMap?: string;
  status: PostStatus;
  emailed: boolean;
  Content: PostContent;
};

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

const memo = new Map<string, { raw: string; post: Post }>();

function requiredString(value: unknown, file: string, field: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${file}: "${field}" is required`);
  }
  return value.trim();
}

function dateString(value: unknown, file: string) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${value.getUTCFullYear()}-${month}-${day}`;
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  throw new Error(`${file}: date must be YYYY-MM-DD`);
}

function optionalString(value: unknown, file: string, field: string) {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new Error(`${file}: "${field}" must be a string`);
  }
  return value.trim();
}

function buildPost(filename: string, raw: string): Post {
  const { data, content } = matter(raw);
  const slug = filename.replace(/\.mdx$/, "");
  const declared = optionalString(data.slug, filename, "slug");

  if (declared && declared !== slug) {
    throw new Error(
      `${filename}: slug "${declared}" does not match the filename`,
    );
  }

  const title = requiredString(data.title, filename, "title");
  const date = dateString(data.date, filename);

  const track = requiredString(data.track, filename, "track");
  if (!(track in tracks)) {
    throw new Error(`${filename}: track must be "wrestling" or "connecting"`);
  }

  const status = requiredString(data.status, filename, "status");
  if (status !== "draft" && status !== "published") {
    throw new Error(`${filename}: status must be "draft" or "published"`);
  }

  const series = optionalString(data.series, filename, "series");
  let part: number | undefined;
  if (data.part != null && data.part !== "") {
    if (typeof data.part !== "number" || !Number.isInteger(data.part)) {
      throw new Error(`${filename}: part must be a whole number`);
    }
    part = data.part;
  }
  if (part != null && !series) {
    throw new Error(`${filename}: part is set without a series`);
  }

  const subscribers = data.subscribers;
  if (
    subscribers != null &&
    subscribers !== "" &&
    subscribers !== true &&
    subscribers !== "yes"
  ) {
    throw new Error(`${filename}: subscribers must be "yes" or left off`);
  }

  const audio = optionalString(data.audio, filename, "audio");
  const ideaMap = optionalString(data.ideaMap, filename, "ideaMap");
  for (const [field, value] of [
    ["audio", audio],
    ["ideaMap", ideaMap],
  ] as const) {
    if (value && !value.startsWith("/")) {
      throw new Error(`${filename}: ${field} must start with /`);
    }
  }

  let compiled: PostContent;
  try {
    const evaluated = evaluateSync(content, {
      ...runtime,
      development: false,
      baseUrl: import.meta.url,
      remarkPlugins: [remarkGfm],
    });
    compiled = evaluated.default as PostContent;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${filename}: ${message}`);
  }

  return {
    title,
    subtitle: optionalString(data.subtitle, filename, "subtitle") ?? "",
    slug,
    date,
    track: track as Track,
    series,
    part,
    tldr: requiredString(data.tldr, filename, "tldr"),
    audio,
    ideaMap,
    status,
    emailed: status === "published" && (subscribers === true || subscribers === "yes"),
    Content: compiled,
  };
}

function loadPost(filename: string) {
  const raw = fs.readFileSync(path.join(POSTS_DIR, filename), "utf8");
  const hit = memo.get(filename);
  if (hit?.raw === raw) return hit.post;
  const post = buildPost(filename, raw);
  memo.set(filename, { raw, post });
  return post;
}

function readPosts() {
  if (!fs.existsSync(POSTS_DIR)) {
    throw new Error(`Missing content directory: ${POSTS_DIR}`);
  }

  const posts = fs
    .readdirSync(POSTS_DIR)
    .filter((name) => name.endsWith(".mdx"))
    .sort()
    .map(loadPost);

  const seen = new Set<string>();
  for (const post of posts) {
    if (seen.has(post.slug)) {
      throw new Error(`Duplicate slug "${post.slug}"`);
    }
    seen.add(post.slug);
  }

  return posts;
}

function byNewest(a: Post, b: Post) {
  return b.date.localeCompare(a.date) || a.title.localeCompare(b.title);
}

export function getPublishedPosts() {
  return readPosts()
    .filter((post) => post.status === "published")
    .sort(byNewest);
}

export function getPublishedPost(slug: string) {
  return getPublishedPosts().find((post) => post.slug === slug);
}

export function getDraftPosts() {
  return readPosts()
    .filter((post) => post.status === "draft")
    .sort(byNewest);
}

export type PostSource = {
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  track: string;
  series: string;
  part: string;
  tldr: string;
  audio: string;
  ideaMap: string;
  status: string;
  subscribers: string;
  body: string;
};

function asText(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${value.getUTCFullYear()}-${month}-${day}`;
  }
  if (value == null) return "";
  return String(value);
}

export function isSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function getPostSource(slug: string): PostSource | undefined {
  if (!isSlug(slug)) return undefined;
  const file = path.join(POSTS_DIR, `${slug}.mdx`);
  if (!fs.existsSync(file)) return undefined;
  const { data, content } = matter(fs.readFileSync(file, "utf8"));
  return {
    slug,
    title: asText(data.title),
    subtitle: asText(data.subtitle),
    date: asText(data.date),
    track: asText(data.track),
    series: asText(data.series),
    part: asText(data.part),
    tldr: asText(data.tldr),
    audio: asText(data.audio),
    ideaMap: asText(data.ideaMap),
    status: asText(data.status),
    subscribers: data.subscribers === true || data.subscribers === "yes" ? "yes" : "",
    body: content.replace(/^\n/, "").replace(/\s+$/, ""),
  };
}

export function serializePost(source: PostSource) {
  const lines = [
    `title: ${JSON.stringify(source.title)}`,
    `subtitle: ${JSON.stringify(source.subtitle)}`,
    `slug: ${source.slug}`,
    `date: ${source.date}`,
    `track: ${source.track}`,
  ];
  if (source.series) lines.push(`series: ${JSON.stringify(source.series)}`);
  if (source.part) lines.push(`part: ${source.part}`);
  lines.push(`tldr: ${JSON.stringify(source.tldr)}`);
  if (source.audio) lines.push(`audio: ${source.audio}`);
  if (source.ideaMap) lines.push(`ideaMap: ${source.ideaMap}`);
  lines.push(`status: ${source.status}`);
  if (source.subscribers === "yes") lines.push("subscribers: yes");
  return `---\n${lines.join("\n")}\n---\n\n${source.body.trim()}\n`;
}

export function postPath(slug: string) {
  return path.join(POSTS_DIR, `${slug}.mdx`);
}

export function postsWithAudio() {
  return getPublishedPosts().filter((post) => post.audio);
}

export function seriesSiblings(post: Post) {
  if (!post.series) return [];
  return getPublishedPosts()
    .filter((item) => item.series === post.series)
    .sort(
      (a, b) =>
        (a.part ?? 0) - (b.part ?? 0) || a.date.localeCompare(b.date),
    );
}

export type IndexGroup =
  | { type: "post"; post: Post }
  | { type: "series"; name: string; posts: Post[] };

export function groupPosts(posts: Post[]): IndexGroup[] {
  const sorted = [...posts].sort(byNewest);
  const seen = new Set<string>();
  const groups: IndexGroup[] = [];

  for (const post of sorted) {
    if (!post.series) {
      groups.push({ type: "post", post });
      continue;
    }
    if (seen.has(post.series)) continue;
    seen.add(post.series);
    groups.push({
      type: "series",
      name: post.series,
      posts: sorted
        .filter((item) => item.series === post.series)
        .sort(
          (a, b) =>
            (a.part ?? 0) - (b.part ?? 0) || a.date.localeCompare(b.date),
        ),
    });
  }

  return groups;
}
