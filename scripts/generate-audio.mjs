// Turns ready audio scripts into MP3s with ElevenLabs, then adds the player to the post.
//
// An audio script is narrated only when it lives at content/audio-scripts/<slug>.md,
// a post exists at content/posts/<slug>.mdx, and the script starts with:
//
//   ---
//   status: ready
//   ---
//
// Each episode is still one MP3. Behind it, the script is split into pieces and each
// piece's audio is kept in a cache (.audio-cache, saved between runs by the workflow).
//
// - New script, no MP3 yet: every piece is narrated fresh.
// - Edited script (a fixed word or sentence): only the pieces whose text changed are
//   narrated again; the rest come from the cache, so a small fix costs a fraction of
//   an episode. content/audio-scripts/narrated.json remembers which version of each
//   script the current MP3 matches.
// - Deleted MP3: the whole episode is narrated fresh, ignoring the cache. Use this
//   for a new take of the same text.
//
// Without ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID this exits quietly.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const API_KEY = process.env.ELEVENLABS_API_KEY || "";
function configuredVoice() {
  try {
    return JSON.parse(fs.readFileSync("narration.config.json", "utf8")).voiceId || "";
  } catch {
    return "";
  }
}
const VOICE_ID = configuredVoice() || process.env.ELEVENLABS_VOICE_ID || "";
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
const OUTPUT_FORMAT = "mp3_44100_128";
const MIN_CHUNK_CHARS = 1000; // a piece may end at a natural break once it's this long
const MAX_CHUNK_CHARS = 2500; // and must end before it gets longer (ElevenLabs caps at 5,000)
const MAX_SCRIPT_CHARS = 30000;

const SCRIPTS_DIR = "content/audio-scripts";
const POSTS_DIR = "content/posts";
const AUDIO_DIR = "public/audio";
const CACHE_DIR = ".audio-cache";
const MANIFEST = path.join(SCRIPTS_DIR, "narrated.json");
const SAMPLES_DIR = "content/audio-samples"; // test recordings, e.g. the pronunciation check
const SAMPLES_OUT = "public/audio/samples";
const DICT_TSV = "content/pronunciation/hebrew.tsv"; // word<TAB>how to say it
const DICT_STATE = "content/pronunciation/dictionary.json"; // the dictionary's id and version in ElevenLabs

function log(message) {
  console.log(`[audio] ${message}`);
}

function sha(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function splitFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { meta: "", body: text };
  return { meta: match[1], body: text.slice(match[0].length) };
}

function isReady(meta) {
  return /^status:\s*"?ready"?\s*$/m.test(meta);
}

// Paragraphs, with any paragraph too long for one piece split into sentence runs.
function units(body) {
  const out = [];
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  for (const paragraph of paragraphs) {
    if (paragraph.length <= MAX_CHUNK_CHARS) {
      out.push(paragraph);
      continue;
    }
    const sentences = paragraph.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [paragraph];
    let current = "";
    for (const sentence of sentences) {
      if ((current + sentence).length > MAX_CHUNK_CHARS && current) {
        out.push(current.trim());
        current = "";
      }
      current += sentence;
    }
    if (current.trim()) out.push(current.trim());
  }
  return out;
}

