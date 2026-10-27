import { execFileSync } from "node:child_process";
import fs from "node:fs";

const before = process.env.BEFORE ?? "";
const after = process.env.AFTER || "HEAD";
const zero = /^0+$/.test(before);

function frontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1] : "";
}

function field(text, name) {
  const match = frontmatter(text).match(new RegExp(`^${name}:\\s*(.*)$`, "m"));
  if (!match) return "";
  return match[1].trim().replace(/^"(.*)"$/, "$1");
}

function readAt(rev, file) {
  try {
    return execFileSync("git", ["show", `${rev}:${file}`], { encoding: "utf8" });
  } catch {
    return "";
  }
}

function changedFiles() {
  if (zero || !before) return [];
  return execFileSync(
    "git",
    ["diff", "--name-only", "--diff-filter=AM", before, after, "--", "content/posts"],
    { encoding: "utf8" },
  )
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.endsWith(".mdx"));
}

function newlyEmailed(file) {
  const next = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : readAt(after, file);
  if (field(next, "status") !== "published") return null;
  if (!wantsEmail(next)) return null;
  if (field(next, "title").startsWith("Sample:")) return null;
  const previous = before && !zero ? readAt(before, file) : "";
  if (wantsEmail(previous)) return null;
  return {
    title: field(next, "title"),
    subtitle: field(next, "subtitle"),
    tldr: field(next, "tldr"),
    slug: field(next, "slug") || file.split("/").pop().replace(/\.mdx$/, ""),
  };
}

function wantsEmail(text) {
  const value = field(text, "subscribers").toLowerCase();
  return value === "yes" || value === "true";
}

async function send(post) {
  const site = (process.env.SITE_URL || "").replace(/\/$/, "");
  const url = `${site}/writing/${post.slug}`;
  const response = await fetch("https://api.resend.com/broadcasts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "User-Agent": "torah-site",
    },
    body: JSON.stringify({
      segment_id: process.env.RESEND_SEGMENT_ID,
      from: process.env.CONTACT_FROM_EMAIL,
      subject: post.title,
      name: post.slug,
      send: true,
      html: `<p>${escapeHtml(post.title)}</p>${
        post.subtitle ? `<p><em>${escapeHtml(post.subtitle)}</em></p>` : ""
      }<p>${escapeHtml(post.tldr)}</p><p><a href="${escapeHtml(url)}">Read the piece</a></p><p><a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a></p>`,
      text: `${post.title}\n\n${post.subtitle ? `${post.subtitle}\n\n` : ""}${post.tldr}\n\nRead the piece: ${url}`,
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend ${response.status}: ${await response.text()}`);
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const posts = changedFiles().map(newlyEmailed).filter(Boolean);
if (posts.length === 0) {
  console.log(zero || !before ? "First push; existing posts were not emailed." : "No posts newly marked for subscribers.");
  process.exit(0);
}

if (
  !process.env.RESEND_API_KEY ||
  !process.env.RESEND_SEGMENT_ID ||
  !process.env.CONTACT_FROM_EMAIL ||
  !process.env.SITE_URL
) {
  console.log(
    `New posts (${posts.map((post) => post.slug).join(", ")}) were not emailed. Set RESEND_API_KEY, RESEND_SEGMENT_ID, CONTACT_FROM_EMAIL, and SITE_URL.`,
  );
  process.exit(0);
}

for (const post of posts) {
  await send(post);
  console.log(`Emailed ${post.slug}`);
}
