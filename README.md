# Raphael ben Avraham

A home for the Torah writing, the recordings, and a link out to [Daily Torah](https://daily-torah.vercel.app/). Posts are plain files. Pushing `status: published` is what puts a piece on the site.

## Add a post

Create `content/posts/<slug>.mdx`:

```md
---
title: "A Family With a Job"
subtitle: "Why closeness to God has to point outward"
slug: a-family-with-a-job
date: 2026-10-26
track: wrestling
series: Chosenness
part: 2
tldr: "Two or three sentences."
audio: /audio/a-family-with-a-job.mp3
ideaMap: /maps/a-family-with-a-job.svg
status: draft
---
```

`track` is `wrestling` or `connecting`. `series`, `part`, `audio`, and `ideaMap` are optional. The slug must match the filename.

`status: draft` never appears on the site. Set `published` and push to put it up. Set it back to `draft` and push to take it down.

In the body, a bold line on its own is a section break. These components are available:

- `<PullQuote>…</PullQuote>`
- `<He>עִבְרִית</He>` for Hebrew, set right to left
- `<Wrestling>` … `</Wrestling>` for the open questions. Leave a blank line inside so the list renders.
- `<YourTurn>…</YourTurn>` for the reader prompt. The page adds “Send me your thoughts,” with the title filled in on the contact form.
- `<Sources>` with a markdown table and a blank line inside: Source, Link, Certainty.

Audio scripts live in `content/audio-scripts/<slug>.md` and are never shown. Put the recording in `public/audio/<slug>.mp3` and the map in `public/maps/<slug>.svg`.

`lib/site.ts` holds the Spotify show URL. Leave it empty until the show exists.

## Contact form

The form does not send until both of these are set (locally in `.env.local`, or in the Vercel project):

- `RESEND_API_KEY`
- `CONTACT_TO_EMAIL`

Without them, submitting returns a clear error. A hidden field and a three-second delay drop the obvious spam. See `.env.example`.

## Locally

```bash
npm install
npm run dev
```

The sample post is `Sample: How a Post Is Built`. `Draft: This Must Not Appear` must stay off every page, including as the next part of the sample series.
