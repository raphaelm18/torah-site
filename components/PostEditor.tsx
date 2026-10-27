"use client";

import { useRef, useState, type FormEvent } from "react";
import { BlockEditor } from "@/components/BlockEditor";
import { blockId, parseBody, serializeBlocks, type Block } from "@/lib/blocks";

type Fields = {
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

const empty: Fields = {
  slug: "",
  title: "",
  subtitle: "",
  date: "",
  track: "wrestling",
  series: "",
  part: "",
  tldr: "",
  audio: "",
  ideaMap: "",
  status: "draft",
  subscribers: "",
  body: "",
};

export function PostEditor({
  initial,
  previousSlug,
}: {
  initial?: Fields;
  previousSlug?: string;
}) {
  const starting = initial ?? empty;
  const [source, setSource] = useState<Fields>(starting);
  const [blocks, setBlocks] = useState<Block[]>(() => parseBody(starting.body));
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [announced, setAnnounced] = useState(starting.subscribers === "yes");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof Fields>(key: K, value: Fields[K]) {
    setSource((current) => ({ ...current, [key]: value }));
  }

function imageFromClipboard(data: DataTransfer) {
  const item = [...data.items].find(
    (entry) => entry.kind === "file" && entry.type.startsWith("image/"),
  );
  const file =
    item?.getAsFile() ?? [...data.files].find((entry) => entry.type.startsWith("image/"));
  if (!file) return undefined;
  if (/\.(png|jpe?g|gif|webp|svg)$/i.test(file.name)) return file;
  const ext =
    file.type === "image/jpeg"
      ? "jpg"
      : (file.type.split("/")[1] || "png").replace("+xml", "");
  return new File([file], `pasted.${ext}`, { type: file.type || "image/png" });
}

  async function addImage(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError("");
    const data = new FormData();
    data.set("file", file);
    const response = await fetch("/api/edit/image", {
      method: "POST",
      body: data,
      headers: { Accept: "application/json" },
    });
    const body = (await response.json().catch(() => null)) as {
      error?: string;
      path?: string;
    } | null;
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (!response.ok || !body?.path) {
      setError(body?.error || "The image could not be saved.");
      return;
    }
    const bare = file.name.replace(/\.[^.]+$/, "");
    const alt = /^(image|pasted|blob)$/i.test(bare) ? "" : bare.replace(/[-_]+/g, " ");
    setBlocks((current) => [
      ...current,
      {
        id: blockId(),
        type: "paragraph",
        parts: [{ kind: "image", alt, src: body.path ?? "" }],
      },
    ]);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSaved("");
    const response = await fetch("/api/edit/post", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        ...source,
        body: serializeBlocks(blocks).trim(),
        previousSlug,
      }),
    });
    const body = (await response.json().catch(() => null)) as {
      error?: string;
      slug?: string;
      where?: string;
    } | null;
    setPending(false);
    if (!response.ok) {
      setError(body?.error || "The post could not be saved.");
      return;
    }
    const freshEmail = source.subscribers === "yes" && !announced;
    if (source.subscribers === "yes") setAnnounced(true);
    const where =
      freshEmail && body?.where === "github"
        ? "Saved. Subscribers get the note when this deploy finishes."
        : freshEmail
          ? "Saved on this machine. Subscribers are emailed when you push this."
          : body?.where === "github"
            ? "Saved. The live site updates when the deploy finishes."
            : "Saved the file on this machine. Restart the site to see it.";
    setSaved(where);
    if (body?.slug && body.slug !== previousSlug) {
      window.history.replaceState(null, "", `/writing/${body.slug}/edit`);
    }
  }

  return (
    <form
      className="fields editor"
      onSubmit={onSubmit}
      onPaste={(event) => {
        const file = imageFromClipboard(event.clipboardData);
        if (!file) return;
        event.preventDefault();
        void addImage(file);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
          event.preventDefault();
        }
      }}
    >
      <label>
        <span className="kicker">Title</span>
        <input
          value={source.title}
          onChange={(event) => set("title", event.target.value)}
          required
        />
      </label>
      <label>
        <span className="kicker">Subtitle</span>
        <input
          value={source.subtitle}
          onChange={(event) => set("subtitle", event.target.value)}
        />
      </label>
      <label>
        <span className="kicker">Slug</span>
        <input
          value={source.slug}
          onChange={(event) => set("slug", event.target.value)}
          required
          spellCheck={false}
        />
      </label>
      <div className="editor-row">
        <label>
          <span className="kicker">Date</span>
          <input
            value={source.date}
            onChange={(event) => set("date", event.target.value)}
            placeholder="YYYY-MM-DD"
            required
          />
        </label>
        <label>
          <span className="kicker">Track</span>
          <select
            value={source.track}
            onChange={(event) => set("track", event.target.value)}
          >
            <option value="wrestling">Wrestling</option>
            <option value="connecting">Connecting</option>
          </select>
        </label>
        <label>
          <span className="kicker">Status</span>
          <select
            value={source.status}
            onChange={(event) => {
              const status = event.target.value;
              setSource((current) => ({
                ...current,
                status,
                subscribers: status === "published" ? current.subscribers : "",
              }));
              if (status !== "published") setAnnounced(false);
            }}
          >
            <option value="draft">Draft</option>
            <option value="published">On the site</option>
          </select>
        </label>
      </div>
      {source.status === "published" ? (
        <label className="check">
          <input
            type="checkbox"
            checked={source.subscribers === "yes"}
            onChange={(event) => {
              set("subscribers", event.target.checked ? "yes" : "");
              if (!event.target.checked) setAnnounced(false);
            }}
          />
          <span>Email subscribers</span>
        </label>
      ) : null}
      {source.status === "published" ? (
        <p className="editor-hint">
          On the site, you can keep tinkering. Subscribers get a note only when
          this is checked and the change is pushed. Checking it again later
          sends another note.
        </p>
      ) : null}
      <div className="editor-row">
        <label>
          <span className="kicker">Series</span>
          <input
            value={source.series}
            onChange={(event) => set("series", event.target.value)}
          />
        </label>
        <label>
          <span className="kicker">Part</span>
          <input
            value={source.part}
            onChange={(event) => set("part", event.target.value)}
            inputMode="numeric"
          />
        </label>
      </div>
      <label>
        <span className="kicker">TL;DR</span>
        <textarea
          value={source.tldr}
          onChange={(event) => set("tldr", event.target.value)}
          required
          rows={3}
        />
      </label>
      <label>
        <span className="kicker">Audio path</span>
        <input
          value={source.audio}
          onChange={(event) => set("audio", event.target.value)}
          placeholder="/audio/slug.mp3"
          spellCheck={false}
        />
      </label>
      <label>
        <span className="kicker">Idea map path</span>
        <input
          value={source.ideaMap}
          onChange={(event) => set("ideaMap", event.target.value)}
          placeholder="/maps/slug.svg"
          spellCheck={false}
        />
      </label>
      <BlockEditor
        blocks={blocks}
        onChange={setBlocks}
        uploading={uploading}
        onPickImage={() => fileRef.current?.click()}
      />
      <input
        ref={fileRef}
        className="hp"
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml,.svg"
        onChange={(event) => addImage(event.target.files?.[0])}
      />
      <p className="editor-hint">
        Write in the boxes. Paste an image into one, or use Image. Section, quote,
        Hebrew, wrestling, and sources are buttons.
      </p>
      {error ? (
        <p className="form-note error" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="form-note" role="status">
          {saved}
        </p>
      ) : null}
      <button className="send" type="submit" disabled={pending}>
        {pending ? "Saving" : "Save"}
      </button>
    </form>
  );
}
