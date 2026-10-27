"use client";

import {
  blockId,
  emptyParagraph,
  type Block,
  type Inline,
  type SourceRow,
  type WrestlingItem,
} from "@/lib/blocks";

const adders = [
  ["paragraph", "Paragraph"],
  ["heading", "Section"],
  ["quote", "Quote"],
  ["hebrew", "Hebrew"],
  ["wrestling", "Wrestling"],
  ["turn", "Your turn"],
  ["sources", "Sources"],
] as const;

function fresh(kind: (typeof adders)[number][0]): Block {
  if (kind === "heading") return { id: blockId(), type: "heading", text: "" };
  if (kind === "quote") return { id: blockId(), type: "quote", text: "" };
  if (kind === "turn") return { id: blockId(), type: "turn", text: "" };
  if (kind === "wrestling") {
    return { id: blockId(), type: "wrestling", items: [{ label: "", text: "" }] };
  }
  if (kind === "sources") {
    return {
      id: blockId(),
      type: "sources",
      rows: [{ source: "", linkText: "", href: "", certainty: "" }],
    };
  }
  if (kind === "hebrew") {
    return { id: blockId(), type: "paragraph", parts: [{ kind: "hebrew", text: "" }] };
  }
  return emptyParagraph();
}

export function BlockEditor({
  blocks,
  onChange,
  uploading,
  onPickImage,
}: {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  uploading: boolean;
  onPickImage: () => void;
}) {
  function update(id: string, next: Block) {
    onChange(blocks.map((block) => (block.id === id ? next : block)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  }

  function remove(id: string) {
    const next = blocks.filter((block) => block.id !== id);
    onChange(next.length ? next : [emptyParagraph()]);
  }

  return (
    <div className="pieces">
      <div className="piece-add">
        {adders.map(([kind, label]) => (
          <button
            key={kind}
            className="text-button"
            type="button"
            onClick={() => onChange([...blocks, fresh(kind)])}
          >
            {label}
          </button>
        ))}
        <button
          className="text-button"
          type="button"
          disabled={uploading}
          onClick={onPickImage}
        >
          {uploading ? "Adding image" : "Image"}
        </button>
      </div>
      {blocks.map((block, index) => (
        <section className="piece" key={block.id}>
          <div className="piece-bar">
            <span className="kicker">{labelFor(block)}</span>
            <button className="text-button" type="button" onClick={() => move(index, -1)}>
              Up
            </button>
            <button className="text-button" type="button" onClick={() => move(index, 1)}>
              Down
            </button>
            <button className="text-button" type="button" onClick={() => remove(block.id)}>
              Remove
            </button>
          </div>
          {block.type === "paragraph" ? (
            <ParagraphBlock
              parts={block.parts}
              onChange={(parts) => update(block.id, { ...block, parts })}
            />
          ) : null}
          {block.type === "heading" ? (
            <input
              value={block.text}
              onChange={(event) => update(block.id, { ...block, text: event.target.value })}
            />
          ) : null}
          {block.type === "quote" || block.type === "turn" ? (
            <textarea
              rows={3}
              value={block.text}
              onChange={(event) => update(block.id, { ...block, text: event.target.value })}
            />
          ) : null}
          {block.type === "wrestling" ? (
            <WrestlingBlock
              items={block.items}
              onChange={(items) => update(block.id, { ...block, items })}
            />
          ) : null}
          {block.type === "sources" ? (
            <SourcesBlock
              rows={block.rows}
              onChange={(rows) => update(block.id, { ...block, rows })}
            />
          ) : null}
          {block.type === "raw" ? (
            <textarea
              className="editor-body"
              rows={8}
              value={block.text}
              onChange={(event) => update(block.id, { ...block, text: event.target.value })}
            />
          ) : null}
        </section>
      ))}
    </div>
  );
}

function labelFor(block: Block) {
  if (
    block.type === "paragraph" &&
    block.parts.length === 1 &&
    block.parts[0].kind === "hebrew"
  ) {
    return "Hebrew";
  }
  if (
    block.type === "paragraph" &&
    block.parts.length === 1 &&
    block.parts[0].kind === "image"
  ) {
    return "Image";
  }
  if (block.type === "paragraph") return "Paragraph";
  if (block.type === "heading") return "Section";
  if (block.type === "quote") return "Quote";
  if (block.type === "wrestling") return "Wrestling";
  if (block.type === "turn") return "Your turn";
  if (block.type === "sources") return "Sources";
  return "Text";
}

function ParagraphBlock({
  parts,
  onChange,
}: {
  parts: Inline[];
  onChange: (parts: Inline[]) => void;
}) {
  function setPart(index: number, part: Inline) {
    onChange(parts.map((item, i) => (i === index ? part : item)));
  }

  function add(part: Inline) {
    const next = [...parts];
    if (next.length === 1 && next[0].kind === "text" && !next[0].text) next.pop();
    next.push(part);
    onChange(next);
  }

  return (
    <>
      {parts.map((part, index) => (
        <div className="part" key={`${part.kind}-${index}`}>
          {part.kind === "text" ? (
            <textarea
              rows={part.text.includes("\n") ? 5 : 3}
              value={part.text}
              onChange={(event) => setPart(index, { ...part, text: event.target.value })}
            />
          ) : null}
          {part.kind === "bold" || part.kind === "italic" ? (
            <label>
              <span className="kicker">{part.kind === "bold" ? "Bold" : "Italic"}</span>
              <input
                className={part.kind}
                value={part.text}
                onChange={(event) => setPart(index, { ...part, text: event.target.value })}
              />
            </label>
          ) : null}
          {part.kind === "hebrew" ? (
            <label>
              <span className="kicker">Hebrew</span>
              <input
                className="he-input"
                dir="rtl"
                lang="he"
                value={part.text}
                onChange={(event) => setPart(index, { ...part, text: event.target.value })}
              />
            </label>
          ) : null}
          {part.kind === "link" ? (
            <div className="editor-row">
              <label>
                <span className="kicker">Link text</span>
                <input
                  value={part.text}
                  onChange={(event) => setPart(index, { ...part, text: event.target.value })}
                />
              </label>
              <label>
                <span className="kicker">Address</span>
                <input
                  value={part.href}
                  placeholder="https://"
                  spellCheck={false}
                  onChange={(event) => setPart(index, { ...part, href: event.target.value })}
                />
              </label>
            </div>
          ) : null}
          {part.kind === "image" ? (
            <label>
              <span className="kicker">Image</span>
              {part.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={part.src} alt={part.alt || ""} />
              ) : null}
              <input
                value={part.alt}
                placeholder="Caption"
                onChange={(event) => setPart(index, { ...part, alt: event.target.value })}
              />
            </label>
          ) : null}
          {parts.length > 1 ? (
            <button
              className="text-button"
              type="button"
              onClick={() => onChange(parts.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          ) : null}
        </div>
      ))}
      <div className="piece-add">
        <button className="text-button" type="button" onClick={() => add({ kind: "text", text: "" })}>
          Words
        </button>
        <button className="text-button" type="button" onClick={() => add({ kind: "bold", text: "" })}>
          Bold
        </button>
        <button className="text-button" type="button" onClick={() => add({ kind: "hebrew", text: "" })}>
          Hebrew
        </button>
        <button
          className="text-button"
          type="button"
          onClick={() => add({ kind: "link", text: "", href: "" })}
        >
          Link
        </button>
      </div>
    </>
  );
}

function WrestlingBlock({
  items,
  onChange,
}: {
  items: WrestlingItem[];
  onChange: (items: WrestlingItem[]) => void;
}) {
  return (
    <>
      {items.map((item, index) => (
        <div className="part" key={index}>
          <label>
            <span className="kicker">Name</span>
            <input
              value={item.label}
              onChange={(event) =>
                onChange(items.map((row, i) => (i === index ? { ...row, label: event.target.value } : row)))
              }
            />
          </label>
          <label>
            <span className="kicker">Question</span>
            <textarea
              rows={3}
              value={item.text}
              onChange={(event) =>
                onChange(items.map((row, i) => (i === index ? { ...row, text: event.target.value } : row)))
              }
            />
          </label>
          {items.length > 1 ? (
            <button
              className="text-button"
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          ) : null}
        </div>
      ))}
      <button
        className="text-button"
        type="button"
        onClick={() => onChange([...items, { label: "", text: "" }])}
      >
        Add a question
      </button>
    </>
  );
}

function SourcesBlock({
  rows,
  onChange,
}: {
  rows: SourceRow[];
  onChange: (rows: SourceRow[]) => void;
}) {
  function set(index: number, patch: Partial<SourceRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <>
      {rows.map((row, index) => (
        <div className="part" key={index}>
          <label>
            <span className="kicker">Source</span>
            <input value={row.source} onChange={(event) => set(index, { source: event.target.value })} />
          </label>
          <div className="editor-row">
            <label>
              <span className="kicker">Link text</span>
              <input
                value={row.linkText}
                onChange={(event) => set(index, { linkText: event.target.value })}
              />
            </label>
            <label>
              <span className="kicker">Address</span>
              <input
                value={row.href}
                placeholder="https://"
                spellCheck={false}
                onChange={(event) => set(index, { href: event.target.value })}
              />
            </label>
          </div>
          <label>
            <span className="kicker">Certainty</span>
            <input
              value={row.certainty}
              onChange={(event) => set(index, { certainty: event.target.value })}
            />
          </label>
          {rows.length > 1 ? (
            <button
              className="text-button"
              type="button"
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          ) : null}
        </div>
      ))}
      <button
        className="text-button"
        type="button"
        onClick={() =>
          onChange([...rows, { source: "", linkText: "", href: "", certainty: "" }])
        }
      >
        Add a source
      </button>
    </>
  );
}
