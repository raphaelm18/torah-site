export type Inline =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "italic"; text: string }
  | { kind: "hebrew"; text: string }
  | { kind: "link"; text: string; href: string }
  | { kind: "image"; alt: string; src: string };

export type WrestlingItem = { label: string; text: string };

export type SourceRow = {
  source: string;
  linkText: string;
  href: string;
  certainty: string;
};

export type Block =
  | { id: string; type: "paragraph"; parts: Inline[] }
  | { id: string; type: "heading"; text: string }
  | { id: string; type: "quote"; text: string }
  | { id: string; type: "wrestling"; items: WrestlingItem[] }
  | { id: string; type: "turn"; text: string }
  | { id: string; type: "sources"; rows: SourceRow[] }
  | { id: string; type: "raw"; text: string };

let counter = 0;

export function blockId() {
  counter += 1;
  return `b${counter}-${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyParagraph(): Block {
  return { id: blockId(), type: "paragraph", parts: [{ kind: "text", text: "" }] };
}

function parseInlines(chunk: string): Inline[] {
  const parts: Inline[] = [];
  const re =
    /<He>([\s\S]*?)<\/He>|\*\*([^*]+)\*\*|\*([^*]+)\*|!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  for (const match of chunk.matchAll(re)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ kind: "text", text: chunk.slice(last, index) });
    if (match[1] != null) parts.push({ kind: "hebrew", text: match[1] });
    else if (match[2] != null) parts.push({ kind: "bold", text: match[2] });
    else if (match[3] != null) parts.push({ kind: "italic", text: match[3] });
    else if (match[5] != null) parts.push({ kind: "image", alt: match[4] ?? "", src: match[5] });
    else if (match[7] != null) parts.push({ kind: "link", text: match[6] ?? "", href: match[7] });
    last = index + match[0].length;
  }
  if (last < chunk.length) parts.push({ kind: "text", text: chunk.slice(last) });
  return parts.length ? parts : [{ kind: "text", text: "" }];
}

function parseWrestling(inner: string): WrestlingItem[] {
  const items: WrestlingItem[] = [];
  for (const line of inner.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("- ")) continue;
    const rest = trimmed.slice(2);
    const labeled = rest.match(/^\*\*(.+?)\*\*\s*([\s\S]*)$/);
    if (labeled) items.push({ label: labeled[1], text: labeled[2] });
    else items.push({ label: "", text: rest });
  }
  return items.length ? items : [{ label: "", text: "" }];
}

function parseSources(inner: string): SourceRow[] {
  const rows: SourceRow[] = [];
  for (const line of inner.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    if (/^\|\s*-+/.test(trimmed)) continue;
    if (/^\|\s*Source\s*\|/i.test(trimmed)) continue;
    const cells = trimmed.split("|").slice(1, -1).map((cell) => cell.trim());
    const link = cells[1] ?? "";
    const linked = link.match(/^\[([^\]]*)\]\(([^)]+)\)$/);
    rows.push({
      source: cells[0] ?? "",
      linkText: linked ? linked[1] : link,
      href: linked ? linked[2] : /^https?:\/\//.test(link) ? link : "",
      certainty: cells[2] ?? "",
    });
  }
  return rows.length
    ? rows
    : [{ source: "", linkText: "", href: "", certainty: "" }];
}

export function parseBody(input: string): Block[] {
  const lines = input.replace(/\r\n/g, "\n").replace(/^\n+|\n+$/g, "").split("\n");
  const blocks: Block[] = [];
  let buffer: string[] = [];

  function flush() {
    const chunk = buffer.join("\n").trim();
    buffer = [];
    if (!chunk) return;
    if (/^```/m.test(chunk) || /^[-*] /m.test(chunk)) {
      blocks.push({ id: blockId(), type: "raw", text: chunk });
      return;
    }
    blocks.push({ id: blockId(), type: "paragraph", parts: parseInlines(chunk) });
  }

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      flush();
      continue;
    }

    const heading = trimmed.match(/^\*\*([^*]+)\*\*$/);
    if (heading) {
      flush();
      blocks.push({ id: blockId(), type: "heading", text: heading[1] });
      continue;
    }

    const single = trimmed.match(/^<(PullQuote|YourTurn)>([\s\S]*)<\/\1>$/);
    if (single) {
      flush();
      blocks.push(
        single[1] === "PullQuote"
          ? { id: blockId(), type: "quote", text: single[2] }
          : { id: blockId(), type: "turn", text: single[2] },
      );
      continue;
    }

    const opener = trimmed.match(/^<(PullQuote|Wrestling|YourTurn|Sources)>$/);
    if (opener) {
      flush();
      const tag = opener[1];
      const inner: string[] = [];
      let closed = false;
      for (i += 1; i < lines.length; i += 1) {
        if (lines[i].trim() === `</${tag}>`) {
          closed = true;
          break;
        }
        inner.push(lines[i]);
      }
      const content = inner.join("\n").trim();
      if (!closed) {
        blocks.push({ id: blockId(), type: "raw", text: `<${tag}>\n${content}` });
        continue;
      }
      if (tag === "PullQuote") blocks.push({ id: blockId(), type: "quote", text: content });
      else if (tag === "YourTurn") blocks.push({ id: blockId(), type: "turn", text: content });
      else if (tag === "Wrestling") {
        blocks.push({ id: blockId(), type: "wrestling", items: parseWrestling(content) });
      } else blocks.push({ id: blockId(), type: "sources", rows: parseSources(content) });
      continue;
    }

    buffer.push(lines[i]);
  }

  flush();
  return blocks.length ? blocks : [emptyParagraph()];
}

function serializeInline(part: Inline) {
  if (part.kind === "text") return part.text;
  if (part.kind === "bold") return `**${part.text}**`;
  if (part.kind === "italic") return `*${part.text}*`;
  if (part.kind === "hebrew") return `<He>${part.text}</He>`;
  if (part.kind === "link") return `[${part.text}](${part.href})`;
  return `![${part.alt}](${part.src})`;
}

function serializeBlock(block: Block) {
  if (block.type === "heading") return `**${block.text}**`;
  if (block.type === "quote") return `<PullQuote>${block.text}</PullQuote>`;
  if (block.type === "turn") return `<YourTurn>${block.text}</YourTurn>`;
  if (block.type === "raw") return block.text;
  if (block.type === "paragraph") return block.parts.map(serializeInline).join("");
  if (block.type === "wrestling") {
    const items = block.items
      .map((item) =>
        item.label.trim()
          ? `- **${item.label.trim()}** ${item.text.trim()}`.trim()
          : `- ${item.text.trim()}`,
      )
      .join("\n\n");
    return `<Wrestling>\n\n${items}\n\n</Wrestling>`;
  }
  const rows = block.rows
    .map((row) => {
      const link = row.href.trim()
        ? `[${row.linkText.trim() || row.href.trim()}](${row.href.trim()})`
        : row.linkText.trim();
      return `| ${row.source.trim()} | ${link} | ${row.certainty.trim()} |`;
    })
    .join("\n");
  return `<Sources>\n\n| Source | Link | Certainty |\n| --- | --- | --- |\n${rows}\n\n</Sources>`;
}

export function serializeBlocks(blocks: Block[]) {
  return `${blocks.map(serializeBlock).filter((block) => block.trim()).join("\n\n")}\n`;
}
