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

## Editing a piece

Posts can be edited in the browser. **Edit** is next to the date on each piece, on the writing list, and in the footer. The first time, it asks for `EDIT_PASSWORD`.

On this machine, Save writes `content/posts`. A production server (`next start`) will not show the change until you rebuild. `npm run dev` rereads the file.

On Vercel, Save commits the file through GitHub. Set `GITHUB_TOKEN` and `GITHUB_REPO` (`owner/name`). Without them the live site refuses to save and says so. **On the site** makes a piece public. Leave **Email subscribers** off while you tinker. A draft stays off the site for everyone who is not signed in.

Above the body, the buttons add a section, a quote, Hebrew, a wrestling question, sources, a link, or an image. Pasting an image into a box adds it too. The file still stores the marks the site needs.

## Email when a post is ready

The footer has a signup. It does nothing until both of these are set:

- `RESEND_API_KEY`
- `RESEND_SEGMENT_ID`

Create a segment in Resend (the old “audience” lists are gone) and paste its id. Signups are added as contacts on that segment. Without the keys, the form returns a clear error.

Putting a piece on the site does not email anyone. A push to `main` sends one email only when `subscribers: yes` is newly set on a published post. Later edits do not send again. Uncheck it, push, then check it again, and another note goes out. Titles that start with `Sample:` are skipped. The GitHub Action needs `RESEND_API_KEY`, `RESEND_SEGMENT_ID`, `CONTACT_FROM_EMAIL`, and `SITE_URL` as repository secrets. If those secrets are missing, the action logs that and does not fail the push.

## Books

`/books` is the shelf. It is empty until a file exists. When a pamphlet is ready, add `content/books/<slug>.mdx`:

```md
---
title: "The pamphlet title"
subtitle: "One line"
summary: "The sentence on the shelf."
status: forthcoming
read: https://example.com/read
ebook: https://example.com/book.epub
print: https://example.com/order
---

What the book is, before anyone downloads it or orders a copy.
```

`status` is `forthcoming` or `available`. `read`, `ebook`, and `print` are optional links. Leave a field out until that way of getting the book exists.

## Locally

```bash
npm install
npm run dev
```

The sample post is `Sample: How a Post Is Built`. `Draft: This Must Not Appear` must stay off every page, including as the next part of the sample series.