// Groups paragraphs into pieces. Where a piece ends depends on the paragraph text
// itself (a hash), not only on running length, so an edit in one place leaves the
// boundaries elsewhere unchanged and only nearby pieces need new audio.
function chunk(body) {
  const pieces = [];
  let current = "";
  for (const unit of units(body)) {
    const next = current ? `${current}\n\n${unit}` : unit;
    if (current && next.length > MAX_CHUNK_CHARS) {
      pieces.push(current);
      current = unit;
    } else {
      current = next;
    }
    const naturalBreak = parseInt(sha(unit).slice(0, 8), 16) % 3 === 0;
    if (current.length >= MIN_CHUNK_CHARS && naturalBreak) {
      pieces.push(current);
      current = "";
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

// ---- Pronunciation dictionary ----
// content/pronunciation/hebrew.tsv lists Hebrew words and how to say them. It is saved to
// ElevenLabs as a dictionary of alias rules and applied to every narration. Only the
// entries a piece actually uses count toward its cache key, so fixing one word
// re-narrates only the pieces (and episodes) that contain that word.

function readRules() {
  if (!fs.existsSync(DICT_TSV)) return [];
  return fs
    .readFileSync(DICT_TSV, "utf8")
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("#"))
    .map((line) => {
      const [word, alias] = line.split("\t").map((x) => (x || "").trim());
      return { word, alias };
    })
    .filter((rule) => rule.word && rule.alias);
}

const RULES = readRules();

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rulesIn(text) {
  return RULES.filter((rule) =>
    new RegExp(`(^|[^\\p{L}])${escapeRegex(rule.word)}(?=$|[^\\p{L}])`, "iu").test(text),
  )
    .map((rule) => `${rule.word}=${rule.alias}`)
    .join("\n");
}

let dictionaryLocators = null;

async function saveDictionary(state, create) {
  const url = create
    ? "https://api.elevenlabs.io/v1/pronunciation-dictionaries/add-from-rules"
    : `https://api.elevenlabs.io/v1/pronunciation-dictionaries/${encodeURIComponent(state.id)}/set-rules`;
  const body = {
    rules: RULES.map((rule) => ({
      type: "alias",
      string_to_replace: rule.word,
      alias: rule.alias,
      case_sensitive: false,
      word_boundaries: true,
    })),
  };
  if (create) body.name = "Torah site Hebrew";
  return fetch(url, {
    method: "POST",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
}

// Makes sure ElevenLabs has the current dictionary. Runs only when something is about to
// be narrated, so a push that narrates nothing never touches the API.
async function ensureDictionary() {
  if (dictionaryLocators !== null) return dictionaryLocators;
  if (!RULES.length) return (dictionaryLocators = []);
  const hash = sha(JSON.stringify(RULES));
  let state = {};
  try {
    state = JSON.parse(fs.readFileSync(DICT_STATE, "utf8"));
  } catch {}
  if (!state.id || state.hash !== hash) {
    let response = await saveDictionary(state, !state.id);
    if (response.status === 404 && state.id) response = await saveDictionary(state, true);
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Could not save the pronunciation dictionary to ElevenLabs (${response.status}). ` +
          `The API key probably needs "Pronunciation Dictionaries" set to Write. ${detail.slice(0, 300)}`,
      );
    }
    const data = await response.json();
    state = { id: data.id || state.id, version_id: data.version_id, hash };
    fs.writeFileSync(DICT_STATE, `${JSON.stringify(state, null, 2)}\n`);
    log(`Pronunciation dictionary saved (${RULES.length} words).`);
  }
  dictionaryLocators = [{ pronunciation_dictionary_id: state.id, version_id: state.version_id }];
  return dictionaryLocators;
}

function cacheFile(text, model = MODEL_ID) {
  const key = `${model}\n${VOICE_ID}\n${OUTPUT_FORMAT}\n${rulesIn(text)}\n${text}`;
  return path.join(CACHE_DIR, `${sha(key)}.mp3`);
}

async function speak(text, previousText, nextText, model = MODEL_ID) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(VOICE_ID)}?output_format=${OUTPUT_FORMAT}`;
  const body = { text, model_id: model };
  const locators = await ensureDictionary();
  if (locators.length) body.pronunciation_dictionary_locators = locators;
  const contextOk = !model.startsWith("eleven_v3"); // v3 does not take neighbouring text
  if (contextOk && previousText) body.previous_text = previousText.slice(-1000);
  if (contextOk && nextText) body.next_text = nextText.slice(0, 1000);
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

function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  } catch {
    return {};
  }
}

function readyBody(file) {
  const { meta, body } = splitFrontmatter(fs.readFileSync(file, "utf8"));
  return isReady(meta) ? body : null;
}

// A sample may name its own model (model: eleven_v3) to compare models.
function sampleModel(file) {
  const { meta } = splitFrontmatter(fs.readFileSync(file, "utf8"));
  const match = meta.match(/^model:\s*"?([\w.-]+)"?\s*$/m);
  return match ? match[1] : MODEL_ID;
}

// Everything that could be narrated: episodes (one per post) and test samples.
function jobs() {
  const list = [];
  if (fs.existsSync(SCRIPTS_DIR)) {
    for (const name of fs.readdirSync(SCRIPTS_DIR).sort()) {
      if (!name.endsWith(".md")) continue;
      const slug = name.replace(/\.md$/, "");
      const postFile = path.join(POSTS_DIR, `${slug}.mdx`);
      if (!fs.existsSync(postFile)) continue;
      const body = readyBody(path.join(SCRIPTS_DIR, name));
      if (body !== null) list.push({ key: slug, body, postFile, mp3File: path.join(AUDIO_DIR, `${slug}.mp3`) });
    }
  }
  if (fs.existsSync(SAMPLES_DIR)) {
    for (const name of fs.readdirSync(SAMPLES_DIR).sort()) {
      if (!name.endsWith(".md")) continue;
      const slug = name.replace(/\.md$/, "");
      const body = readyBody(path.join(SAMPLES_DIR, name));
      const model = sampleModel(path.join(SAMPLES_DIR, name));
      if (body !== null) list.push({ key: `sample:${slug}`, body, postFile: null, mp3File: path.join(SAMPLES_OUT, `${slug}.mp3`), model });
    }
  }
  return list;
}

async function main() {
  const manifest = readManifest();
  const keep = new Set();
  const made = [];
  let creditsUsed = 0;
  const hasKeys = Boolean(API_KEY && VOICE_ID);
  if (!hasKeys) log("ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID is not set; nothing will be narrated.");
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  for (const job of jobs()) {
    const { key, body, postFile, mp3File } = job;
    const model = job.model || MODEL_ID;
    if (body.length > MAX_SCRIPT_CHARS) {
      log(`${key}: script is ${body.length} characters, over the ${MAX_SCRIPT_CHARS} safety limit; skipped.`);
      continue;
    }

    const parts = chunk(body);
    for (const part of parts) keep.add(path.basename(cacheFile(part, model)));

    // The version covers the text and the dictionary entries it uses.
    const version = sha(`${model === MODEL_ID ? "" : model}${body}\n--\n${rulesIn(body)}`);
    const hasMp3 = fs.existsSync(mp3File);
    // ACCEPT_CURRENT=1 marks every existing MP3 as current (used when a dictionary change
    // should apply to future recordings only).
    if (hasMp3 && (process.env.ACCEPT_CURRENT === "1" || !manifest[key] || manifest[key] === sha(body))) {
      // Narrated before this version scheme (or before the manifest): treat the MP3 as current.
      manifest[key] = version;
      continue;
    }
    if (hasMp3 && manifest[key] === version) continue;
    if (!hasKeys) continue;

    const fresh = !hasMp3; // a deleted MP3 means a full new take
    log(`${key}: ${body.length} characters in ${parts.length} pieces with ${model}${fresh ? " (full new take)" : " (only changed pieces)"}`);
    const audio = [];
    let reused = 0;
    for (let i = 0; i < parts.length; i++) {
      const file = cacheFile(parts[i], model);
      if (!fresh && fs.existsSync(file)) {
        audio.push(fs.readFileSync(file));
        reused++;
        continue;
      }
      const clip = await speak(parts[i], parts[i - 1], parts[i + 1], model);
      fs.writeFileSync(file, clip);
      audio.push(clip);
      creditsUsed += parts[i].length;
      log(`${key}: piece ${i + 1}/${parts.length} narrated`);
    }
    if (reused) log(`${key}: reused ${reused} of ${parts.length} pieces`);
    fs.mkdirSync(path.dirname(mp3File), { recursive: true });
    fs.writeFileSync(mp3File, Buffer.concat(audio));
    if (postFile) addAudioLine(postFile, key);
    manifest[key] = version;
    made.push(key);
  }

  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
  fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

  // Keep only the cached pieces that current scripts still use.
  for (const file of fs.readdirSync(CACHE_DIR)) {
    if (!keep.has(file)) fs.rmSync(path.join(CACHE_DIR, file));
  }

  log(
    made.length
      ? `Narrated: ${made.join(", ")}. About ${creditsUsed.toLocaleString("en-US")} characters sent to ElevenLabs.`
      : "Nothing new to narrate.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
