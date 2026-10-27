import "server-only";

import fs from "node:fs";
import path from "node:path";
import { evaluateSync } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import * as runtime from "react/jsx-runtime";
import {
  isSlug,
  postPath,
  serializePost,
  type PostSource,
} from "@/lib/posts";
import { tracks } from "@/lib/site";

export function checkPost(source: PostSource) {
  if (!isSlug(source.slug)) {
    return "The slug must be lowercase words separated by hyphens.";
  }
  if (!source.title.trim()) return "A title is required.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source.date)) {
    return "The date must be YYYY-MM-DD.";
  }
  if (!(source.track in tracks)) {
    return "The track must be wrestling or connecting.";
  }
  if (source.status !== "draft" && source.status !== "published") {
    return "Status must be draft or published.";
  }
  if (source.subscribers && source.subscribers !== "yes") {
    return "Email subscribers is either on or left off.";
  }
  if (source.subscribers === "yes" && source.status !== "published") {
    return "Email subscribers only once the piece is on the site.";
  }
  if (!source.tldr.trim()) return "A TL;DR is required.";
  if (source.part && !/^\d+$/.test(source.part)) {
    return "Part must be a whole number.";
  }
  if (source.part && !source.series.trim()) {
    return "A part needs a series name.";
  }
  for (const [field, value] of [
    ["audio", source.audio],
    ["idea map", source.ideaMap],
  ] as const) {
    if (value && !value.startsWith("/")) {
      return `The ${field} path must start with /.`;
    }
  }
  try {
    evaluateSync(source.body, {
      ...runtime,
      development: false,
      remarkPlugins: [remarkGfm],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `The body could not be read: ${message}`;
  }
  return null;
}

async function githubRequest(repo: string, filePath: string, init?: RequestInit) {
  const token = process.env.GITHUB_TOKEN;
  return fetch(
    `https://api.github.com/repos/${repo}/contents/${filePath}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "torah-site",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(init?.headers ?? {}),
      },
    },
  );
}

async function githubWrite(
  repo: string,
  filePath: string,
  content: string | Buffer,
  message: string,
) {
  const current = await githubRequest(repo, filePath);
  let sha: string | undefined;
  if (current.ok) {
    const data = (await current.json()) as { sha?: string };
    sha = data.sha;
  } else if (current.status !== 404) {
    throw new Error(await current.text());
  }

  const saved = await githubRequest(repo, filePath, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: Buffer.isBuffer(content) ? content.toString("base64") : Buffer.from(content).toString("base64"),
      sha,
    }),
  });
  if (!saved.ok) throw new Error(await saved.text());
}

async function githubDelete(repo: string, filePath: string, message: string) {
  const current = await githubRequest(repo, filePath);
  if (current.status === 404) return;
  if (!current.ok) throw new Error(await current.text());
  const data = (await current.json()) as { sha?: string };
  const removed = await githubRequest(repo, filePath, {
    method: "DELETE",
    body: JSON.stringify({ message, sha: data.sha }),
  });
  if (!removed.ok) throw new Error(await removed.text());
}

export async function savePost(source: PostSource, previousSlug?: string) {
  const problem = checkPost(source);
  if (problem) return { ok: false as const, error: problem, status: 400 };

  const file = serializePost(source);
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  const relative = `content/posts/${source.slug}.mdx`;
  const message = `${source.status === "published" ? "Publish" : "Save"} ${source.title}`;

  if (token && repo) {
    await githubWrite(repo, relative, file, message);
    if (previousSlug && previousSlug !== source.slug) {
      await githubDelete(
        repo,
        `content/posts/${previousSlug}.mdx`,
        `Move ${previousSlug} to ${source.slug}`,
      );
    }
    return {
      ok: true as const,
      where: "github" as const,
    };
  }

  if (process.env.VERCEL) {
    return {
      ok: false as const,
      status: 503,
      error:
        "Saving from the live site needs GITHUB_TOKEN and GITHUB_REPO. The file is not changed.",
    };
  }

  fs.mkdirSync(path.dirname(postPath(source.slug)), { recursive: true });
  fs.writeFileSync(postPath(source.slug), file);
  if (previousSlug && previousSlug !== source.slug && isSlug(previousSlug)) {
    const previous = postPath(previousSlug);
    if (fs.existsSync(previous)) fs.unlinkSync(previous);
  }
  return { ok: true as const, where: "file" as const };
}

const IMAGE_PATH = /^public\/images\/[a-z0-9]+(?:-[a-z0-9]+)*\.(png|jpe?g|gif|webp|svg)$/;

export async function bytesExist(relativePath: string) {
  if (!IMAGE_PATH.test(relativePath)) return false;
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  if (token && repo) {
    const current = await githubRequest(repo, relativePath);
    return current.ok;
  }
  if (process.env.VERCEL) return false;
  return fs.existsSync(path.join(process.cwd(), "public", "images", path.basename(relativePath)));
}

export async function saveBytes(relativePath: string, bytes: Buffer, message: string) {
  if (!IMAGE_PATH.test(relativePath)) {
    return { ok: false as const, error: "That image path is not allowed.", status: 400 };
  }

  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  if (token && repo) {
    await githubWrite(repo, relativePath, bytes, message);
    return { ok: true as const, where: "github" as const };
  }

  if (process.env.VERCEL) {
    return {
      ok: false as const,
      status: 503,
      error:
        "Saving from the live site needs GITHUB_TOKEN and GITHUB_REPO. The file is not changed.",
    };
  }

  const file = path.join(process.cwd(), "public", "images", path.basename(relativePath));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);
  return { ok: true as const, where: "file" as const };
}
