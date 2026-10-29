// Turns ready audio scripts into MP3s with ElevenLabs, then adds the player to the post.
//
// An audio script is narrated only when it lives at content/audio-scripts/<slug>.md,
// a post exists at content/posts/<slug>.mdx, no public/audio/<slug>.mp3 exists yet,
// and the script starts with this frontmatter:
//
//   ---
//   status: ready
//   ---
//
// To regenerate an episode, delete its MP3 and push.
// Without ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID this exits quietly.

import fs from "node:fs";
import path from "node:path";

const API_KEY = process.env.ELEVENLABS_API_KEY || "";
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "";
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
const OUTPUT_FORMAT = "mp3_44100_128";
const CHUNK_CHARS = 2500;
const MAX_SCRIPT_CHARS = 30000;

const SCRIPTS_DIR = "content/audio-scripts";
const POSTS_DIR = "content/posts";
const AUDIO_DIR = "public/audio";

function log(message) {
  console.log(`[audio] ${message}`);
}

function splitFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { meta: "", body: text };
  return { meta: match[1], body: text.slice(match[0].length) };
}

function isReady(meta) {
  return /^status:\s*"?ready"?\s*$/m.test(meta);
}

function chunk(body) {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const chunks = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if (paragraph.length > CHUNK_CHARS) {
      if (current) chunks.push(current);
      current = "";
      const sentences = paragraph.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [paragraph];
      for (const sentence of sentences) {
        if ((current + sentence).length > CHUNK_CHARS && current) {
          chunks.push(current.trim());
          current = "";
        }
        current += sentence;
      }
      continue;
    }
    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length > CHUNK_CHARS && current) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = next;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function speak(text, previousText, nextText) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(VOICE_ID)}?output_format=${OUTPUT_FORMAT}`;
  const body = { text, model_id: MODEL_ID };
  if (previousText) body.previous_text = previousText.slice(-1000);
  if (nextText) body.next_text = nextText.slice(0, 1000);
  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify(body),
    });
    if (response.ok) return Buffer.from(await response.arrayBuffer());
    const detail = await response.text();
    if (response.status === 429 || response.status >= 500) {
      log(`ElevenLabs ${response.status}, retrying (${attempt}/3)`);
      await new Promise((resolve) => setTimeout(resolve, 5000 * attempt));
      continue;
    }
    throw new Error(`ElevenLabs ${response.status}: ${detail.slice(0, 300)}`);
  }
  throw new Error("ElevenLabs kept failing after 3 attempts");
}

function addAudioLine(postFile, slug) {
  const text = fs.readFileSync(postFile, "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error(`${postFile} has no frontmatter`);
  const line = `audio: /audio/${slug}.mp3`;
  let meta = match[1];
  if (/^audio:.*$/m.test(meta)) {
    meta = meta.replace(/^audio:.*$/m, line);
  } else if (/^ideaMap:.*$/m.test(meta)) {
    meta = meta.replace(/^(ideaMap:.*)$/m, `${line}\n$1`);
  } else {
    meta = meta.replace(/^(status:.*)$/m, `${line}\n$1`);
  }
  fs.writeFileSync(postFile, text.replace(match[1], meta));
}

async function main() {
  if (!API_KEY || !VOICE_ID) {
    log("ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID is not set; nothing to do.");
    return;
  }
  if (!fs.existsSync(SCRIPTS_DIR)) return;
  fs.mkdirSync(AUDIO_DIR, { recursive: true });

  const made = [];
  for (const name of fs.readdirSync(SCRIPTS_DIR).sort()) {
    if (!name.endsWith(".md")) continue;
    const slug = name.replace(/\.md$/, "");
    const postFile = path.join(POSTS_DIR, `${slug}.mdx`);
    const mp3File = path.join(AUDIO_DIR, `${slug}.mp3`);
    if (!fs.existsSync(postFile) || fs.existsSync(mp3File)) continue;

    const { meta, body } = splitFrontmatter(fs.readFileSync(path.join(SCRIPTS_DIR, name), "utf8"));
    if (!isReady(meta)) continue;
    if (body.length > MAX_SCRIPT_CHARS) {
      log(`${slug}: script is ${body.length} characters, over the ${MAX_SCRIPT_CHARS} safety limit; skipped.`);
      continue;
    }

    const parts = chunk(body);
    log(`${slug}: ${body.length} characters in ${parts.length} pieces with ${MODEL_ID}`);
    const audio = [];
    for (let i = 0; i < parts.length; i++) {
      audio.push(await speak(parts[i], parts[i - 1], parts[i + 1]));
      log(`${slug}: piece ${i + 1}/${parts.length} done`);
    }
    fs.writeFileSync(mp3File, Buffer.concat(audio));
    addAudioLine(postFile, slug);
    made.push(slug);
  }

  log(made.length ? `Narrated: ${made.join(", ")}` : "No ready scripts without audio.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
