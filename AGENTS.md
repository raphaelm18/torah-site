<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## This site

Posts are one MDX file each in `content/posts`. `status: draft` is never rendered. Audio scripts in `content/audio-scripts` are never rendered. Colors, type, and the post anatomy live in `app/globals.css` and `components/PostView.tsx`. The contact form stays unsent until `RESEND_API_KEY` and `CONTACT_TO_EMAIL` are set.
