export const siteName = "Raphael ben Avraham";

export const siteDescription =
  "Torah writing and recordings by Raphael ben Avraham. Two tracks: Wrestling and Connecting.";

export const tracks = {
  wrestling: {
    label: "Wrestling",
    description:
      "Ideas still in motion. The chosenness series lives here.",
  },
  connecting: {
    label: "Connecting",
    description:
      "How to meet a mitzvah at a felt level, past the intellect.",
  },
} as const;

export type Track = keyof typeof tracks;

export const torahApp = {
  title: "Daily Torah",
  url: "https://daily-torah.vercel.app/",
  host: "daily-torah.vercel.app",
  description: "Read the Mishneh Torah one paragraph at a time.",
};

/**
 * Full URL of the Spotify show. Leave empty until the show exists.
 * The Listen page renders a link only when this is set.
 */
export const spotifyShowUrl = "";

export function getSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (process.env.VERCEL_ENV === "production" && production) {
    return `https://${production}`;
  }

  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}
