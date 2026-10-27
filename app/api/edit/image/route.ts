import { NextResponse } from "next/server";
import { canEditRequest } from "@/lib/edit-auth";
import { bytesExist, saveBytes } from "@/lib/save-post";

const TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
};

const MAX_BYTES = 5 * 1024 * 1024;

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

function extensionOf(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (TYPES[fromName]) return fromName;
  return EXT_BY_TYPE[file.type] ?? "";
}

function stemOf(name: string) {
  const dot = name.lastIndexOf(".");
  const raw = (dot > 0 ? name.slice(0, dot) : name).toLowerCase();
  const stem = raw.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  return stem || "image";
}

export async function POST(request: Request) {
  if (!(await canEditRequest())) {
    return NextResponse.json({ error: "You are not signed in to edit." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Images need to be under 5 MB." }, { status: 400 });
  }

  const ext = extensionOf(file);
  const expected = TYPES[ext];
  if (!expected || (file.type && file.type !== expected && file.type !== "application/octet-stream")) {
    return NextResponse.json(
      { error: "Use a PNG, JPEG, GIF, WebP, or SVG." },
      { status: 400 },
    );
  }

  const stem = stemOf(file.name);
  let filename = `${stem}.${ext}`;
  for (let n = 2; n < 50; n += 1) {
    const relative = `public/images/${filename}`;
    if (!(await bytesExist(relative))) break;
    filename = `${stem}-${n}.${ext}`;
  }

  const relative = `public/images/${filename}`;
  try {
    const saved = await saveBytes(
      relative,
      Buffer.from(await file.arrayBuffer()),
      `Add image ${filename}`,
    );
    if (!saved.ok) {
      return NextResponse.json({ error: saved.error }, { status: saved.status });
    }
    return NextResponse.json({
      ok: true,
      path: `/images/${filename}`,
      where: saved.where,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Save image failed", message);
    return NextResponse.json({ error: "The image could not be saved." }, { status: 502 });
  }
}
