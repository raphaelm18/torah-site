import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  outputFileTracingIncludes: {
    "/": ["./content/posts/**/*"],
    "/writing": ["./content/posts/**/*"],
    "/writing/[slug]": ["./content/posts/**/*"],
    "/listen": ["./content/posts/**/*"],
    "/rss.xml": ["./content/posts/**/*"],
    "/books": ["./content/books/**/*"],
    "/writing/new": ["./content/posts/**/*"],
    "/writing/[slug]/edit": ["./content/posts/**/*"],
  },
};

export default nextConfig;
