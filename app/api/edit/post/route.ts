import { NextResponse } from "next/server";
import { canEditRequest } from "@/lib/edit-auth";
import { isSlug, type PostSource } from "@/lib/posts";
import { savePost } from "@/lib/save-post";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  if (!(await canEditRequest())) {
    return NextResponse.json({ error: "You are not signed in to edit." }, { status: 401 });
  }

  const body = (await request.json()) as Partial<PostSource> & {
    previousSlug?: string;
  };
  const source: PostSource = {
    slug: text(body.slug),
    title: text(body.title),
    subtitle: text(body.subtitle),
    date: text(body.date),
    track: text(body.track),
    series: text(body.series),
    part: text(body.part),
    tldr: text(body.tldr),
    audio: text(body.audio),
    ideaMap: text(body.ideaMap),
    status: text(body.status),
    subscribers: text(body.subscribers) === "yes" ? "yes" : "",
    body: typeof body.body === "string" ? body.body : "",
  };
  const previousSlug = text(body.previousSlug);
  if (previousSlug && !isSlug(previousSlug)) {
    return NextResponse.json({ error: "The original slug is not valid." }, { status: 400 });
  }
  if (source.body.length > 100_000) {
    return NextResponse.json({ error: "That post is too long." }, { status: 400 });
  }

  try {
    const saved = await savePost(source, previousSlug || undefined);
    if (!saved.ok) {
      return NextResponse.json({ error: saved.error }, { status: saved.status });
    }
    return NextResponse.json({
      ok: true,
      slug: source.slug,
      where: saved.where,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Save post failed", message);
    return NextResponse.json(
      { error: "The post could not be saved." },
      { status: 502 },
    );
  }
}
