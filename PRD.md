# Torah Site PRD

Oct 26, 2026

A simple, editable home on Vercel for Raphael ben Avraham's Torah writing, audio, and apps. Posts are plain files that can be drafted in chat and pushed live.

## Goals

Version 1 succeeds when the site is live on a Vercel URL with the first four posts, and a post can be edited and redeployed in under five minutes without opening Cursor.

- Publish the writing. Posts readable on phone and desktop, grouped into two tracks.
- Edit anytime. Every post is one plain Markdown file in GitHub; editing the file updates the site.
- Listen. Each post can carry an audio version in Raphael's cloned voice.
- Promote the Torah app. Link out to its existing Vercel deployment.
- Invite engagement. Readers are nudged to reflect and can send a message.

Non-goals for version 1: logins, comments, a custom domain, a newsletter, a CMS.

## Pages at launch

Six pages plus a post template. The site name in the header is Raphael ben Avraham.

| Page | Route | What it holds |
| --- | --- | --- |
| Home | `/` | One-paragraph intro, the latest 3 posts, the two tracks, a card for the Torah app |
| Writing | `/writing` | All published posts, newest first; filter by track; series grouped with part numbers |
| Post | `/writing/[slug]` | The full post |
| Listen | `/listen` | Every post that has audio, with a player and a link to the podcast on Spotify |
| Apps | `/apps` | A card per app. The Torah app links to https://daily-torah.vercel.app/ |
| About | `/about` | Short bio, why this exists, written for his sons and grandchildren |
| Contact | `/contact` | A short form that emails Raphael |

The two tracks:

- Wrestling. Ideas he's working through, like the chosenness series.
- Connecting. How to connect to mitzvot at a felt level, beyond the intellect.

## Post page anatomy

Top to bottom, every post page renders these parts from its Markdown file:

1. Title, subtitle, date, track, and series badge ("Chosenness · Part 2").
2. TL;DR box: two or three sentences, slightly playful.
3. Audio player, if the post has audio.
4. Idea map image, if the post has one.
5. The post body: bold questions as section breaks, prose answers, one styled pull quote, Hebrew in Hebrew letters set right-to-left.
6. What I'm still wrestling with box: the open questions, visually distinct.
7. Your turn box: one reflection prompt for the reader, plus "Send me your thoughts," linking to Contact with the post title prefilled.
8. Sources table: reference, Sefaria link, certainty.
9. Signature: Raphael ben Avraham.
10. Previous and next links within the series.

## Content model

Each post is one file at `content/posts/<slug>.mdx`. Metadata sits at the top. The body is Markdown, with a few components for the special boxes.

```md
---
title: "A Family With a Job"
subtitle: "Why closeness to God has to point outward"
slug: a-family-with-a-job
date: 2026-10-26
track: wrestling
series: Chosenness
part: 2
tldr: "Two to three sentences."
audio: /audio/a-family-with-a-job.mp3
ideaMap: /maps/a-family-with-a-job.svg
status: published
---
```

`status: draft` posts never appear on the live site, so a post can be pushed before it's ready.

Audio scripts for voice cloning live in `content/audio-scripts/<slug>.md` and are never shown. Idea maps are SVG files in `public/maps/`.

## Publishing

Every change lands as a commit, and Vercel redeploys.

Three ways in: ask in chat (the file is edited and pushed), edit the file on GitHub.com, or use Cursor for anything that touches the site's code or design.

To publish: set `status: published` and push. To pull a post down: set `status: draft` and push.

## Design

A well-made printed booklet: light, warm, and quiet. Placeholder until a real direction replaces it. Light mode only.

| Element | Choice |
| --- | --- |
| Background | Warm paper `#FBF8F3` |
| Text | Ink `#1E1A16`; secondary `#6B635A` |
| Accent | Terracotta `#A2462A`, for links and the pull-quote rule |
| Body | Newsreader, 19px, line height 1.6, max width 680px |
| Hebrew | Frank Ruhl Libre, right to left, about 10% larger than body |
| Labels | IBM Plex Sans, small caps |
| Boxes | Hairline borders, no shadows, generous padding |
| Pull quote | Large italic serif with a thin accent rule on the left |

Avoid gradients, glassy effects, purple or blue startup palettes, card grids with drop shadows, a centered hero with two buttons, emoji, and stock or AI-generated images. Mobile first.

## Tech

| Piece | Choice |
| --- | --- |
| Framework | Next.js (App Router), TypeScript |
| Content | MDX in `content/posts`, read at build time |
| Styling | Tailwind CSS |
| Hosting | Vercel, connected to the GitHub repo |
| Audio | `public/audio/` to start |
| Contact | Resend, from a Next.js route handler |
| Feed | `/rss.xml` |

## Audio pipeline

Audio is produced outside the site. The site only plays it.

1. Once: record about 30 minutes of clean reading and make an ElevenLabs Professional Voice Clone.
2. Per post: paste the audio script into ElevenLabs and download the MP3.
3. Per post: put the MP3 in `public/audio/<slug>.mp3` and set the `audio` field.
4. Per post: upload the same MP3 to Spotify for Creators. One show. Prefix titles with the track.

Plan details and prices need checking before paying.

## Contact and spam

Fields: name, email, message. Arriving from a post prefills the message with the title.

- Honeypot: a hidden input. Submissions that fill it are dropped silently.
- Time check: submissions sent less than 3 seconds after the page loads are dropped.
- Later, if needed: Cloudflare Turnstile or Vercel BotID.

Messages go to Raphael through Resend, with the reader's email as reply-to. Environment variables: `RESEND_API_KEY`, `CONTACT_TO_EMAIL`.

## Later, not now

- A domain pointed at Vercel.
- A real design, once there's a direction.
- Comments or reader responses, which is the first real reason to add login.
- Two podcasts, if both tracks produce enough episodes.
- A newsletter.
- Compiling a series into a downloadable or printed sefer.
