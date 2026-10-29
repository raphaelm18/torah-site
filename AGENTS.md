<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## This site

Posts are one MDX file each in `content/posts`. `status: draft` is never rendered. Audio scripts in `content/audio-scripts` are never rendered. Colors, type, and the post anatomy live in `app/globals.css` and `components/PostView.tsx`. The contact form stays unsent until `RESEND_API_KEY` and `CONTACT_TO_EMAIL` are set.

## Narration

`.github/workflows/generate-audio.yml` runs `scripts/generate-audio.mjs` on pushes that touch `content/audio-scripts/` or `public/audio/`. A script at `content/audio-scripts/<slug>.md` that starts with `---\nstatus: ready\n---` is sent to ElevenLabs in pieces, saved as `public/audio/<slug>.mp3`, and the post gets `audio: /audio/<slug>.mp3`. Scripts without `status: ready` are never narrated. Each episode is one MP3, built from pieces cached between runs (`.audio-cache`, via actions/cache). Editing a ready script and pushing re-narrates only the pieces whose text changed; `content/audio-scripts/narrated.json` records which script version each MP3 matches. Deleting an MP3 and pushing makes a full new take. It needs the GitHub secrets `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID`; the repository variable `ELEVENLABS_MODEL_ID` is optional (default `eleven_multilingual_v2`). Without the secrets it does nothing. Audio scripts are English-first: Hebrew only from the proven list.
